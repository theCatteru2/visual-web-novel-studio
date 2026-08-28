import React, { useRef, useState, useEffect } from 'react';
import { useNovel } from '../context/NovelContext';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface NavbarProps {
  mode: 'home' | 'editor' | 'player' | 'community' | 'profile' | 'library';
  setMode: (mode: 'home' | 'editor' | 'player' | 'community' | 'profile' | 'library') => void;
  onOpenCharacterTree: () => void;
  onOpenPublishModal: () => void;
  onTriggerEditorPlay?: () => void;
}

export default function Navbar({
  mode,
  setMode,
  onOpenCharacterTree,
  onOpenPublishModal,
  onTriggerEditorPlay
}: NavbarProps) {
  const { 
    project, 
    setProject, 
    exportProjectJson, 
    importProjectJson, 
    startPlaytest,
    activeLibraryNovelId,
    resetProjectToDefault 
  } = useNovel();
  const { user, profile, loginWithGoogle, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isShortHeight, setIsShortHeight] = useState(window.innerHeight < 500);

  useEffect(() => {
    const handleResize = () => {
      setIsShortHeight(window.innerHeight < 500);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importProjectJson(content);
        if (ok) {
          alert('¡Proyecto importado con éxito en el editor!');
        } else {
          alert('Error al leer el archivo JSON.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Guardar cambios en la nube directamente desde la barra
  const handleSaveActiveNovel = async () => {
    if (!user) {
      alert('Tu proyecto está guardado en la memoria local del navegador. Inicia sesión para guardarlo en la nube.');
      return;
    }

    if (!activeLibraryNovelId) {
      alert('Este proyecto no proviene de tu biblioteca privada todavía. Ve a "📚 Biblioteca" para guardarlo en una casilla nueva.');
      return;
    }

    setIsSavingCloud(true);
    try {
      const scenes = (project as any).scenes || project.chapters?.[0]?.scenes || [];
      const cover = project.backgroundGallery?.[0]?.url || scenes[0]?.backgroundUrl || '';

      await updateDoc(doc(db, 'user_library', activeLibraryNovelId), {
        title: project.title || 'Novela sin título',
        description: project.description || '',
        coverUrl: cover,
        updatedAt: Date.now(),
        projectData: project
      });
      alert('¡Cambios guardados con éxito en tu biblioteca privada!');
    } catch (e: any) {
      console.error(e);
      alert('Error al guardar en la nube: ' + (e.message || 'Verifica tu conexión.'));
    } finally {
      setIsSavingCloud(false);
    }
  };

  // Crear novela desde cero con confirmación de seguridad
  const handleNewBlankNovel = () => {
    const confirmMsg = activeLibraryNovelId
      ? '¿Estás seguro de crear un proyecto nuevo? Asegúrate de haber guardado los cambios de la novela actual.'
      : '¿Deseas iniciar una novela en blanco desde cero? Se reiniciará el borrador actual.';

    if (window.confirm(confirmMsg)) {
      resetProjectToDefault();
      alert('Se ha creado un nuevo proyecto en blanco.');
    }
  };

  const handleStartPlay = () => {
    if (onTriggerEditorPlay) {
      onTriggerEditorPlay();
    } else {
      startPlaytest();
      setMode('player');
    }
  };

  return (
    <div style={{
      height: isShortHeight ? 38 : 48,
      minHeight: isShortHeight ? 38 : 48,
      background: '#09090e',
      borderBottom: '1px solid #1f1f2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 8px',
      color: '#fff',
      zIndex: 100,
      boxSizing: 'border-box',
      overflowX: 'auto',
      overflowY: 'hidden',
      whiteSpace: 'nowrap'
    }}>
      {/* Botón de Inicio + Título de la Novela */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 100, maxWidth: 220 }}>
        <button
          onClick={() => setMode('home')}
          title="Menú de Inicio"
          style={{
            background: mode === 'home' ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${mode === 'home' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 6,
            padding: '3px 6px',
            fontSize: isShortHeight ? 12 : 14,
            cursor: 'pointer'
          }}
        >
          🏠
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
          <input
            type="text"
            value={project.title}
            onChange={(e) => setProject(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Título de la novela..."
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px dashed rgba(255,255,255,0.2)',
              color: '#f3f4f6',
              fontWeight: 800,
              fontSize: isShortHeight ? 11 : 13,
              outline: 'none',
              width: '100%',
              padding: '1px 2px'
            }}
          />
          {activeLibraryNovelId && (
            <span style={{ fontSize: 8, color: '#38bdf8', fontWeight: 700, lineHeight: 1 }}>
              • Editando de Biblioteca
            </span>
          )}
        </div>
      </div>

      {/* Controles de Acción */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        
        {/* Crear Nueva Novela */}
        <button
          onClick={handleNewBlankNovel}
          title="Comenzar una novela desde cero"
          style={{
            padding: isShortHeight ? '4px 6px' : '6px 8px',
            background: '#161622',
            border: '1px solid #2d2d3f',
            color: '#38bdf8',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 700
          }}
        >
          ✨ <span style={{ display: isShortHeight || window.innerWidth < 640 ? 'none' : 'inline' }}>Nuevo</span>
        </button>

        {/* Guardar Cambios (Directo en la nube si está enlazado) */}
        <button
          onClick={handleSaveActiveNovel}
          disabled={isSavingCloud}
          title={activeLibraryNovelId ? "Guardar cambios en tu biblioteca" : "Guardado automático local activo"}
          style={{
            padding: isShortHeight ? '4px 8px' : '6px 10px',
            background: activeLibraryNovelId ? '#10b981' : '#161622',
            border: activeLibraryNovelId ? 'none' : '1px solid #2d2d3f',
            color: activeLibraryNovelId ? '#042f1f' : '#38bdf8',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 800
          }}
        >
          💾 {isSavingCloud ? 'Guardando...' : (activeLibraryNovelId ? 'Guardar Cambios' : 'Guardado Local')}
        </button>

        {/* Biblioteca Privada */}
        <button
          onClick={() => setMode('library')}
          title="Abrir Mi Biblioteca Privada"
          style={{
            padding: isShortHeight ? '4px 6px' : '6px 8px',
            background: mode === 'library' ? '#7c3aed' : '#161622',
            border: `1px solid ${mode === 'library' ? '#a855f7' : '#2d2d3f'}`,
            color: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 600
          }}
        >
          📚 <span style={{ display: isShortHeight || window.innerWidth < 640 ? 'none' : 'inline' }}>Biblioteca</span>
        </button>

        {/* Explorador de la Comunidad */}
        <button
          onClick={() => setMode('community')}
          title="Ver creaciones de la comunidad"
          style={{
            padding: isShortHeight ? '4px 6px' : '6px 8px',
            background: mode === 'community' ? '#2563eb' : '#161622',
            border: `1px solid ${mode === 'community' ? '#3b82f6' : '#2d2d3f'}`,
            color: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 600
          }}
        >
          🌐 <span style={{ display: isShortHeight || window.innerWidth < 640 ? 'none' : 'inline' }}>Comunidad</span>
        </button>

        {/* Publicar Novela */}
        <button
          onClick={onOpenPublishModal}
          title="Publicar novela en la comunidad"
          style={{
            padding: isShortHeight ? '4px 6px' : '6px 8px',
            background: '#a855f7',
            border: 'none',
            color: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 700
          }}
        >
          🚀 <span style={{ display: isShortHeight || window.innerWidth < 640 ? 'none' : 'inline' }}>Publicar</span>
        </button>

        {/* Personajes */}
        <button
          onClick={onOpenCharacterTree}
          title="Fichas y Vínculos de Personajes"
          style={{
            padding: isShortHeight ? '4px 6px' : '6px 8px',
            background: '#161622',
            border: '1px solid #2d2d3f',
            color: '#ddd',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 600
          }}
        >
          👥 <span style={{ display: isShortHeight || window.innerWidth < 480 ? 'none' : 'inline' }}>Personajes</span>
        </button>

        {/* Exportar JSON (Claramente identificado) */}
        <button
          onClick={exportProjectJson}
          title="Descargar copia de seguridad en archivo .json"
          style={{
            padding: isShortHeight ? '4px 6px' : '6px 8px',
            background: '#161622',
            border: '1px solid #2d2d3f',
            color: '#aaa',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 10
          }}
        >
          📥 <span style={{ display: isShortHeight || window.innerWidth < 640 ? 'none' : 'inline' }}>Exportar JSON</span>
        </button>

        {/* Importar JSON */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Cargar archivo .json en el editor"
          style={{
            padding: isShortHeight ? '4px 6px' : '6px 8px',
            background: '#161622',
            border: '1px solid #2d2d3f',
            color: '#aaa',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 10
          }}
        >
          📂
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          style={{ display: 'none' }}
        />

        {/* Conmutador Editor / Probar */}
        {mode === 'editor' ? (
          <button
            onClick={handleStartPlay}
            style={{
              padding: isShortHeight ? '4px 8px' : '6px 12px',
              background: '#10b981',
              color: '#052e16',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: 10,
              boxShadow: '0 0 10px rgba(16,185,129,0.4)'
            }}
          >
            ▶ PROBAR
          </button>
        ) : (
          <button
            onClick={() => setMode('editor')}
            style={{
              padding: isShortHeight ? '4px 8px' : '6px 10px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 10
            }}
          >
            ✏️ Editor
          </button>
        )}

        <div style={{ width: 1, height: 16, background: '#2d2d3f', margin: '0 2px' }} />

        {/* Cuenta de Usuario */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setMode('profile')}
              title="Ver y editar mi perfil"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: mode === 'profile' ? '#372254' : '#161622',
                border: `1px solid ${mode === 'profile' ? '#a855f7' : '#2d2d3f'}`,
                padding: '2px 4px',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#fff',
                fontSize: 10
              }}
            >
              <img 
                src={profile?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`} 
                alt="" 
                style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} 
              />
              <span style={{ maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.displayName || 'Perfil'}
              </span>
            </button>
            <button 
              onClick={logout} 
              title="Cerrar sesión"
              style={{ padding: '3px 5px', background: '#1c1c28', color: '#999', border: '1px solid #333', borderRadius: 4, cursor: 'pointer', fontSize: 9 }}
            >
              Salir
            </button>
          </div>
        ) : (
          <button 
            onClick={loginWithGoogle} 
            style={{ padding: isShortHeight ? '4px 6px' : '5px 8px', background: '#ea4335', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
          >
            Entrar
          </button>
        )}

      </div>
    </div>
  );
}
