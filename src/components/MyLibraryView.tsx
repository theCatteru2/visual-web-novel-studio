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
  const { project, setProject, startPlaytest, setActiveLibraryNovelId, activeLibraryNovelId, resetProjectToDefault } = useNovel();

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

  // Guardar proyecto actual (si ya existe se actualiza, si no se crea nuevo)
  const handleSaveCurrentToLibrary = async () => {
    if (!user) return alert('Inicia sesión para guardar en tu biblioteca.');

    const scenes = (project as any).scenes || project.chapters?.[0]?.scenes || [];
    const cover = project.backgroundGallery?.[0]?.url || scenes[0]?.backgroundUrl || '';

    try {
      if (activeLibraryNovelId) {
        await updateDoc(doc(db, 'user_library', activeLibraryNovelId), {
          title: project.title || 'Novela sin título',
          description: project.description || '',
          coverUrl: cover,
          updatedAt: Date.now(),
          projectData: project
        });
        alert('¡Cambios guardados en tu novela de la biblioteca!');
      } else {
        if (savedNovels.length >= MAX_NOVELS_LIMIT) {
          return alert(`Has alcanzado el límite de ${MAX_NOVELS_LIMIT} novelas privadas.`);
        }
        const docRef = await addDoc(collection(db, 'user_library'), {
          userId: user.uid,
          title: project.title || 'Novela sin título',
          description: project.description || '',
          coverUrl: cover,
          updatedAt: Date.now(),
          projectData: project
        });
        setActiveLibraryNovelId(docRef.id);
        alert('¡Proyecto guardado en tu biblioteca privada!');
      }
      fetchLibrary();
    } catch (e: any) {
      console.error(e);
      alert('Error al guardar: ' + (e.message || ''));
    }
  };

  // Crear novela en blanco y abrir editor
  const handleCreateBlankNovel = () => {
    if (window.confirm('¿Deseas crear una nueva novela en blanco para editar?')) {
      resetProjectToDefault();
      setActiveLibraryNovelId(null);
      onOpenEditor();
    }
  };

  // Importar archivo JSON directo a la biblioteca privada
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (savedNovels.length >= MAX_NOVELS_LIMIT) {
      alert(`Has alcanzado el límite de ${MAX_NOVELS_LIMIT} novelas privadas.`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);

        const scenes = (parsed as any).scenes || parsed.chapters?.[0]?.scenes || [];
        if (!parsed.characters || scenes.length === 0) {
          alert('El archivo no es un proyecto de novela válido.');
          return;
        }

        const cover = parsed.backgroundGallery?.[0]?.url || scenes[0]?.backgroundUrl || '';

        await addDoc(collection(db, 'user_library'), {
          userId: user.uid,
          title: parsed.title || file.name.replace(/\.[^/.]+$/, ''),
          description: parsed.description || '',
          coverUrl: cover,
          updatedAt: Date.now(),
          projectData: parsed
        });

        alert(`¡"${parsed.title || 'Novela'}" importada directamente a tu biblioteca!`);
        fetchLibrary();
      } catch (err) {
        console.error(err);
        alert('Error al importar el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
      if (activeLibraryNovelId === novelId) setActiveLibraryNovelId(null);
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
      
      {/* Cabecera de la Biblioteca */}
      <div style={{ padding: '14px 20px', background: '#11111a', borderBottom: '1px solid #1f1f2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <strong style={{ fontSize: 16 }}>📚 Biblioteca Privada de Novelas</strong>
          <span style={{ fontSize: 12, color: savedNovels.length >= MAX_NOVELS_LIMIT ? '#ef4444' : '#38bdf8', marginLeft: 10, fontWeight: 700 }}>
            ({savedNovels.length} / {MAX_NOVELS_LIMIT})
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Botón Crear en Blanco */}
          <button
            onClick={handleCreateBlankNovel}
            style={{
              padding: '6px 12px',
              background: '#161622',
              border: '1px solid #38bdf844',
              color: '#38bdf8',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            ✨ Nueva en Blanco
          </button>

          {/* Botón Importar JSON */}
          <button
            onClick={() => fileImportRef.current?.click()}
            style={{
              padding: '6px 12px',
              background: '#161622',
              border: '1px solid #a855f744',
              color: '#d8b4fe',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            📂 Importar Archivo
          </button>
          <input
            type="file"
            ref={fileImportRef}
            onChange={handleImportJsonFile}
            accept=".json"
            style={{ display: 'none' }}
          />

          {/* Guardar Proyecto Actual */}
          <button
            onClick={handleSaveCurrentToLibrary}
            disabled={!activeLibraryNovelId && savedNovels.length >= MAX_NOVELS_LIMIT}
            style={{
              padding: '6px 14px',
              background: (!activeLibraryNovelId && savedNovels.length >= MAX_NOVELS_LIMIT) ? '#334155' : '#10b981',
              color: (!activeLibraryNovelId && savedNovels.length >= MAX_NOVELS_LIMIT) ? '#94a3b8' : '#042f1f',
              border: 'none',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 12,
              cursor: (!activeLibraryNovelId && savedNovels.length >= MAX_NOVELS_LIMIT) ? 'not-allowed' : 'pointer'
            }}
          >
            {activeLibraryNovelId ? '💾 Guardar Cambios de la Novela Abierta' : '+ Guardar Proyecto Actual'}
          </button>
        </div>
      </div>

      {/* Grid de Novelas */}
      <div style={{ padding: 20, flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>Cargando tu biblioteca...</div>
        ) : savedNovels.length === 0 ? (
          <div style={{ background: '#11111a', border: '1px dashed #2d2d42', borderRadius: 14, padding: 40, textAlign: 'center', color: '#71717a' }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 10 }}>📂</span>
            <p style={{ margin: 0, fontSize: 14 }}>Aún no tienes novelas guardadas en tu biblioteca.</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#a1a1aa' }}>Crea una en blanco, importa un archivo JSON o guarda tu borrador activo.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
            {savedNovels.map(novel => {
              const isCurrentlyActive = activeLibraryNovelId === novel.id;
              return (
                <div
                  key={novel.id}
                  onClick={() => setSelectedNovel(novel)}
                  style={{
                    background: '#141422',
                    border: isCurrentlyActive ? '2px solid #38bdf8' : '1px solid #28283d',
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 13, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {novel.title}
                      </strong>
                      {isCurrentlyActive && (
                        <span style={{ fontSize: 9, background: '#38bdf822', color: '#38bdf8', padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>
                          Abierta
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: '#71717a' }}>
                      Actualizado: {new Date(novel.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Acciones */}
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
                  setActiveLibraryNovelId(selectedNovel.id);
                  onOpenEditor();
                }}
                style={{ padding: '10px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
              >
                ✏️ Abrir en el Editor
              </button>

              <button
                onClick={() => {
                  setProject(selectedNovel.projectData);
                  setActiveLibraryNovelId(selectedNovel.id);
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
