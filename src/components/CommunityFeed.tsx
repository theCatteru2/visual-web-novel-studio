import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  where,
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNovel } from '../context/NovelContext';

export default function CommunityFeed({ onPlayNovel }: { onPlayNovel: () => void }) {
  const { user, profile } = useAuth();
  const { setProject, startPlaytest } = useNovel();

  const [activeTab, setActiveTab] = useState<'explore' | 'following' | 'my_profile'>('explore');
  const [novels, setNovels] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Perfil que se está visualizando
  const [viewedProfile, setViewedProfile] = useState<any | null>(null);
  const [isFollowingCurrent, setIsFollowingCurrent] = useState(false);

  // Estados de edición del perfil propio
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const fetchNovelsAndFollows = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'novels'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNovels(list);

      if (user) {
        const followQ = query(collection(db, 'follows'), where('followerId', '==', user.uid));
        const followSnap = await getDocs(followQ);
        const ids = followSnap.docs.map(d => d.data().targetId);
        setFollowingIds(ids);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNovelsAndFollows();
  }, [user]);

  const openUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setViewedProfile(data);
        setEditDisplayName(data.displayName || '');
        setEditBio(data.bio || '');

        if (user) {
          setIsFollowingCurrent(followingIds.includes(userId));
        }
      }
    } catch (err) {
      console.error('Error al abrir perfil:', err);
    }
  };

  const handleToggleFollow = async (targetId: string) => {
    if (!user) return alert('Debes iniciar sesión para seguir creadores.');
    const followDocId = `${user.uid}_${targetId}`;
    const followRef = doc(db, 'follows', followDocId);

    try {
      if (isFollowingCurrent) {
        await deleteDoc(followRef);
        setFollowingIds(prev => prev.filter(id => id !== targetId));
        setIsFollowingCurrent(false);
      } else {
        await setDoc(followRef, { followerId: user.uid, targetId, createdAt: Date.now() });
        setFollowingIds(prev => [...prev, targetId]);
        setIsFollowingCurrent(true);
      }
    } catch (err) {
      console.error('Error al actualizar seguimiento:', err);
    }
  };

  const handleSaveMyProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: editDisplayName.trim(),
        bio: editBio.trim()
      });
      setViewedProfile((prev: any) => ({
        ...prev,
        displayName: editDisplayName.trim(),
        bio: editBio.trim()
      }));
      alert('¡Perfil actualizado con éxito!');
    } catch (err) {
      console.error(err);
      alert('Error al guardar el perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePlay = (novel: any) => {
    const parsed = JSON.parse(novel.projectData);
    setProject(parsed);
    startPlaytest();
    onPlayNovel();
  };

  const handleDownload = (novel: any) => {
    if (!novel.allowDownload) return;
    const blob = new Blob([novel.projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${novel.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayedNovels = novels.filter(n => {
    if (viewedProfile) return n.authorId === viewedProfile.uid;
    if (activeTab === 'following') return followingIds.includes(n.authorId);
    if (activeTab === 'my_profile' && user) return n.authorId === user.uid;
    return true;
  });

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 48px)', background: '#09090e', color: '#fff', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      
      {/* Barra de Pestañas Superior */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', background: '#11111a', borderBottom: '1px solid #1f1f2e', alignItems: 'center' }}>
        <button
          onClick={() => { setViewedProfile(null); setActiveTab('explore'); }}
          style={{ padding: '6px 14px', background: activeTab === 'explore' && !viewedProfile ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          🌐 Explorar
        </button>
        {user && (
          <>
            <button
              onClick={() => { setViewedProfile(null); setActiveTab('following'); }}
              style={{ padding: '6px 14px', background: activeTab === 'following' && !viewedProfile ? '#2563eb' : 'transparent', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              👥 Siguiendo ({followingIds.length})
            </button>
            <button
              onClick={() => {
                if (user) {
                  openUserProfile(user.uid);
                  setActiveTab('my_profile');
                }
              }}
              style={{ padding: '6px 14px', background: activeTab === 'my_profile' ? '#7c3aed' : 'transparent', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              👤 Mi Perfil
            </button>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* VISTA DE PERFIL DE USUARIO */}
        {viewedProfile && (
          <div style={{ background: '#12121c', border: '1px solid #28283d', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <img 
                  src={viewedProfile.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${viewedProfile.uid}`} 
                  alt="" 
                  style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid #38bdf8' }} 
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, color: '#f3f4f6' }}>{viewedProfile.displayName || 'Creador'}</h2>
                  <span style={{ fontSize: 11, color: '#a855f7' }}>ID: {viewedProfile.uid.slice(0, 8)}...</span>
                  <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#bbb' }}>{viewedProfile.bio || 'Sin descripción todavía.'}</p>
                </div>
              </div>

              {/* Botón Seguir / Editar */}
              <div>
                {user && user.uid === viewedProfile.uid ? (
                  <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 6, border: '1px solid #10b98144' }}>
                    Tu Cuenta
                  </div>
                ) : user ? (
                  <button
                    onClick={() => handleToggleFollow(viewedProfile.uid)}
                    style={{ padding: '6px 14px', background: isFollowingCurrent ? '#374151' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {isFollowingCurrent ? 'Siguiendo ✓' : '+ Seguir'}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Formulario de edición rápida si es el dueño */}
            {user && user.uid === viewedProfile.uid && (
              <div style={{ borderTop: '1px solid #222233', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <strong style={{ fontSize: 12, color: '#aaa' }}>✏️ Editar Perfil:</strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    type="text"
                    value={editDisplayName}
                    onChange={e => setEditDisplayName(e.target.value)}
                    placeholder="Tu nombre de autor"
                    style={{ flex: 1, padding: 6, background: '#0a0a10', border: '1px solid #333', color: '#fff', borderRadius: 6, fontSize: 12 }}
                  />
                  <input 
                    type="text"
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    placeholder="Biografía corta"
                    style={{ flex: 2, padding: 6, background: '#0a0a10', border: '1px solid #333', color: '#fff', borderRadius: 6, fontSize: 12 }}
                  />
                  <button 
                    onClick={handleSaveMyProfile}
                    disabled={isSavingProfile}
                    style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CATÁLOGO DE NOVELAS */}
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>
          {viewedProfile 
            ? `Novelas de ${viewedProfile.displayName} (${displayedNovels.length})` 
            : activeTab === 'following' 
            ? 'Novelas de autores que sigues' 
            : 'Novelas Publicadas'}
        </h3>

        {loading ? (
          <div style={{ color: '#777', fontSize: 13 }}>Cargando creaciones...</div>
        ) : displayedNovels.length === 0 ? (
          <div style={{ background: '#12121c', border: '1px dashed #333', padding: 24, textAlign: 'center', borderRadius: 10, color: '#777', fontSize: 13 }}>
            No hay novelas publicadas en esta sección.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {displayedNovels.map(novel => (
              <div key={novel.id} style={{ background: '#12121c', border: '1px solid #242436', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#38bdf8' }}>{novel.title}</h4>
                  <div 
                    onClick={() => openUserProfile(novel.authorId)}
                    style={{ fontSize: 12, color: '#a855f7', cursor: 'pointer', marginBottom: 8, textDecoration: 'underline' }}
                  >
                    Por: {novel.authorName}
                  </div>
                  <p style={{ fontSize: 12, color: '#bbb', margin: 0, lineHeight: 1.4 }}>{novel.description || 'Sin descripción.'}</p>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                  <button 
                    onClick={() => handlePlay(novel)}
                    style={{ flex: 1, padding: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ▶️ Jugar
                  </button>

                  {novel.allowDownload ? (
                    <button 
                      onClick={() => handleDownload(novel)}
                      style={{ padding: '8px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      title="Descargar archivo JSON"
                    >
                      ⬇️ Descargar
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: '#6b7280', padding: '0 6px' }}>
                      🔒 Solo Juego
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
