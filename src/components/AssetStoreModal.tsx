import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNovel } from '../context/NovelContext';
import { CommunityAsset, ProjectAudioItem } from '../types';

interface AssetStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'background' | 'character' | 'bgm' | 'sfx';
}

export default function AssetStoreModal({ isOpen, onClose, defaultCategory = 'background' }: AssetStoreModalProps) {
  const { user, profile, loginWithGoogle } = useAuth();
  const { setProject } = useNovel();

  const [category, setCategory] = useState<'background' | 'character' | 'bgm' | 'sfx'>(defaultCategory);
  const [assets, setAssets] = useState<CommunityAsset[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtro de usuario: Desactivado por defecto
  const [showNsfw, setShowNsfw] = useState<boolean>(() => {
    return localStorage.getItem('vwn_show_nsfw') === 'true';
  });

  // Formulario para compartir recurso
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const [isNsfwUpload, setIsNsfwUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'community_assets'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityAsset));
      setAssets(list);
    } catch (e) {
      console.error('Error al cargar assets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchAssets();
  }, [isOpen]);

  const toggleNsfwSetting = () => {
    const nextVal = !showNsfw;
    setShowNsfw(nextVal);
    localStorage.setItem('vwn_show_nsfw', String(nextVal));
  };

  if (!isOpen) return null;

  // Filtrar por categoría y según si el usuario activó ver NSFW
  const filteredAssets = assets.filter(a => {
    if (a.category !== category) return false;
    if (!showNsfw && a.isNsfw) return false; // Ocultar si no está activado
    return true;
  });

  const handleImportToProject = (asset: CommunityAsset) => {
    if (asset.category === 'background') {
      const newBg = { id: `bg_${Date.now()}`, name: asset.title, url: asset.url };
      setProject(prev => ({ ...prev, backgroundGallery: [...(prev.backgroundGallery || []), newBg] }));
      alert(`¡Fondo "${asset.title}" añadido a tu galería!`);
    } else if (asset.category === 'bgm' || asset.category === 'sfx') {
      const newAudio: ProjectAudioItem = { id: `aud_${Date.now()}`, name: asset.title, url: asset.url, type: asset.category };
      setProject(prev => ({ ...prev, audioGallery: [...(prev.audioGallery || []), newAudio] }));
      alert(`¡Audio "${asset.title}" añadido a tu galería!`);
    }
  };

  const handleDeleteAsset = async (assetId: string, assetTitle: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente "${assetTitle}" del bazar?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'community_assets', assetId));
      setAssets(prev => prev.filter(a => a.id !== assetId));
      alert('Recurso eliminado correctamente.');
    } catch (err) {
      console.error('Error al eliminar asset:', err);
      alert('Hubo un error al intentar eliminar el recurso.');
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1280;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No se pudo procesar la imagen');

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.72));
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (category === 'background' || category === 'character') {
      try {
        const compressedBase64 = await compressImage(file);
        setNewAssetUrl(compressedBase64);
        if (!newTitle) setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
      } catch (err) {
        console.error(err);
        alert('Error al procesar la imagen.');
      }
    } else {
      if (file.size > 850 * 1024) {
        alert('El archivo de audio es demasiado grande. El límite para la base de datos comunitaria es de 850 KB.');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setNewAssetUrl(event.target.result);
          if (!newTitle) setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handlePublishAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Inicia sesión para compartir recursos.');
    if (!newAssetUrl) return alert('Debes cargar un archivo primero.');

    setIsUploading(true);
    try {
      await addDoc(collection(db, 'community_assets'), {
        title: newTitle.trim() || 'Recurso sin título',
        category,
        url: newAssetUrl,
        isNsfw: isNsfwUpload,
        authorName: profile?.displayName || user.displayName || 'Creador',
        authorId: user.uid,
        createdAt: Date.now()
      });

      alert('¡Recurso compartido en el bazar con éxito!');
      setNewTitle('');
      setNewAssetUrl('');
      setIsNsfwUpload(false);
      setShowUploadForm(false);
      fetchAssets();
    } catch (e: any) {
      console.error(e);
      alert(`Error al publicar: ${e.message || 'Verifica el tamaño del archivo.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#11111a',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 640,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
          overflow: 'hidden',
          color: '#fff'
        }}
      >
        {/* Cabecera */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #222233',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#090910'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🛒</span>
            <strong style={{ fontSize: 14 }}>Bazar Comunitario de Assets</strong>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Pestañas de Categoría y Controles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#161624', borderBottom: '1px solid #222233', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['background', 'character', 'bgm', 'sfx'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setShowUploadForm(false); }}
                style={{
                  padding: '4px 10px',
                  background: category === cat ? '#7c3aed' : 'transparent',
                  color: category === cat ? '#fff' : '#aaa',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {cat === 'background' && '🖼️ Fondos'}
                {cat === 'character' && '🎭 Sprites'}
                {cat === 'bgm' && '🎼 Música'}
                {cat === 'sfx' && '🔔 SFX'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Toggle NSFW */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', color: showNsfw ? '#f43f5e' : '#aaa' }}>
              <input
                type="checkbox"
                checked={showNsfw}
                onChange={toggleNsfwSetting}
                style={{ accentColor: '#f43f5e', cursor: 'pointer' }}
              />
              🔞 Ver +18
            </label>

            <button
              onClick={() => setShowUploadForm(prev => !prev)}
              style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              {showUploadForm ? 'Ver Bazar' : '+ Compartir'}
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ padding: 14, overflowY: 'auto', flex: 1 }}>
          {showUploadForm ? (
            <form onSubmit={handlePublishAsset} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400, margin: '0 auto' }}>
              <strong style={{ fontSize: 13, color: '#38bdf8' }}>Subir recurso a: {category.toUpperCase()}</strong>
              
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Nombre del recurso..."
                style={{ padding: 8, background: '#0a0a10', border: '1px solid #333', color: '#fff', borderRadius: 6, fontSize: 12 }}
                required
              />

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ flex: 1, padding: 8, background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  📁 Seleccionar Archivo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept={category === 'background' || category === 'character' ? 'image/*' : 'audio/*'}
                  style={{ display: 'none' }}
                />
              </div>

              {newAssetUrl && (
                <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>✓</span> Archivo procesado y listo para publicar
                </div>
              )}

              {/* Checkbox Marcar NSFW al publicar */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fda4af', cursor: 'pointer', background: 'rgba(244,63,94,0.1)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(244,63,94,0.3)' }}>
                <input
                  type="checkbox"
                  checked={isNsfwUpload}
                  onChange={e => setIsNsfwUpload(e.target.checked)}
                  style={{ accentColor: '#f43f5e' }}
                />
                Marcar como Contenido Sensible (+18 / NSFW)
              </label>

              {!user ? (
                <button type="button" onClick={loginWithGoogle} style={{ padding: 8, background: '#ea4335', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                  Inicia sesión para subir
                </button>
              ) : (
                <button type="submit" disabled={isUploading} style={{ padding: 8, background: '#10b981', color: '#042f1f', border: 'none', borderRadius: 6, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                  {isUploading ? 'Subiendo...' : 'Publicar en el Bazar'}
                </button>
              )}
            </form>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>Cargando catálogo...</div>
          ) : filteredAssets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#666', fontSize: 12 }}>
              Aún no hay recursos visibles en esta categoría.{!showNsfw && ' (El filtro +18 está desactivado)'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {filteredAssets.map(asset => {
                const isMyAsset = user && (asset.authorId === user.uid || profile?.role === 'admin');

                return (
                  <div key={asset.id} style={{ position: 'relative', background: '#161622', border: `1px solid ${asset.isNsfw ? '#f43f5e55' : '#28283a'}`, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Badge NSFW */}
                    {asset.isNsfw && (
                      <span style={{ position: 'absolute', top: 4, left: 4, background: '#f43f5e', color: '#fff', fontSize: 8, fontWeight: 900, padding: '2px 4px', borderRadius: 3, zIndex: 10 }}>
                        +18
                      </span>
                    )}

                    {/* Botón de borrado para el autor */}
                    {isMyAsset && (
                      <button
                        onClick={() => handleDeleteAsset(asset.id, asset.title)}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          width: 22,
                          height: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 10,
                          fontSize: 10
                        }}
                        title="Eliminar mi recurso"
                      >
                        🗑️
                      </button>
                    )}

                    {asset.category === 'background' || asset.category === 'character' ? (
                      <img src={asset.url} alt={asset.title} style={{ width: '100%', height: 75, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a10', fontSize: 22 }}>
                        {asset.category === 'bgm' ? '🎼' : '🔔'}
                      </div>
                    )}

                    <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4, flex: 1, justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.title}</div>
                        <div style={{ fontSize: 8, color: '#a855f7' }}>por {asset.authorName}</div>
                      </div>

                      <button
                        onClick={() => handleImportToProject(asset)}
                        style={{ padding: '4px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}
                      >
                        + Importar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
