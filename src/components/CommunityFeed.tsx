import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, addDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNovel } from '../context/NovelContext';
import { CommunityNovel } from '../types';

interface CommentItem {
  id: string;
  novelId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: number;
}

interface AuthorProfileModalData {
  authorId: string;
  authorName: string;
}

interface CommunityFeedProps {
  onPlayNovel: () => void;
  onOpenProfile?: () => void;
}

const NOVEL_TAGS = ['Romance', 'Fantasía', 'Misterio', 'Drama', 'Comedia', 'Terror', 'Sci-Fi', 'Aventura', 'Escolar', 'Isekai'];

export default function CommunityFeed({ onPlayNovel, onOpenProfile }: CommunityFeedProps) {
  const { user, profile } = useAuth();
  const { setProject, importCommunityNovelToLibrary, startPlaytest } = useNovel();

  const [novels, setNovels] = useState<CommunityNovel[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('todos');
  const [showNsfw, setShowNsfw] = useState<boolean>(() => {
    return localStorage.getItem('vwn_show_nsfw_novels') === 'true';
  });

  // Modal de Comentarios
  const [activeCommentNovel, setActiveCommentNovel] = useState<CommunityNovel | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Modal de Perfil de Autor
  const [viewingAuthor, setViewingAuthor] = useState<AuthorProfileModalData | null>(null);

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

  // Cargar comentarios de una novela
  const openCommentsModal = async (novel: CommunityNovel) => {
    setActiveCommentNovel(novel);
    setLoadingComments(true);
    try {
      const q = query(
        collection(db, 'novel_comments'),
        where('novelId', '==', novel.id)
      );
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as CommentItem))
        .sort((a, b) => b.createdAt - a.createdAt);
      setComments(list);
    } catch (e) {
      console.error('Error al cargar comentarios:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeCommentNovel) return alert('Inicia sesión para comentar.');
    if (!newCommentText.trim()) return;

    try {
      const newCommentData = {
        novelId: activeCommentNovel.id,
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Lector',
        userAvatar: profile?.avatarUrl || '',
        text: newCommentText.trim(),
        createdAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'novel_comments'), newCommentData);
      setComments(prev => [{ id: docRef.id, ...newCommentData }, ...prev]);
      setNewCommentText('');
    } catch (e) {
      console.error('Error enviando comentario:', e);
      alert('No se pudo enviar el comentario.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('¿Eliminar este comentario?')) return;
    try {
      await deleteDoc(doc(db, 'novel_comments', commentId));
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) {
      console.error(e);
      alert('Error al borrar comentario.');
    }
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

  const { launchPlayer, importCommunityNovelToLibrary } = useNovel();
  const { user } = useAuth();

const handlePlayDirectly = (novel: CommunityNovel) => {
  const canEdit = Boolean(novel.allowCommunityEdit || (user && user.uid === novel.authorId));
  launchPlayer(novel.projectData, {
    isEditorPlaytest: false,
    canEdit,
    novelId: novel.id,
    fromStart: true
  });
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
      
      {/* Barra de Filtros, Búsqueda y Navegación Rápida */}
      <div style={{ padding: '12px 18px', background: '#11111a', borderBottom: '1px solid #1f1f2e', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🌐</span>
            <strong style={{ fontSize: 16, letterSpacing: -0.3 }}>Explorar Comunidad</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid #a855f7',
                  color: '#d8b4fe',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                👤 Mi Perfil
              </button>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', color: showNsfw ? '#f43f5e' : '#94a3b8' }}>
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
              style={{ padding: '6px 12px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 Buscar por título, descripción, autor, ID o etiqueta..."
            style={{ flex: 1, background: '#161622', border: '1px solid #2d2d3f', borderRadius: 8, color: '#fff', padding: '8px 14px', fontSize: 13, outline: 'none' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: '#222233', border: 'none', borderRadius: 8, color: '#aaa', padding: '0 12px', cursor: 'pointer', fontSize: 12 }}
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          <button
            onClick={() => setSelectedTag('todos')}
            style={{
              padding: '4px 12px',
              background: selectedTag === 'todos' ? '#38bdf8' : 'rgba(255,255,255,0.06)',
              color: selectedTag === 'todos' ? '#000' : '#888',
              border: 'none',
              borderRadius: 14,
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
                padding: '4px 12px',
                background: selectedTag === t ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                color: selectedTag === t ? '#000' : '#aaa',
                border: 'none',
                borderRadius: 14,
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
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#666' }}>Cargando catálogo comunitario...</div>
        ) : filteredNovels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#666', fontSize: 14 }}>
            No se encontraron novelas con los filtros seleccionados.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, maxWidth: 1300, margin: '0 auto' }}>
            {filteredNovels.map(novel => {
              const isMyNovel = user && (novel.authorId === user.uid || (profile as any)?.role === 'admin');

              return (
                <div
                  key={novel.id}
                  style={{
                    position: 'relative',
                    background: '#13131e',
                    border: `1px solid ${novel.isNsfw ? '#f43f5e55' : '#222233'}`,
                    borderRadius: 14,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  {/* Botones de acción superior */}
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 5, zIndex: 10 }}>
                    <button
                      onClick={() => handleReportNovel(novel)}
                      style={{ background: 'rgba(15, 15, 20, 0.85)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 }}
                      title="Reportar historia"
                    >
                      🚩
                    </button>

                    {isMyNovel && (
                      <button
                        onClick={() => handleDeleteNovel(novel.id, novel.title)}
                        style={{ background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 }}
                        title="Eliminar mi historia"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {novel.isNsfw && (
                    <span style={{ position: 'absolute', top: 8, left: 8, background: '#f43f5e', color: '#fff', fontSize: 9, fontWeight: 900, padding: '3px 6px', borderRadius: 4, zIndex: 10 }}>
                      +18
                    </span>
                  )}

                  {novel.coverUrl ? (
                    <img src={novel.coverUrl} alt={novel.title} style={{ width: '100%', height: 135, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ height: 135, background: '#090910', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                      📖
                    </div>
                  )}

                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {novel.title}
                      </div>

                      {/* Autor Clickeable */}
                      <div
                        onClick={() => setViewingAuthor({ authorId: novel.authorId, authorName: novel.authorName })}
                        style={{ fontSize: 11, color: '#38bdf8', cursor: 'pointer', display: 'inline-block', marginTop: 2 }}
                        title="Ver perfil del autor"
                      >
                        por <strong>{novel.authorName}</strong> ↗
                      </div>
                      
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                        {novel.description || 'Sin descripción disponible.'}
                      </p>

                      <div 
                        onClick={() => copyNovelId(novel.id)}
                        style={{ fontSize: 9, color: '#64748b', cursor: 'pointer' }}
                        title="Copiar ID de la novela"
                      >
                        ID: {novel.id.slice(0, 8)}... 📋
                      </div>

                      {novel.tags && novel.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {novel.tags.slice(0, 3).map((t, idx) => (
                            <span key={idx} style={{ fontSize: 9, background: 'rgba(56,189,248,0.12)', color: '#38bdf8', padding: '2px 6px', borderRadius: 4 }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        onClick={() => handlePlayDirectly(novel)}
                        style={{ flex: 1.2, padding: '7px', background: '#10b981', color: '#052e16', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                      >
                        ▶ Jugar
                      </button>
                      <button
                        onClick={() => handleImportToLibrary(novel)}
                        style={{ flex: 1, padding: '7px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        📥 Guardar
                      </button>
                      <button
                        onClick={() => openCommentsModal(novel)}
                        style={{ padding: '7px 10px', background: '#1e1e2e', border: '1px solid #33334d', color: '#d8b4fe', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                        title="Ver y añadir comentarios"
                      >
                        💬
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
          MODAL DE COMENTARIOS
      ========================================================= */}
      {activeCommentNovel && (
        <div
          onClick={() => setActiveCommentNovel(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#11111a', border: '1px solid #2d2d3f', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #222233', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 14 }}>Comentarios: {activeCommentNovel.title}</strong>
              <button onClick={() => setActiveCommentNovel(null)} style={{ background: 'none', border: 'none', color: '#999', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: 14, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingComments ? (
                <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>Cargando comentarios...</div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: 20, fontSize: 12 }}>No hay comentarios aún. ¡Sé el primero en opinar!</div>
              ) : (
                comments.map(c => {
                  const isMyComment = user && (c.userId === user.uid || (profile as any)?.role === 'admin');
                  return (
                    <div key={c.id} style={{ background: '#161622', padding: '8px 12px', borderRadius: 8, border: '1px solid #28283a', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>{c.userName}</span>
                        {isMyComment && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#e2e8f0', wordBreak: 'break-word' }}>{c.text}</p>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handlePostComment} style={{ padding: 12, borderTop: '1px solid #222233', display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder={user ? "Escribe un comentario..." : "Inicia sesión para comentar"}
                disabled={!user}
                style={{ flex: 1, background: '#161622', border: '1px solid #333', color: '#fff', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}
              />
              <button
                type="submit"
                disabled={!user || !newCommentText.trim()}
                style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                Publicar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE PERFIL PÚBLICO DEL AUTOR
      ========================================================= */}
      {viewingAuthor && (
        <div
          onClick={() => setViewingAuthor(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#11111a', border: '1px solid #38bdf855', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #222233', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a14' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#38bdf822', border: '1px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  👤
                </div>
                <div>
                  <strong style={{ fontSize: 15, color: '#fff' }}>{viewingAuthor.authorName}</strong>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Autor Comunitario</div>
                </div>
              </div>
              <button onClick={() => setViewingAuthor(null)} style={{ background: 'none', border: 'none', color: '#999', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              <strong style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 10 }}>
                Historias publicadas por este autor:
              </strong>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {novels
                  .filter(n => n.authorId === viewingAuthor.authorId)
                  .map(authorNovel => (
                    <div
                      key={authorNovel.id}
                      style={{ background: '#161622', padding: 10, borderRadius: 8, border: '1px solid #28283a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
                    >
                      <div>
                        <strong style={{ fontSize: 13, color: '#fff' }}>{authorNovel.title}</strong>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>{authorNovel.description || 'Sin descripción'}</p>
                      </div>
                      <button
                        onClick={() => {
                          setViewingAuthor(null);
                          handlePlayDirectly(authorNovel);
                        }}
                        style={{ padding: '5px 10px', background: '#10b981', color: '#042f1f', border: 'none', borderRadius: 4, fontWeight: 800, fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        ▶ Jugar
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
