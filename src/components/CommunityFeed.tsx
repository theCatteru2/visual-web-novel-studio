import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNovel } from '../context/NovelContext';

export default function CommunityFeed({ onPlayNovel }: { onPlayNovel: () => void }) {
  const { user } = useAuth();
  const { setProject, startPlaytest } = useNovel();
  const [novels, setNovels] = useState<any[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [authorProfile, setAuthorProfile] = useState<any | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchNovels = async () => {
      try {
        const q = query(collection(db, 'novels'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setNovels(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error al cargar novelas', err);
      }
    };
    fetchNovels();
  }, []);

  const openAuthorProfile = async (authorId: string) => {
    setSelectedAuthorId(authorId);
    const userDoc = await getDoc(doc(db, 'users', authorId));
    if (userDoc.exists()) {
      setAuthorProfile(userDoc.data());
    }

    if (user) {
      const followDoc = await getDoc(doc(db, 'follows', `${user.uid}_${authorId}`));
      setIsFollowing(followDoc.exists());
    }
  };

  const toggleFollow = async () => {
    if (!user || !selectedAuthorId) return;
    const followId = `${user.uid}_${selectedAuthorId}`;
    const followRef = doc(db, 'follows', followId);

    if (isFollowing) {
      await deleteDoc(followRef);
      setIsFollowing(false);
    } else {
      await setDoc(followRef, { followerId: user.uid, targetId: selectedAuthorId, createdAt: Date.now() });
      setIsFollowing(true);
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

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 52px)', background: '#09090e', color: '#fff', padding: 16, overflowY: 'auto', boxSizing: 'border-box' }}>
      {selectedAuthorId && authorProfile ? (
        <div>
          <button onClick={() => setSelectedAuthorId(null)} style={{ background: '#1c1c24', color: '#38bdf8', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', marginBottom: 12 }}>
            ⬅ Volver al Catálogo
          </button>
          
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#13131c', padding: 16, borderRadius: 12, border: '1px solid #222', marginBottom: 16 }}>
            <img src={authorProfile.avatarUrl} alt="" style={{ width: 64, height: 64, borderRadius: '50%' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>{authorProfile.displayName}</h2>
              <p style={{ margin: '4px 0', fontSize: 12, color: '#aaa' }}>{authorProfile.bio || 'Creador de novelas'}</p>
              {user && user.uid !== selectedAuthorId && (
                <button 
                  onClick={toggleFollow}
                  style={{ background: isFollowing ? '#374151' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', marginTop: 4 }}
                >
                  {isFollowing ? 'Siguiendo ✓' : '+ Seguir Creador'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <h2 style={{ fontSize: 18, marginBottom: 14 }}>🌟 Creaciones de la Comunidad</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {novels
          .filter(n => !selectedAuthorId || n.authorId === selectedAuthorId)
          .map(novel => (
            <div key={novel.id} style={{ background: '#14141c', border: '1px solid #282838', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#38bdf8' }}>{novel.title}</h3>
                <div 
                  onClick={() => openAuthorProfile(novel.authorId)}
                  style={{ fontSize: 12, color: '#a855f7', cursor: 'pointer', marginBottom: 8, textDecoration: 'underline' }}
                >
                  Por: {novel.authorName}
                </div>
                <p style={{ fontSize: 12, color: '#bbb', margin: 0, lineHeight: 1.4 }}>{novel.description}</p>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                <button 
                  onClick={() => handlePlay(novel)}
                  style={{ flex: 1, padding: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ▶️ Jugar
                </button>

                {novel.allowDownload ? (
                  <button 
                    onClick={() => handleDownload(novel)}
                    style={{ padding: '8px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}
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
    </div>
  );
}
