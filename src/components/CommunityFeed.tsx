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
  const { launchPlayer, importCommunityNovelToLibrary } = useNovel();

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
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Modal de Perfil de Autor
  const [authorModal, setAuthorModal] = useState<AuthorProfileModalData | null>(null);
  const [authorNovels, setAuthorNovels] = useState<CommunityNovel[]>([]);
  const [loadingAuthorNovels, setLoadingAuthorNovels] = useState(false);

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'community_novels'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityNovel));
      setNovels(list);
    } catch (err) {
      console.error('Error al cargar novelas comunitarias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNovels();
  }, []);

  const toggleNsfw = () => {
    const nextVal = !showNsfw;
    setShowNsfw(nextVal);
    localStorage.setItem('vwn_show_nsfw_novels', String(nextVal));
  };

  // Comentarios
  const openComments = async (novel: CommunityNovel) => {
    setActiveCommentNovel(novel);
    setLoadingComments(true);
    try {
      const q = query(collection(db, 'novel_comments'), where('novelId', '==', novel.id));
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as CommentItem))
        .sort((a, b) => a.createdAt - b.createdAt);
      setComments(list);
    } catch (e) {
      console.error('Error al cargar comentarios:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Debes iniciar sesión para comentar.');
    if (!newCommentText.trim() || !activeCommentNovel) return;

    setIsSubmittingComment(true);
    try {
      const newC: Omit<CommentItem, 'id'> = {
        novelId: activeCommentNovel.id,
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Usuario',
        userAvatar: profile?.avatarUrl || user.photoURL || undefined,
        text: newCommentText.trim(),
        createdAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'novel_comments'), newC);
      setComments(prev => [...prev, { id: docRef.id, ...newC }]);
      setNewCommentText('');
    } catch (err) {
      console.error('Error enviando comentario:', err);
      alert('No se pudo enviar el comentario.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'novel_comments', commentId));
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error eliminando comentario:', err);
    }
  };

  // Perfil de Autor
  const openAuthorProfile = async (authorId: string, authorName: string) => {
    setAuthorModal({ authorId, authorName });
    setLoadingAuthorNovels(true);
    try {
      const q = query(collection(db, 'community_novels'), where('authorId', '==', authorId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityNovel));
      setAuthorNovels(list);
    } catch (e) {
      console.error('Error cargando obras del autor:', e);
    } finally {
      setLoadingAuthorNovels(false);
    }
  };

  const filteredNovels = novels.filter(n => {
    if (!showNsfw && n.isNsfw) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchDesc = (n.description || '').toLowerCase().includes(q);
      const matchAuthor = (n.authorName || '').toLowerCase().includes(q);
      const matchTags = (n.tags || []).some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchAuthor && !matchTags) return false;
    }

    if (selectedTag !== 'todos') {
      if (!n.tags || !n.tags.includes(selectedTag)) return false;
    }

    return true;
  });

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
    alert(`¡"${novel.title}" se ha guardado en tu biblioteca privada!`);
  };

  const handleDeleteNovel = async (novelId: string, novelTitle: string) => {
    if (!window.confirm(`¿Eliminar definitivamente la novela "${novelTitle}" de la comunidad?`)) return;

    try {
      await deleteDoc(doc(db, 'community_novels', novelId));
      setNovels(prev => prev.filter(n => n.id !== novelId));
      alert('Novela eliminada de la comunidad.');
    } catch (err) {
      console.error('Error al eliminar novela:', err);
      alert('Error al intentar eliminar la novela.');
    }
  };

  const handleReportNovel = async (novel: CommunityNovel) => {
    if (!user) return alert('Debes iniciar sesión para reportar una historia.');

    const reason = window.prompt(`Reportar novela "${novel.title}" (ID: ${novel.id}):\nIndica el motivo del reporte:`);
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
    <div style={{
      width: '100%',
      height: '100%',
      background: '#09090f',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Barra de Filtros y Búsqueda */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #1f1f2e',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
        background: '#0e0e17'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <span style={{ fontSize: 20 }}>🌐</span>
          <strong style={{ fontSize: 16, color: '#f8fafc' }}>Comunidad</strong>
        </div>

        <input
          type="text"
          placeholder="Buscar por título, autor o palabra clave..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            background: '#161622',
            border: '1px solid #2d2d3f',
            borderRadius: 8,
            padding: '7px 12px',
            color: '#fff',
            fontSize: 12,
            outline: 'none'
          }}
        />

        <select
          value={selectedTag}
          onChange={e => setSelectedTag(e.target.value)}
          style={{
            background: '#161622',
            border: '1px solid #2d2d3f',
            borderRadius: 8,
            padding: '7px 12px',
            color: '#fff',
            fontSize: 12,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="todos">Todos los Géneros</option>
          {NOVEL_TAGS.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <button
          onClick={toggleNsfw}
          style={{
            padding: '7px 12px',
            background: showNsfw ? '#ef4444' : '#1e1e2d',
            border: '1px solid #2d2d3f',
            color: showNsfw ? '#fff' : '#888',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          🔞 NSFW: {showNsfw ? 'Visible' : 'Oculto'}
        </button>

        <button
          onClick={fetchNovels}
          title="Recargar novelas"
          style={{
            padding: '7px 12px',
            background: '#161622',
            border: '1px solid #2d2d3f',
            color: '#38bdf8',
            borderRadius: 8,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          🔄
        </button>

        {onOpenProfile && user && (
          <button
            onClick={onOpenProfile}
            style={{
              padding: '7px 12px',
              background: '#372254',
              border: '1px solid #a855f7',
              color: '#fff',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            👤 Mi Perfil
          </button>
        )}
      </div>

      {/* Cuadrícula de Historias */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Cargando creaciones...</div>
        ) : filteredNovels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
            No se encontraron novelas con los filtros actuales.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 16
          }}>
            {filteredNovels.map(novel => {
              const isAuthor = user && user.uid === novel.authorId;
              const isAdmin = (profile as any)?.role === 'admin';

              return (
                <div
                  key={novel.id}
                  style={{
                    background: '#12121c',
                    border: '1px solid #232336',
                    borderRadius: 12,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  {/* Portada */}
                  <div style={{
                    height: 125,
                    background: novel.coverUrl ? `url(${novel.coverUrl}) center/cover no-repeat` : '#1a1a28',
                    position: 'relative'
                  }}>
                    {novel.isNsfw && (
                      <span style={{ position: 'absolute', top: 8, left: 8, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 4 }}>
                        18+
                      </span>
                    )}

                    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => copyNovelId(novel.id)}
                        title="Copiar ID de la novela"
                        style={{ background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', padding: '3px 6px', borderRadius: 4, fontSize: 9, cursor: 'pointer' }}
                      >
                        📋 ID
                      </button>
                      {(isAuthor || isAdmin) && (
                        <button
                          onClick={() => handleDeleteNovel(novel.id, novel.title)}
                          title="Eliminar novela"
                          style={{ background: 'rgba(239,68,68,0.85)', border: 'none', color: '#fff', padding: '3px 6px', borderRadius: 4, fontSize: 9, cursor: 'pointer' }}
                        >
                          🗑️
                        </button>
                      )}
                      {!isAuthor && (
                        <button
                          onClick={() => handleReportNovel(novel)}
                          title="Reportar novela"
                          style={{ background: 'rgba(0,0,0,0.7)', border: 'none', color: '#f59e0b', padding: '3px 6px', borderRadius: 4, fontSize: 9, cursor: 'pointer' }}
                        >
                          ⚠️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Datos de la Historia */}
                  <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: 14, color: '#f8fafc', display: 'block', lineHeight: 1.25 }}>{novel.title}</strong>
                      <button
                        onClick={() => openAuthorProfile(novel.authorId, novel.authorName)}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, padding: 0, marginTop: 2, cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}
                      >
                        Por: {novel.authorName || 'Autor'}
                      </button>

                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0 0', maxHeight: 34, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {novel.description || 'Sin descripción disponible.'}
                      </p>

                      {novel.tags && novel.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {novel.tags.slice(0, 3).map((t, idx) => (
                            <span key={idx} style={{ fontSize: 9, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '1px 5px', borderRadius: 4 }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handlePlayDirectly(novel)}
                          style={{ flex: 1, padding: '7px', background: '#10b981', color: '#042f1f', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                        >
                          ▶ Jugar
                        </button>
                        <button
                          onClick={() => handleImportToLibrary(novel)}
                          style={{ flex: 1, padding: '7px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >
                          📥 Guardar
                        </button>
                      </div>

                      <button
                        onClick={() => openComments(novel)}
                        style={{ width: '100%', padding: '5px', background: '#1a1a28', border: '1px solid #2d2d42', color: '#aaa', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}
                      >
                        💬 Ver Comentarios
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Comentarios */}
      {activeCommentNovel && (
        <div
          onClick={() => setActiveCommentNovel(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#12121c',
              border: '1px solid #2d2d42',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              height: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #232336', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#161626' }}>
              <div>
                <strong style={{ fontSize: 14, color: '#f8fafc' }}>Comentarios</strong>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{activeCommentNovel.title}</div>
              </div>
              <button onClick={() => setActiveCommentNovel(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingComments ? (
                <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>Cargando comentarios...</div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>Sé el primero en comentar esta novela.</div>
              ) : (
                comments.map(c => {
                  const isMyComment = user && user.uid === c.userId;
                  return (
                    <div key={c.id} style={{ background: '#181826', border: '1px solid #27273d', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {c.userAvatar ? (
                            <img src={c.userAvatar} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                          ) : (
                            <span style={{ fontSize: 14 }}>👤</span>
                          )}
                          <strong style={{ fontSize: 11, color: '#38bdf8' }}>{c.userName}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 9, color: '#666' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                          {isMyComment && (
                            <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>🗑️</button>
                          )}
                        </div>
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{c.text}</p>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendComment} style={{ padding: 12, borderTop: '1px solid #232336', display: 'flex', gap: 8, background: '#161626' }}>
              <input
                type="text"
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder={user ? "Escribe un comentario..." : "Inicia sesión para comentar"}
                disabled={!user || isSubmittingComment}
                style={{ flex: 1, background: '#0e0e17', border: '1px solid #2d2d42', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none' }}
              />
              <button
                type="submit"
                disabled={!user || isSubmittingComment || !newCommentText.trim()}
                style={{ padding: '8px 14px', background: '#a855f7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Perfil de Autor */}
      {authorModal && (
        <div
          onClick={() => setAuthorModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#12121c',
              border: '1px solid #2d2d42',
              borderRadius: 16,
              width: '100%',
              maxWidth: 640,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #232336', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#161626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>✍️</span>
                <div>
                  <strong style={{ fontSize: 15, color: '#f8fafc' }}>{authorModal.authorName}</strong>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Obras publicadas en la comunidad</div>
                </div>
              </div>
              <button onClick={() => setAuthorModal(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
              {loadingAuthorNovels ? (
                <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>Cargando historias del autor...</div>
              ) : authorNovels.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>No se encontraron otras obras de este autor.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {authorNovels.map(authorNovel => (
                    <div key={authorNovel.id} style={{ background: '#181826', border: '1px solid #27273d', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <strong style={{ fontSize: 13, color: '#f1f5f9' }}>{authorNovel.title}</strong>
                        <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#94a3b8' }}>{authorNovel.description || 'Sin descripción.'}</p>
                      </div>
                      <button
                        onClick={() => {
                          setAuthorModal(null);
                          handlePlayDirectly(authorNovel);
                        }}
                        style={{ padding: '6px 12px', background: '#10b981', border: 'none', borderRadius: 6, color: '#042f1f', fontWeight: 800, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        ▶ Jugar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
