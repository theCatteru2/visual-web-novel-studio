import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNovel } from '../context/NovelContext';
import { CommunityNovel } from '../types';

interface UserProfileViewProps {
  onBackToFeed: () => void;
  onPlayNovel: () => void;
}

export default function UserProfileView({ onBackToFeed, onPlayNovel }: UserProfileViewProps) {
  const { user, profile, loginWithGoogle, logout } = useAuth();
  const { setProject, startPlaytest } = useNovel();

  const [myNovels, setMyNovels] = useState<CommunityNovel[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(profile?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);

  const fetchMyNovels = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'community_novels'),
        where('authorId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityNovel));
      setMyNovels(list);
    } catch (e) {
      console.error('Error cargando tus novelas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyNovels();
      setDisplayNameInput(profile?.displayName || user.displayName || '');
    }
  }, [user, profile]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayNameInput.trim()) return;

    setIsSavingName(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayNameInput.trim()
      });
      alert('Nombre de perfil actualizado con éxito.');
    } catch (e) {
      console.error(e);
      alert('Error al actualizar nombre.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDeleteMyNovel = async (novelId: string, novelTitle: string) => {
    if (!window.confirm(`¿Eliminar tu novela "${novelTitle}" de la comunidad?`)) return;

    try {
      await deleteDoc(doc(db, 'community_novels', novelId));
      setMyNovels(prev => prev.filter(n => n.id !== novelId));
      alert('Novela eliminada.');
    } catch (e) {
      console.error(e);
      alert('Error al borrar novela.');
    }
  };

  const handlePlayMyNovel = (novel: CommunityNovel) => {
    setProject(novel.projectData);
    startPlaytest();
    onPlayNovel();
  };

  if (!user) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#09090e', color: '#fff', padding: 20 }}>
        <span style={{ fontSize: 40, marginBottom: 12 }}>👤</span>
        <h2 style={{ margin: '0 0 8px' }}>Perfil de Usuario</h2>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>Inicia sesión con Google para ver tus novelas publicadas y configurar tu cuenta.</p>
        <button
          onClick={loginWithGoogle}
          style={{ padding: '10px 20px', background: '#ea4335', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
        >
          Iniciar sesión con Google
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#09090e', color: '#fff', overflowY: 'auto' }}>
      
      {/* Cabecera del Perfil */}
      <div style={{ padding: '16px 20px', background: '#11111a', borderBottom: '1px solid #1f1f2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onBackToFeed}
          style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
        >
          ← Volver a la Comunidad
        </button>
        <button
          onClick={logout}
          style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
        >
          Cerrar Sesión
        </button>
      </div>

      <div style={{ maxWidth: 800, width: '100%', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Tarjeta de Datos de Usuario */}
        <div style={{ background: '#141420', border: '1px solid #28283d', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <img
            src={profile?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`}
            alt="Avatar"
            style={{ width: 70, height: 70, borderRadius: '50%', border: '2px solid #a855f7' }}
          />

          <div style={{ flex: 1, minWidth: 220 }}>
            <form onSubmit={handleUpdateName} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={displayNameInput}
                onChange={e => setDisplayNameInput(e.target.value)}
                placeholder="Tu nombre de autor..."
                style={{ background: '#090910', border: '1px solid #383854', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 14, fontWeight: 700 }}
              />
              <button
                type="submit"
                disabled={isSavingName}
                style={{ padding: '6px 12px', background: '#a855f7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                {isSavingName ? 'Guardando...' : 'Cambiar'}
              </button>
            </form>

            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              UID: {user.uid}
            </div>
            <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 2 }}>
              Rol: {(profile as any)?.role || 'Creador'}
            </div>
          </div>
        </div>

        {/* Mis Novelas Publicadas */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Mis Novelas Publicadas ({myNovels.length})</h3>
            <button
              onClick={fetchMyNovels}
              style={{ padding: '4px 10px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
            >
              🔄 Recargar
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#666' }}>Cargando tus obras...</div>
          ) : myNovels.length === 0 ? (
            <div style={{ background: '#11111a', border: '1px dashed #28283d', borderRadius: 12, padding: 30, textAlign: 'center', color: '#666', fontSize: 13 }}>
              No has publicado novelas en la comunidad todavía. ¡Usa el botón 🚀 Publicar en la barra superior!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myNovels.map(novel => (
                <div
                  key={novel.id}
                  style={{ background: '#141420', border: '1px solid #28283d', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {novel.coverUrl ? (
                      <img src={novel.coverUrl} alt="" style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 50, height: 50, borderRadius: 8, background: '#090910', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        📖
                      </div>
                    )}
                    <div>
                      <strong style={{ fontSize: 14, color: '#fff' }}>{novel.title}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8', maxWidth: 350, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {novel.description || 'Sin descripción'}
                      </p>
                      <span style={{ fontSize: 9, color: '#64748b' }}>
                        ID: {novel.id} | {new Date(novel.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handlePlayMyNovel(novel)}
                      style={{ padding: '6px 12px', background: '#10b981', color: '#042f1f', border: 'none', borderRadius: 6, fontWeight: 800, fontSize: 11, cursor: 'pointer' }}
                    >
                      ▶ Jugar
                    </button>
                    <button
                      onClick={() => handleDeleteMyNovel(novel.id, novel.title)}
                      style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                    >
                      🗑️ Borrar
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
