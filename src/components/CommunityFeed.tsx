import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNovel } from '../context/NovelContext';
import { CommunityNovel } from '../types';

interface CommunityFeedProps {
  onPlayNovel: () => void;
}

const NOVEL_TAGS = ['Romance', 'Fantasía', 'Misterio', 'Drama', 'Comedia', 'Terror', 'Sci-Fi', 'Aventura', 'Escolar', 'Isekai'];

export default function CommunityFeed({ onPlayNovel }: CommunityFeedProps) {
  const { user, profile } = useAuth();
  const { setProject, importCommunityNovelToLibrary, startPlaytest } = useNovel();

  const [novels, setNovels] = useState<CommunityNovel[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('todos');
  const [showNsfw, setShowNsfw] = useState<boolean>(() => {
    return localStorage.getItem('vwn_show_nsfw_novels') === 'true';
  });

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'community_novels'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityNovel));
      setNovels(list);
    } catch (e) {
      console.error('Error al cargar novelas comunitarias:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNovels();
  }, []);

  const toggleNsfwSetting = () => {
    const nextVal = !showNsfw;
    setShowNsfw(nextVal);
    localStorage.setItem('vwn_show_nsfw_novels', String(nextVal));
  };

  const filteredNovels = novels.filter(n => {
    if (!showNsfw && n.isNsfw) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchDesc = n.description?.toLowerCase().includes(q);
      const matchAuthor = n.authorName?.toLowerCase().includes(q);
      const matchId = n.id?.toLowerCase().includes(q);
      const matchTag = n.tags?.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchAuthor && !matchId && !matchTag) return false;
    }

    if (selectedTag !== 'todos') {
      if (!n.tags || !n.tags.includes(selectedTag)) return false;
    }

    return true;
  });

  const handlePlayDirectly = (novel: CommunityNovel) => {
    setProject(novel.projectData);
    startPlaytest();
    onPlayNovel();
  };

  const handleImportToLibrary = (novel: CommunityNovel) => {
    importCommunityNovelToLibrary(
      novel.projectData,
      novel.authorName,
      novel.authorId,
      novel.allowCommunityEdit
    );
    alert(`¡"${novel.title}" guardada en tu biblioteca!`);
  };

  const handleDeleteNovel = async (novelId: string, novelTitle: string) => {
    if (!window.confirm(`¿Eliminar permanentemente "${novelTitle}" (ID: ${novelId}) de la comunidad?`)) return;

    try {
      await deleteDoc(doc(db, 'community_novels', novelId));
      setNovels(prev => prev.filter(n => n.id !== novelId));
      alert('Novela eliminada.');
    } catch (err) {
      console.error('Error al eliminar novela:', err);
      alert('Error al intentar eliminar la novela.');
    }
  };

  const handleReportNovel = async (novel: CommunityNovel) => {
    if (!user) return alert('Debes iniciar sesión para reportar una historia.');

    const reason = window.prompt(`Reportar novela: "${novel.title}" (ID: ${novel.id})\nIndica el motivo del reporte:`);
    if (!reason || !reason.trim()) return;

    try {
      await addDoc(collection(db, 'novel_reports'), {
        novelId: novel.id,
        novelTitle: novel.title,
        novelAuthorId: novel.authorId,
        reportedByUserId: user.uid,
        reportedByUserName: profile?.displayName || user.displayName || 'Usuario',
        reason: reason.trim(),
        createdAt: Date.now()
      });
      alert('Reporte enviado a moderación.');
    } catch (e) {
      console.error(e);
      alert('No se pudo enviar el reporte.');
    }
  };

  const copyNovelId = (id: string) => {
    navigator.clipboard.writeText(id);
    alert(`ID copiado al portapapeles: ${id}`);
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#09090e', color: '#fff', boxSizing: 'border-box' }}>
      {/* Barra de Filtros y Búsqueda */}
      <div style={{ padding: '10px 16px', background: '#11111a', borderBottom: '1px solid #1f1f2e', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>🌐</span>
            <strong style={{ fontSize: 15 }}>Explorar Historias de la Comunidad</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              onClick={fetchNovels}
              style={{ padding: '4px 10px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 Buscar por título, descripción, autor, ID o etiqueta..."
            style={{ flex: 1, background: '#161622', border: '1px solid #333', borderRadius: 6, color: '#fff', padding: '6px 12px', fontSize: 12 }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: '#333', border: 'none', borderRadius: 6, color: '#aaa', padding: '0 10px', cursor: 'pointer', fontSize: 11 }}
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
          <button
            onClick={() => setSelectedTag('todos')}
            style={{
              padding: '3px 10px',
              background: selectedTag === 'todos' ? '#38bdf8' : 'rgba(255,255,255,0.06)',
              color: selectedTag === 'todos' ? '#000' : '#888',
              border: 'none',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Todos
          </button>
          {NOVEL_TAGS.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              style={{
                padding: '3px 10px',
                background: selectedTag === t ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                color: selectedTag === t ? '#000' : '#aaa',
                border: 'none',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              #{t}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Novelas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>Cargando historias...</div>
        ) : filteredNovels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666', fontSize: 13 }}>
            No se encontraron novelas con los filtros actuales.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, maxWidth: 1200, margin: '0 auto' }}>
            {filteredNovels.map(novel => {
              const isMyNovel = user && (novel.authorId === user.uid || (profile as any)?.role === 'admin');

              return (
                <div key={novel.id} style={{ position: 'relative', background: '#13131e', border: `1px solid ${novel.isNsfw ? '#f43f5e55' : '#222233'}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  
                  {/* Acciones Superiores */}
                  <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4, zIndex: 10 }}>
                    <button
                      onClick={() => handleReportNovel(novel)}
                      style={{ background: 'rgba(15, 15, 20, 0.85)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11 }}
                      title="Reportar historia"
                    >
                      🚩
                    </button>

                    {isMyNovel && (
                      <button
                        onClick={() => handleDeleteNovel(novel.id, novel.title)}
                        style={{ background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11 }}
                        title="Eliminar mi historia"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {novel.isNsfw && (
                    <span style={{ position: 'absolute', top: 6, left: 6, background: '#f43f5e', color: '#fff', fontSize: 8, fontWeight: 900, padding: '2px 6px', borderRadius: 4, zIndex: 10 }}>
                      +18
                    </span>
                  )}

                  {novel.coverUrl ? (
                    <img src={novel.coverUrl} alt={novel.title} style={{ width: '100%', height: 125, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ height: 125, background: '#090910', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                      📖
                    </div>
                  )}

                  <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {novel.title}
                      </div>
                      <div style={{ fontSize: 9, color: '#38bdf8' }}>por {novel.authorName}</div>
                      
                      <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {novel.description || 'Sin descripción disponible.'}
                      </p>

                      <div 
                        onClick={() => copyNovelId(novel.id)}
                        style={{ fontSize: 8, color: '#64748b', cursor: 'pointer' }}
                        title="Copiar ID de la novela"
                      >
                        ID: {novel.id.slice(0, 8)}... 📋
                      </div>

                      {novel.tags && novel.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
                          {novel.tags.slice(0, 3).map((t, idx) => (
                            <span key={idx} style={{ fontSize: 8, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '1px 5px', borderRadius: 3 }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button
                        onClick={() => handlePlayDirectly(novel)}
                        style={{ flex: 1, padding: '6px', background: '#10b981', color: '#052e16', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                      >
                        ▶ Jugar
                      </button>
                      <button
                        onClick={() => handleImportToLibrary(novel)}
                        style={{ flex: 1, padding: '6px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        📥 Guardar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
