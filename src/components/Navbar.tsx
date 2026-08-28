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
  const { user, profile, loginWithGoogle } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isShortHeight, setIsShortHeight] = useState(window.innerHeight < 500);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setIsShortHeight(window.innerHeight < 500);
      setIsPortrait(window.innerHeight > window.innerWidth);
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
    <>
      {/* =========================================================
          BARRA SUPERIOR (Principal)
      ========================================================= */}
      <div style={{
        height: isShortHeight ? 38 : 46,
        minHeight: isShortHeight ? 38 : 46,
        background: '#09090e',
        borderBottom: '1px solid #1f1f2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        color: '#fff',
        zIndex: 100,
        boxSizing: 'border-box',
        overflowX: isPortrait ? 'hidden' : 'auto',
        overflowY: 'hidden',
        whiteSpace: 'nowrap'
      }}>
        {/* Inicio + Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, maxWidth: isPortrait ? 200 : 260 }}>
          <button
            onClick={() => setMode('home')}
            title="Menú de Inicio"
            style={{
              background: mode === 'home' ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${mode === 'home' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 6,
              padding: '3px 6px',
              fontSize: 12,
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
              placeholder="Título..."
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px dashed rgba(255,255,255,0.2)',
                color: '#f3f4f6',
                fontWeight: 800,
                fontSize: 12,
                outline: 'none',
                width: '100%',
                padding: '1px 2px'
              }}
            />
            {activeLibraryNovelId && (
              <span style={{ fontSize: 8, color: '#38bdf8', fontWeight: 700, lineHeight: 1 }}>
                • Biblioteca
              </span>
            )}
          </div>
        </div>

        {/* Botones de acción en la barra superior */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          
          {/* En PC / Landscape se muestran todas las herramientas arriba */}
          {!isPortrait && (
            <>
              <button
                onClick={handleNewBlankNovel}
                title="Comenzar una novela desde cero"
                style={{ padding: '5px 8px', background: '#161622', border: '1px solid #2d2d3f', color: '#38bdf8', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
              >
                ✨ Nuevo
              </button>

              <button
                onClick={handleSaveActiveNovel}
                disabled={isSavingCloud}
                title={activeLibraryNovelId ? "Guardar cambios en tu biblioteca" : "Guardado local activo"}
                style={{
                  padding: '5px 8px',
                  background: activeLibraryNovelId ? '#10b981' : '#161622',
                  border: activeLibraryNovelId ? 'none' : '1px solid #2d2d3f',
                  color: activeLibraryNovelId ? '#042f1f' : '#38bdf8',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 800
                }}
              >
                💾 {isSavingCloud ? 'Guardando...' : (activeLibraryNovelId ? 'Guardar' : 'Local')}
              </button>

              <button
                onClick={() => setMode('library')}
                title="Abrir Mi Biblioteca Privada"
                style={{
                  padding: '5px 8px',
                  background: mode === 'library' ? '#7c3aed' : '#161622',
                  border: `1px solid ${mode === 'library' ? '#a855f7' : '#2d2d3f'}`,
                  color: '#fff',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 600
                }}
              >
                📚 Biblioteca
              </button>

              <button
                onClick={() => setMode('community')}
                title="Ver creaciones de la comunidad"
                style={{
                  padding: '5px 8px',
                  background: mode === 'community' ? '#2563eb' : '#161622',
                  border: `1px solid ${mode === 'community' ? '#3b82f6' : '#2d2d3f'}`,
                  color: '#fff',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 600
                }}
              >
                🌐 Comunidad
              </button>

              <button
                onClick={onOpenPublishModal}
                title="Publicar novela en la comunidad"
                style={{ padding: '5px 8px', background: '#a855f7', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
              >
                🚀 Publicar
              </button>

              <button
                onClick={onOpenCharacterTree}
                title="Fichas y Vínculos de Personajes"
                style={{ padding: '5px 8px', background: '#161622', border: '1px solid #2d2d3f', color: '#ddd', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}
              >
                👥 Personajes
              </button>

              <button
                onClick={exportProjectJson}
                title="Descargar copia de seguridad en archivo .json"
                style={{ padding: '5px 8px', background: '#161622', border: '1px solid #2d2d3f', color: '#aaa', borderRadius: 6, cursor: 'pointer', fontSize: 10 }}
              >
                📥 Exportar
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Cargar archivo .json"
                style={{ padding: '5px 8px', background: '#161622', border: '1px solid #2d2d3f', color: '#aaa', borderRadius: 6, cursor: 'pointer', fontSize: 10 }}
              >
                📂
              </button>
            </>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />

          {/* Conmutador Editor / Probar (Siempre visible) */}
          {mode === 'editor' ? (
            <button
              onClick={handleStartPlay}
              style={{
                padding: '5px 10px',
                background: '#10b981',
                color: '#052e16',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: 11,
                boxShadow: '0 0 10px rgba(16,185,129,0.4)'
              }}
            >
              ▶ PROBAR
            </button>
          ) : (
            <button
              onClick={() => setMode('editor')}
              style={{
                padding: '5px 10px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 11
              }}
            >
              ✏️ Editor
            </button>
          )}

          {/* Cuenta de Usuario */}
          {user ? (
            <button
              onClick={() => setMode('profile')}
              title="Mi perfil"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: mode === 'profile' ? '#372254' : '#161622',
                border: `1px solid ${mode === 'profile' ? '#a855f7' : '#2d2d3f'}`,
                padding: '3px 6px',
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
              {!isPortrait && (
                <span style={{ maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.displayName || 'Perfil'}
                </span>
              )}
            </button>
          ) : (
            <button 
              onClick={loginWithGoogle} 
              style={{ padding: '4px 8px', background: '#ea4335', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
            >
              Entrar
            </button>
          )}

        </div>
      </div>

      {/* =========================================================
          BARRA INFERIOR FLOTANTE (Solo visible en Móvil Portrait)
      ========================================================= */}
      {isPortrait && mode !== 'player' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 48,
          background: 'rgba(9, 9, 14, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid #1f1f2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 8px',
          zIndex: 90,
          boxSizing: 'border-box'
        }}>
          {/* Biblioteca */}
          <button
            onClick={() => setMode('library')}
            style={{
              background: 'none',
              border: 'none',
              color: mode === 'library' ? '#a855f7' : '#888',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: 700
            }}
          >
            <span style={{ fontSize: 16 }}>📚</span>
            <span>Biblioteca</span>
          </button>

          {/* Comunidad */}
          <button
            onClick={() => setMode('community')}
            style={{
              background: 'none',
              border: 'none',
              color: mode === 'community' ? '#38bdf8' : '#888',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: 700
            }}
          >
            <span style={{ fontSize: 16 }}>🌐</span>
            <span>Comunidad</span>
          </button>

          {/* Guardar Cambios / Nube */}
          <button
            onClick={handleSaveActiveNovel}
            disabled={isSavingCloud}
            style={{
              background: 'none',
              border: 'none',
              color: activeLibraryNovelId ? '#10b981' : '#888',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: 700
            }}
          >
            <span style={{ fontSize: 16 }}>💾</span>
            <span>{isSavingCloud ? 'Guardando' : (activeLibraryNovelId ? 'Guardar' : 'Local')}</span>
          </button>

          {/* Personajes */}
          <button
            onClick={onOpenCharacterTree}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: 700
            }}
          >
            <span style={{ fontSize: 16 }}>👥</span>
            <span>Personajes</span>
          </button>

          {/* Publicar */}
          <button
            onClick={onOpenPublishModal}
            style={{
              background: 'none',
              border: 'none',
              color: '#c084fc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: 700
            }}
          >
            <span style={{ fontSize: 16 }}>🚀</span>
            <span>Publicar</span>
          </button>
        </div>
      )}
    </>
  );
}
