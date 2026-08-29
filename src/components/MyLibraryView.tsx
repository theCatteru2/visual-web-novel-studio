import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, updateDoc } from 'firebase/firestore';
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
  const { 
    project, 
    loadProjectToEditor, 
    launchPlayer, 
    exportProjectJson, 
    setActiveLibraryNovelId, 
    activeLibraryNovelId, 
    resetProjectToDefault 
  } = useNovel();

  const [savedNovels, setSavedNovels] = useState<SavedNovelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNovel, setSelectedNovel] = useState<SavedNovelItem | null>(null);
  const fileImportRef = useRef<HTMLInputElement>(null);

  const fetchLibrary = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'user_library'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as SavedNovelItem))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setSavedNovels(list);
    } catch (err) {
      console.error('Error al obtener biblioteca de usuario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [user]);

  const handleSaveCurrentToNewSlot = async () => {
    if (!user) {
      alert('Debes iniciar sesión con Google para guardar en la nube.');
      return;
    }

    if (savedNovels.length >= MAX_NOVELS_LIMIT) {
      alert(`Has alcanzado el límite máximo de ${MAX_NOVELS_LIMIT} novelas en tu biblioteca.`);
      return;
    }

    const scenes = (project as any).scenes || project.chapters?.[0]?.scenes || [];
    const cover = project.backgroundGallery?.[0]?.url || scenes[0]?.backgroundUrl || '';

    try {
      const newEntry = {
        userId: user.uid,
        title: project.title || 'Mi Novela Visual',
        description: project.description || '',
        coverUrl: cover,
        updatedAt: Date.now(),
        projectData: project
      };

      const docRef = await addDoc(collection(db, 'user_library'), newEntry);
      setActiveLibraryNovelId(docRef.id);
      await fetchLibrary();
      alert('¡Proyecto actual guardado como una nueva novela en tu biblioteca!');
    } catch (e: any) {
      console.error(e);
      alert('Error al guardar: ' + e.message);
    }
  };

  const handleCreateBlankNovel = () => {
    if (window.confirm('¿Iniciar una novela en blanco desde cero? Se limpiará el borrador del editor actual.')) {
      resetProjectToDefault();
      onOpenEditor();
    }
  };

  const handleDeleteNovel = async (novelId: string, novelTitle: string) => {
    if (!window.confirm(`¿Eliminar permanentemente "${novelTitle}" de tu biblioteca privada?`)) return;

    try {
      await deleteDoc(doc(db, 'user_library', novelId));
      if (activeLibraryNovelId === novelId) {
        setActiveLibraryNovelId(null);
      }
      setSelectedNovel(null);
      await fetchLibrary();
      alert('Novela eliminada.');
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('No se pudo eliminar la novela.');
    }
  };

  const handleDuplicateNovel = async (novel: SavedNovelItem) => {
    if (savedNovels.length >= MAX_NOVELS_LIMIT) {
      alert(`Límite de ${MAX_NOVELS_LIMIT} novelas alcanzado.`);
      return;
    }

    try {
      const clonedProject = JSON.parse(JSON.stringify(novel.projectData));
      clonedProject.title = `${clonedProject.title || 'Novela'} (Copia)`;
      clonedProject.id = `novel_${Date.now()}`;

      await addDoc(collection(db, 'user_library'), {
        userId: user!.uid,
        title: clonedProject.title,
        description: novel.description,
        coverUrl: novel.coverUrl,
        updatedAt: Date.now(),
        projectData: clonedProject
      });

      await fetchLibrary();
      alert('¡Novela duplicada con éxito!');
    } catch (e: any) {
      console.error(e);
      alert('Error al duplicar: ' + e.message);
    }
  };

  const handleCopyPrivateLink = (novelId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?privatePlay=${novelId}`;
    navigator.clipboard.writeText(url);
    alert(`Enlace directo copiado al portapapeles:\n${url}`);
  };

  const handleImportFileToLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed || !parsed.characters) {
          alert('El archivo JSON no tiene la estructura de una novela válida.');
          return;
        }

        const scenes = parsed.scenes || parsed.chapters?.[0]?.scenes || [];
        const cover = parsed.backgroundGallery?.[0]?.url || scenes[0]?.backgroundUrl || '';

        await addDoc(collection(db, 'user_library'), {
          userId: user.uid,
          title: parsed.title || 'Novela Importada',
          description: parsed.description || '',
          coverUrl: cover,
          updatedAt: Date.now(),
          projectData: parsed
        });

        await fetchLibrary();
        alert('¡Archivo JSON importado y guardado en tu biblioteca!');
      } catch (err) {
        console.error(err);
        alert('Error al procesar el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
      {/* Cabecera */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #1f1f2e',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0e0e17',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>📚</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>Mi Biblioteca Privada</h2>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {user ? `Almacenamiento en la nube (${savedNovels.length}/${MAX_NOVELS_LIMIT})` : 'Inicia sesión para respaldar tus proyectos'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <button
                onClick={handleSaveCurrentToNewSlot}
                title="Guardar el borrador actual en una nueva casilla de la biblioteca"
                style={{ padding: '7px 12px', background: '#10b981', border: 'none', borderRadius: 8, color: '#042f1f', fontWeight: 800, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                💾 Guardar Borrador Actual
              </button>

              <button
                onClick={handleCreateBlankNovel}
                style={{ padding: '7px 12px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                ✨ Crear en Blanco
              </button>

              <button
                onClick={() => fileImportRef.current?.click()}
                title="Importar un archivo JSON directamente a tu biblioteca"
                style={{ padding: '7px 12px', background: '#1e1e2d', border: '1px solid #2d2d3f', borderRadius: 8, color: '#ddd', fontSize: 11, cursor: 'pointer' }}
              >
                📂 Importar JSON
              </button>
              <input type="file" ref={fileImportRef} onChange={handleImportFileToLibrary} accept=".json" style={{ display: 'none' }} />
            </>
          ) : (
            <button
              onClick={loginWithGoogle}
              style={{ padding: '8px 16px', background: '#ea4335', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
            >
              Iniciar Sesión con Google
            </button>
          )}
        </div>
      </div>

      {/* Cuadrícula de Proyectos */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!user ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 10 }}>🔒</span>
            <p style={{ margin: 0, fontSize: 14 }}>Inicia sesión para ver y gestionar tus novelas guardadas en la nube.</p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Cargando tu biblioteca...</div>
        ) : savedNovels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 10 }}>📖</span>
            <p style={{ margin: 0, fontSize: 14 }}>Aún no tienes novelas guardadas en tu biblioteca.</p>
            <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#475569' }}>
              Puedes guardar el borrador del editor haciendo clic en "💾 Guardar Borrador Actual".
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 16
          }}>
            {savedNovels.map(novel => {
              const isCurrentlyActive = activeLibraryNovelId === novel.id;

              return (
                <div
                  key={novel.id}
                  onClick={() => setSelectedNovel(novel)}
                  style={{
                    background: isCurrentlyActive ? '#151528' : '#10101a',
                    border: `1.5px solid ${isCurrentlyActive ? '#38bdf8' : '#232338'}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease'
                  }}
                >
                  <div style={{
                    height: 120,
                    background: novel.coverUrl ? `url(${novel.coverUrl}) center/cover no-repeat` : '#181826',
                    position: 'relative'
                  }}>
                    {isCurrentlyActive && (
                      <span style={{ position: 'absolute', top: 8, left: 8, background: '#38bdf8', color: '#042133', fontSize: 9, fontWeight: 900, padding: '3px 6px', borderRadius: 4 }}>
                        EN EDICIÓN
                      </span>
                    )}
                  </div>

                  <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6 }}>
                    <div>
                      <strong style={{ fontSize: 14, color: '#f1f5f9', display: 'block' }}>{novel.title}</strong>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0 0', maxHeight: 32, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {novel.description || 'Sin descripción.'}
                      </p>
                    </div>

                    <span style={{ fontSize: 9, color: '#64748b' }}>
                      Modificado: {new Date(novel.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Acciones de la Novela Seleccionada */}
      {selectedNovel && (
        <div
          onClick={() => setSelectedNovel(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 130,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
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
              {/* 1. Abrir en Editor (Acción Explícita) */}
              <button
                onClick={() => {
                  loadProjectToEditor(selectedNovel.projectData, selectedNovel.id);
                  onOpenEditor();
                }}
                style={{ padding: '10px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
              >
                ✏️ Abrir en el Editor
              </button>

              {/* 2. Jugar en Aislamiento */}
              <button
                onClick={() => {
                  launchPlayer(selectedNovel.projectData, {
                    isEditorPlaytest: false,
                    canEdit: true,
                    novelId: selectedNovel.id,
                    fromStart: true
                  });
                  onPlayNovel();
                }}
                style={{ padding: '10px', background: '#10b981', border: 'none', borderRadius: 8, color: '#042f1f', fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
              >
                ▶ Jugar Modo Historia
              </button>

              <button
                onClick={() => {
                  const proj = selectedNovel.projectData;
                  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(proj, null, 2));
                  const anchor = document.createElement('a');
                  anchor.setAttribute('href', dataStr);
                  anchor.setAttribute('download', `${proj.title || 'novela'}.json`);
                  document.body.appendChild(anchor);
                  anchor.click();
                  anchor.remove();
                }}
                style={{ padding: '9px', background: '#1e1e2e', border: '1px solid #333348', borderRadius: 8, color: '#ddd', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
              >
                📥 Descargar Archivo JSON
              </button>

              <button
                onClick={() => {
                  setSelectedNovel(null);
                  onOpenPublishModal(selectedNovel.projectData);
                }}
                style={{ padding: '9px', background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
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
