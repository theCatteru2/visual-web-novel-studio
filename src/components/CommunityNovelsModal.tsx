import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNovel } from '../context/NovelContext';
import { CommunityNovel } from '../types';

interface CommunityNovelsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOVEL_TAGS = ['Romance', 'Fantasía', 'Misterio', 'Drama', 'Comedia', 'Terror', 'Sci-Fi', 'Aventura', 'Escolar', 'Isekai'];

export default function CommunityNovelsModal({ isOpen, onClose }: CommunityNovelsModalProps) {
  const { user, profile, loginWithGoogle } = useAuth();
  const { project, setProject, importCommunityNovelToLibrary, startPlaytest } = useNovel();

  const [novels, setNovels] = useState<CommunityNovel[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('todos');
  const [showNsfw, setShowNsfw] = useState<boolean>(() => {
    return localStorage.getItem('vwn_show_nsfw_novels') === 'true';
  });

  // Formulario de publicación
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [pubTitle, setPubTitle] = useState(project.title || '');
  const [pubDesc, setPubDesc] = useState(project.description || '');
  const [pubTags, setPubTags] = useState('');
  const [pubIsNsfw, setPubIsNsfw] = useState(false);
  const [allowFork, setAllowFork] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

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
    if (isOpen) {
      fetchNovels();
      setPubTitle(project.title || '');
      setPubDesc(project.description || '');
    }
  }, [isOpen]);

  const toggleNsfwSetting = () => {
    const nextVal = !showNsfw;
    setShowNsfw(nextVal);
    localStorage.setItem('vwn_show_nsfw_novels', String(nextVal));
  };

  if (!isOpen) return null;

  // Filtrado compuesto
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
  onPlayDirectly();
  onClose();
};

  const handleImportToLibrary = (novel: CommunityNovel) => {
    importCommunityNovelToLibrary(
      novel.projectData,
      novel.authorName,
      novel.authorId,
      novel.allowCommunityEdit
    );
    alert(`¡"${novel.title}" guardada en tu biblioteca personal!`);
  };

  const handleDeleteNovel = async (novelId: string, novelTitle: string) => {
    if (!window.confirm(`¿Eliminar permanentemente la novela "${novelTitle}" (ID: ${novelId}) de la comunidad?`)) return;

    try {
      await deleteDoc(doc(db, 'community_novels', novelId));
      setNovels(prev => prev.filter(n => n.id !== novelId));
      alert('Novela eliminada correctamente.');
    } catch (err) {
      console.error('Error al eliminar novela:', err);
      alert('Error al intentar eliminar la novela.');
    }
  };

  const handleReportNovel = async (novel: CommunityNovel) => {
    if (!user) {
      alert('Inicia sesión para reportar una historia.');
      return;
    }

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

  const handlePublishCurrentProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Debes iniciar sesión para publicar.');
    if (!pubTitle.trim()) return alert('La novela debe tener un título.');

    const cover = project.backgroundGallery?.[0]?.url || project.chapters[0]?.scenes[0]?.backgroundUrl || '';

    const parsedTags = pubTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    setIsPublishing(true);
    try {
      await addDoc(collection(db, 'community_novels'), {
        title: pubTitle.trim(),
        description: pubDesc.trim(),
        coverUrl: cover,
        tags: parsedTags,
        isNsfw: pubIsNsfw,
        authorName: profile?.displayName || user.displayName || 'Creador',
        authorId: user.uid,
        createdAt: Date.now(),
        allowCommunityEdit: allowFork,
        projectData: {
          ...project,
          title: pubTitle.trim(),
          description: pubDesc.trim()
        }
      });

      alert('¡Tu novela ha sido publicada en la comunidad con éxito!');
      setShowPublishForm(false);
      fetchNovels();
    } catch (e: any) {
      console.error(e);
      alert(`Error al publicar novela: ${e.message || 'Verifica los datos del proyecto.'}`);
    } finally {
      setIsPublishing(false);
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
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
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
            <span style={{ fontSize: 18 }}>📚</span>
            <strong style={{ fontSize: 14 }}>Novelas de la Comunidad</strong>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Barra Superior de Control */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#161624', borderBottom: '1px solid #222233', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
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
          </div>

          <button
            onClick={() => setShowPublishForm(prev => !prev)}
            style={{ padding: '5px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            {showPublishForm ? 'Ver Catálogo' : '🚀 Publicar Mi Proyecto Actual'}
          </button>
        </div>

        {/* Buscador y Tags */}
        {!showPublishForm && (
          <div style={{ padding: '8px 14px', background: '#0e0e16', borderBottom: '1px solid #222233', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Buscar por título, descripción, autor, ID o etiqueta..."
                style={{
                  flex: 1,
                  background: '#161622',
                  border: '1px solid #333',
                  borderRadius: 6,
                  color: '#fff',
                  padding: '6px 10px',
                  fontSize: 11
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: '#333', border: 'none', borderRadius: 6, color: '#aaa', padding: '0 8px', cursor: 'pointer', fontSize: 10 }}
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Tags Rápidos */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
              <button
                onClick={() => setSelectedTag('todos')}
                style={{
                  padding: '2px 8px',
                  background: selectedTag === 'todos' ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                  color: selectedTag === 'todos' ? '#000' : '#888',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 10,
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
                    padding: '2px 8px',
                    background: selectedTag === t ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                    color: selectedTag === t ? '#000' : '#aaa',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 10,
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
        )}

        {/* Contenedor Principal */}
        <div style={{ padding: 14, overflowY: 'auto', flex: 1 }}>
          {showPublishForm ? (
            <form onSubmit={handlePublishCurrentProject} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460, margin: '0 auto' }}>
              <strong style={{ fontSize: 14, color: '#38bdf8' }}>Publicar historia en la Comunidad</strong>
              
              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 2 }}>Título:</label>
                <input
                  type="text"
                  value={pubTitle}
                  onChange={e => setPubTitle(e.target.value)}
                  placeholder="Título de la novela..."
                  style={{ width: '100%', padding: 8, background: '#0a0a10', border: '1px solid #333', color: '#fff', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 2 }}>Sinopsis / Descripción:</label>
                <textarea
                  value={pubDesc}
                  onChange={e => setPubDesc(e.target.value)}
                  placeholder="¿De qué trata tu historia?..."
                  rows={3}
                  style={{ width: '100%', padding: 8, background: '#0a0a10', border: '1px solid #333', color: '#fff', borderRadius: 6, fontSize: 11, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 2 }}>Etiquetas:</label>
                <input
                  type="text"
                  value={pubTags}
                  onChange={e => setPubTags(e.target.value)}
                  placeholder="Romance, Misterio, Fantasía..."
                  style={{ width: '100%', padding: 8, background: '#0a0a10', border: '1px solid #333', color: '#fff', borderRadius: 6, fontSize: 11, boxSizing: 'border-box' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fda4af', cursor: 'pointer', background: 'rgba(244,63,94,0.1)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(244,63,94,0.3)' }}>
                <input
                  type="checkbox"
                  checked={pubIsNsfw}
                  onChange={e => setPubIsNsfw(e.target.checked)}
                  style={{ accentColor: '#f43f5e' }}
                />
                Marcar como Historia para Adultos (+18 / NSFW)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={allowFork}
                  onChange={e => setAllowFork(e.target.checked)}
                  style={{ accentColor: '#38bdf8' }}
                />
                Permitir que otros usuarios editen/remixeen mi proyecto en su estudio
              </label>

              {!user ? (
                <button type="button" onClick={loginWithGoogle} style={{ padding: 10, background: '#ea4335', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                  Inicia sesión para publicar
                </button>
              ) : (
                <button type="submit" disabled={isPublishing} style={{ padding: 10, background: '#10b981', color: '#042f1f', border: 'none', borderRadius: 6, fontWeight: 800, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                  {isPublishing ? 'Publicando...' : 'Publicar Ahora'}
                </button>
              )}
            </form>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: 25, color: '#666' }}>Cargando novelas...</div>
          ) : filteredNovels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 25, color: '#666', fontSize: 12 }}>
              No se encontraron historias con los filtros actuales.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {filteredNovels.map(novel => {
                const isMyNovel = user && (novel.authorId === user.uid || (profile as any)?.role === 'admin');

                return (
                  <div key={novel.id} style={{ position: 'relative', background: '#161622', border: `1px solid ${novel.isNsfw ? '#f43f5e55' : '#28283a'}`, borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Botones Flotantes de Moderación */}
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
                      <span style={{ position: 'absolute', top: 6, left: 6, background: '#f43f5e', color: '#fff', fontSize: 8, fontWeight: 900, padding: '2px 5px', borderRadius: 4, zIndex: 10 }}>
                        +18
                      </span>
                    )}

                    {novel.coverUrl ? (
                      <img src={novel.coverUrl} alt={novel.title} style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: 110, background: '#0c0c14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                        📖
                      </div>
                    )}

                    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                              <span key={idx} style={{ fontSize: 8, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '1px 4px', borderRadius: 3 }}>
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <button
                          onClick={() => handlePlayDirectly(novel)}
                          style={{ flex: 1, padding: '5px', background: '#10b981', color: '#052e16', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                        >
                          ▶ Jugar
                        </button>
                        <button
                          onClick={() => handleImportToLibrary(novel)}
                          style={{ flex: 1, padding: '5px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
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
    </div>
  );
}
