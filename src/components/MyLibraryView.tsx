import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNovel } from '../context/NovelContext';
import { NovelProject } from '../types';

interface MyLibraryViewProps {
  onOpenEditor: () => void;
  onPlayNovel: () => void;
  onOpenPublishModal: (projectToPublish: NovelProject) => void;
}

interface SavedNovelItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  coverUrl?: string;
  updatedAt: number;
  projectData: NovelProject;
}

const MAX_NOVELS_LIMIT = 15;

export default function MyLibraryView({ onOpenEditor, onPlayNovel, onOpenPublishModal }: MyLibraryViewProps) {
  const { user, loginWithGoogle } = useAuth();
  const { project, setProject, startPlaytest } = useNovel();

  const [savedNovels, setSavedNovels] = useState<SavedNovelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNovel, setSelectedNovel] = useState<SavedNovelItem | null>(null);

  const fetchLibrary = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'user_library'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as SavedNovelItem))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      setSavedNovels(list);
    } catch (e) {
      console.error('Error al cargar biblioteca:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [user]);

  const handleSaveCurrentToLibrary = async () => {
    if (!user) return alert('Inicia sesión para guardar en tu biblioteca.');
    if (savedNovels.length >= MAX_NOVELS_LIMIT) {
      return alert(`Has alcanzado el límite máximo de ${MAX_NOVELS_LIMIT} novelas privadas. Elimina alguna para guardar una nueva.`);
    }

    const cover = project.backgroundGallery?.[0]?.url || project.chapters[0]?.scenes[0]?.backgroundUrl || '';
    try {
      await addDoc(collection(db, 'user_library'), {
        userId: user.uid,
        title: project.title || 'Novela sin título',
        description: project.description || '',
        coverUrl: cover,
        updatedAt: Date.now(),
        projectData: project
      });
      alert('¡Proyecto guardado en tu biblioteca privada!');
      fetchLibrary();
    } catch (e) {
      console.error(e);
      alert('Error al guardar en la biblioteca.');
    }
  };

  const handleDuplicateNovel = async (novel: SavedNovelItem) => {
    if (savedNovels.length >= MAX_NOVELS_LIMIT) {
      return alert(`Límite de ${MAX_NOVELS_LIMIT} novelas alcanzado.`);
    }

    try {
      await addDoc(collection(db, 'user_library'), {
        userId: user!.uid,
        title: `${novel.title} (Copia)`,
        description: novel.description,
        coverUrl: novel.coverUrl || '',
        updatedAt: Date.now(),
        projectData: {
          ...novel.projectData,
          id: `novel_${Date.now()}`,
          title: `${novel.title} (Copia)`
        }
      });
      alert('Novela duplicada.');
      fetchLibrary();
    } catch (e) {
      console.error(e);
      alert('Error al duplicar.');
    }
  };

  const handleDeleteNovel = async (novelId: string, title: string) => {
    if (!window.confirm(`¿Eliminar definitivamente "${title}" de tu biblioteca privada?`)) return;

    try {
      await deleteDoc(doc(db, 'user_library', novelId));
      setSavedNovels(prev => prev.filter(n => n.id !== novelId));
      if (selectedNovel?.id === novelId) setSelectedNovel(null);
      alert('Novela eliminada.');
    } catch (e) {
      console.error(e);
      alert('Error al eliminar novela.');
    }
  };

  const handleCopyPrivateLink = (novelId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?privatePlay=${novelId}`;
    navigator.clipboard.writeText(url);
    alert('¡Enlace privado copiado! Quien ingrese podrá jugar tu novela directamente.');
  };

  if (!user) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#09090e', color: '#fff', padding: 20 }}>
        <span style={{ fontSize: 44, marginBottom: 12 }}>📚</span>
        <h2 style={{ margin: '0 0 8px' }}>Tu Biblioteca Privada</h2>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>Inicia sesión para almacenar tus novelas de forma segura en la nube (máx. 15).</p>
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
      {/* Cabecera */}
      <div style={{ padding: '14px 20px', background: '#11111a', borderBottom: '1px solid #1f1f2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <strong style={{ fontSize: 16 }}>📚 Biblioteca Privada de Novelas</strong>
          <span style={{ fontSize: 12, color: savedNovels.length >= MAX_NOVELS_LIMIT ? '#ef4444' : '#38bdf8', marginLeft: 10, fontWeight: 700 }}>
            ({savedNovels.length} / {MAX_NOVELS_LIMIT})
          </span>
        </div>

        <button
          onClick={handleSaveCurrentToLibrary}
          disabled={savedNovels.length >= MAX_NOVELS_LIMIT}
          style={{
            padding: '6px 14px',
            background: savedNovels.length >= MAX_NOVELS_LIMIT ? '#334155' : '#10b981',
            color: savedNovels.length >= MAX_NOVELS_LIMIT ? '#94a3b8' : '#042f1f',
            border: 'none',
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 12,
            cursor: savedNovels.length >= MAX_NOVELS_LIMIT ? 'not-allowed' : 'pointer'
          }}
        >
          + Guardar Proyecto Actual Aquí
        </button>
      </div>

      {/* Grid de Novelas */}
      <div style={{ padding: 20, flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>Cargando tu biblioteca...</div>
        ) : savedNovels.length === 0 ? (
          <div style={{ background: '#11111a', border: '1px dashed #2d2d42', borderRadius: 14, padding: 40, textAlign: 'center', color: '#71717a' }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 10 }}>📂</span>
            <p style={{ margin: 0, fontSize: 14 }}>Aún no tienes novelas guardadas en tu biblioteca.</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#a1a1aa' }}>Guarda tu proyecto activo con el botón superior para editarlo o compartirlo después.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
            {savedNovels.map(novel => (
              <div
                key={novel.id}
                onClick={() => setSelectedNovel(novel)}
                style={{
                  background: '#141422',
                  border: '1px solid #28283d',
                  borderRadius: 12,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.15s ease'
                }}
              >
                {novel.coverUrl ? (
                  <img src={novel.coverUrl} alt="" style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: 110, background: '#090910', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                    📖
                  </div>
                )}

                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <strong style={{ fontSize: 13, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {novel.title}
                  </strong>
                  <span style={{ fontSize: 10, color: '#71717a' }}>
                    Actualizado: {new Date(novel.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Acciones para la Novela Seleccionada */}
      {selectedNovel && (
        <div
          onClick={() => setSelectedNovel(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#12121c', border: '1px solid #2d2d42', borderRadius: 16, width: '100%', maxWidth: 440, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, color: '#fff' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 16 }}>{selectedNovel.title}</strong>
              <button onClick={() => setSelectedNovel(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              {selectedNovel.description || 'Sin descripción disponible.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => {
                  setProject(selectedNovel.projectData);
                  onOpenEditor();
                }}
                style={{ padding: '10px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
              >
                ✏️ Abrir en el Editor
              </button>

              <button
                onClick={() => {
                  setProject(selectedNovel.projectData);
                  startPlaytest(undefined, true);
                  onPlayNovel();
                }}
                style={{ padding: '10px', background: '#10b981', border: 'none', borderRadius: 8, color: '#042f1f', fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
              >
                ▶ Jugar Modo Historia
              </button>

              <button
                onClick={() => {
                  const proj = selectedNovel.projectData;
                  setSelectedNovel(null);
                  onOpenPublishModal(proj);
                }}
                style={{ padding: '10px', background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
              >
                🚀 Publicar en la Comunidad
              </button>

              <button
                onClick={() => handleCopyPrivateLink(selectedNovel.id)}
                style={{ padding: '9px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#38bdf8', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
              >
                🔗 Copiar Enlace Privado
              </button>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => handleDuplicateNovel(selectedNovel)}
                  style={{ flex: 1, padding: '8px', background: '#27273a', border: '1px solid #3f3f5a', borderRadius: 8, color: '#e4e4e7', fontSize: 11, cursor: 'pointer' }}
                >
                  📑 Duplicar
                </button>
                <button
                  onClick={() => handleDeleteNovel(selectedNovel.id, selectedNovel.title)}
                  style={{ flex: 1, padding: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 11, cursor: 'pointer' }}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
