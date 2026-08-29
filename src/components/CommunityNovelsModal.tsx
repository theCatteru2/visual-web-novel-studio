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
  const { user, profile } = useAuth();
  const { project, launchPlayer, importCommunityNovelToLibrary } = useNovel();

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
  const [allowCommunityEdit, setAllowCommunityEdit] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'community_novels'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as CommunityNovel[];
      setNovels(list);
    } catch (err) {
      console.error('Error al cargar novelas de la comunidad:', err);
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
  }, [isOpen, project.title, project.description]);

  const toggleNsfw = () => {
    const nextVal = !showNsfw;
    setShowNsfw(nextVal);
    localStorage.setItem('vwn_show_nsfw_novels', String(nextVal));
  };

  if (!isOpen) return null;

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

    const scenes = (project as any).scenes || project.chapters?.[0]?.scenes || [];
    const cover = project.backgroundGallery?.[0]?.url || scenes[0]?.backgroundUrl || '';

    const parsedTags = pubTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    setIsPublishing(true);
    try {
      const newNovelDoc: Omit<CommunityNovel, 'id'> = {
        title: pubTitle.trim(),
        description: pubDesc.trim(),
        coverUrl: cover,
        tags: parsedTags,
        isNsfw: pubIsNsfw,
        allowCommunityEdit,
        authorName: profile?.displayName || user.displayName || 'Autor Anónimo',
        authorId: user.uid,
        createdAt: Date.now(),
        projectData: project
      };

      const docRef = await addDoc(collection(db, 'community_novels'), newNovelDoc);
      setNovels(prev => [{ id: docRef.id, ...newNovelDoc }, ...prev]);
      setShowPublishForm(false);
      alert('¡Novela publicada exitosamente en la comunidad!');
    } catch (err: any) {
      console.error('Error publicando:', err);
      alert('Error al publicar: ' + (err.message || 'Verifica tu conexión'));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 5, 10, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 120,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12
    }}>
      <div style={{
        background: '#0d0d14',
        border: '1px solid #2d2d3f',
        borderRadius: 16,
        width: '100%',
        maxWidth: 960,
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
        color: '#fff',
        overflow: 'hidden'
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid #1f1f2e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#12121c'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🌐</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f3f4f6' }}>Novelas de la Comunidad</strong>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Explora, juega y comparte historias interactivas</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setShowPublishForm(prev => !prev)}
              style={{
                padding: '6px 12px',
                background: showPublishForm ? '#374151' : '#a855f7',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer'
              }}
            >
              {showPublishForm ? '✕ Cancelar' : '🚀 Publicar mi Proyecto'}
            </button>

            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        {!showPublishForm && (
          <div style={{
            padding: '10px 18px',
            borderBottom: '1px solid #1f1f2e',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            background: '#0a0a10'
          }}>
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
                borderRadius: 6,
                padding: '6px 10px',
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
                borderRadius: 6,
                padding: '6px 10px',
                color: '#fff',
                fontSize: 12,
                outline: 'none'
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
                padding: '6px 10px',
                background: showNsfw ? '#ef4444' : '#1e1e2d',
                border: '1px solid #2d2d3f',
                color: showNsfw ? '#fff' : '#888',
                borderRadius: 6,
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
                padding: '6px 10px',
                background: '#161622',
                border: '1px solid #2d2d3f',
                color: '#38bdf8',
                borderRadius: 6,
                fontSize: 11,
                cursor: 'pointer'
              }}
            >
              🔄
            </button>
          </div>
        )}

        {/* Contenido Principal */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {showPublishForm ? (
            <form onSubmit={handlePublishCurrentProject} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460, margin: '0 auto' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 15, color: '#c084fc' }}>Publicar Historia Actual en la Comunidad</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                Comparte tu novela visual con todos los usuarios.
              </p>

              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 2 }}>Título de la Novela</label>
                <input
                  type="text"
                  required
                  value={pubTitle}
                  onChange={e => setPubTitle(e.target.value)}
                  style={{ width: '100%', background: '#161622', border: '1px solid #2d2d3f', borderRadius: 6, padding: '7px', color: '#fff', fontSize: 12, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 2 }}>Descripción / Sinopsis</label>
                <textarea
                  rows={3}
                  value={pubDesc}
                  onChange={e => setPubDesc(e.target.value)}
                  placeholder="Cuenta de qué trata tu historia..."
                  style={{ width: '100%', background: '#161622', border: '1px solid #2d2d3f', borderRadius: 6, padding: '7px', color: '#fff', fontSize: 12, boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 2 }}>Etiquetas (separadas por comas)</label>
                <input
                  type="text"
                  placeholder="Romance, Escolar, Misterio..."
                  value={pubTags}
                  onChange={e => setPubTags(e.target.value)}
                  style={{ width: '100%', background: '#161622', border: '1px solid #2d2d3f', borderRadius: 6, padding: '7px', color: '#fff', fontSize: 12, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 4 }}>
                <label style={{ fontSize: 12, color: '#ddd', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={pubIsNsfw}
                    onChange={e => setPubIsNsfw(e.target.checked)}
                  />
                  <span>Contenido Maduro / NSFW</span>
                </label>

                <label style={{ fontSize: 12, color: '#ddd', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allowCommunityEdit}
                    onChange={e => setAllowCommunityEdit(e.target.checked)}
                  />
                  <span>Permitir clonar/editar proyecto</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isPublishing}
                style={{
                  marginTop: 8,
                  padding: '10px',
                  background: '#a855f7',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                {isPublishing ? 'Publicando...' : '🚀 Confirmar y Publicar'}
              </button>
            </form>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Cargando novelas...</div>
          ) : filteredNovels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
              No se encontraron novelas con los filtros actuales.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14
            }}>
              {filteredNovels.map(novel => {
                const isAuthor = user && user.uid === novel.authorId;
                const isAdmin = profile?.role === 'admin';

                return (
                  <div
                    key={novel.id}
                    style={{
                      background: '#13131e',
                      border: '1px solid #232336',
                      borderRadius: 10,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
                    }}
                  >
                    {/* Portada */}
                    <div style={{
                      height: 110,
                      background: novel.coverUrl ? `url(${novel.coverUrl}) center/cover no-repeat` : '#1c1c2b',
                      position: 'relative'
                    }}>
                      {novel.isNsfw && (
                        <span style={{ position: 'absolute', top: 6, left: 6, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 5px', borderRadius: 4 }}>
                          18+
                        </span>
                      )}

                      <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => copyNovelId(novel.id)}
                          title="Copiar ID de la novela"
                          style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: '2px 5px', borderRadius: 4, fontSize: 9, cursor: 'pointer' }}
                        >
                          📋 ID
                        </button>
                        {(isAuthor || isAdmin) && (
                          <button
                            onClick={() => handleDeleteNovel(novel.id, novel.title)}
                            title="Eliminar novela"
                            style={{ background: 'rgba(239,68,68,0.8)', border: 'none', color: '#fff', padding: '2px 5px', borderRadius: 4, fontSize: 9, cursor: 'pointer' }}
                          >
                            🗑️
                          </button>
                        )}
                        {!isAuthor && (
                          <button
                            onClick={() => handleReportNovel(novel)}
                            title="Reportar novela"
                            style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#f59e0b', padding: '2px 5px', borderRadius: 4, fontSize: 9, cursor: 'pointer' }}
                          >
                            ⚠️
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Información */}
                    <div style={{ padding: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <strong style={{ fontSize: 13, color: '#f3f4f6', display: 'block', lineHeight: 1.2 }}>{novel.title}</strong>
                        <span style={{ fontSize: 10, color: '#38bdf8', display: 'block', marginTop: 2 }}>
                          Por: {novel.authorName || 'Autor'}
                        </span>

                        <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0 0', maxHeight: 36, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {novel.description || 'Sin descripción disponible.'}
                        </p>

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

                      {/* Acciones */}
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
