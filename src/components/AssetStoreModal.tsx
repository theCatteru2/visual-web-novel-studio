import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
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

  // Formulario para compartir recurso
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssetUrl, setNewAssetUrl] = useState('');
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

  if (!isOpen) return null;

  const filteredAssets = assets.filter(a => a.category === category);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setNewAssetUrl(event.target.result);
        if (!newTitle) setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePublishAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Inicia sesión para compartir recursos.');
    if (!newAssetUrl) return alert('Debes cargar un archivo o ingresar una URL.');

    setIsUploading(true);
    try {
      await addDoc(collection(db, 'community_assets'), {
        title: newTitle.trim() || 'Recurso sin título',
        category,
        url: newAssetUrl,
        authorName: profile?.displayName || 'Creador',
        authorId: user.uid,
        createdAt: Date.now()
      });

      alert('¡Recurso compartido en el bazar con éxito!');
      setNewTitle('');
      setNewAssetUrl('');
      setShowUploadForm(false);
      fetchAssets();
    } catch (e) {
      console.error(e);
      alert('Error al publicar recurso.');
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

        {/* Pestañas de Categoría */}
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

          <button
            onClick={() => setShowUploadForm(prev => !prev)}
            style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            {showUploadForm ? 'Ver Bazar' : '+ Compartir Recurso'}
          </button>
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
                <div style={{ fontSize: 10, color: '#10b981' }}>✓ Archivo cargado correctamente</div>
              )}

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
              Aún no hay recursos publicados en esta categoría. ¡Sé el primero en compartir!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {filteredAssets.map(asset => (
                <div key={asset.id} style={{ background: '#161622', border: '1px solid #28283a', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}