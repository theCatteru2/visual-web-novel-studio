import React, { useRef } from 'react';
import { useNovel } from '../context/NovelContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  mode: 'editor' | 'player' | 'community' | 'profile';
  setMode: (mode: 'editor' | 'player' | 'community' | 'profile') => void;
  onOpenCharacterTree: () => void;
  onOpenPublishModal: () => void;
}

export default function Navbar({ mode, setMode, onOpenCharacterTree, onOpenPublishModal }: NavbarProps) {
  const { project, setProject, exportProjectJson, importProjectJson, startPlaytest } = useNovel();
  const { user, profile, loginWithGoogle, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importProjectJson(content);
        if (ok) {
          alert('¡Proyecto cargado con éxito!');
        } else {
          alert('Error al leer el archivo JSON.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleStartPlay = () => {
    startPlaytest();
    setMode('player');
  };

  return (
    <div style={{
      height: 48,
      background: '#09090e',
      borderBottom: '1px solid #1f1f2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 10px',
      color: '#fff',
      zIndex: 100,
      boxSizing: 'border-box'
    }}>
      {/* Título Editable de la Novela */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, maxWidth: 220 }}>
        <span style={{ fontSize: 16 }}>📖</span>
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
            fontSize: 13,
            outline: 'none',
            width: '100%',
            padding: '2px 4px'
          }}
        />
      </div>

      {/* Controles de Acción Rápidos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        
        {/* Explorador de la Comunidad */}
        <button
          onClick={() => setMode('community')}
          title="Ver creaciones de la comunidad"
          style={{
            padding: '6px 8px',
            background: mode === 'community' ? '#2563eb' : '#161622',
            border: `1px solid ${mode === 'community' ? '#3b82f6' : '#2d2d3f'}`,
            color: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600
          }}
        >
          🌐 <span style={{ display: window.innerWidth < 640 ? 'none' : 'inline' }}>Comunidad</span>
        </button>

        {/* Publicar Novela */}
        <button
          onClick={onOpenPublishModal}
          title="Publicar novela en el feed comunitario"
          style={{
            padding: '6px 8px',
            background: '#7c3aed',
            border: 'none',
            color: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700
          }}
        >
          🚀 <span style={{ display: window.innerWidth < 640 ? 'none' : 'inline' }}>Publicar</span>
        </button>

        {/* Personajes */}
        <button
          onClick={onOpenCharacterTree}
          title="Fichas y Vínculos de Personajes"
          style={{
            padding: '6px 8px',
            background: '#161622',
            border: '1px solid #2d2d3f',
            color: '#ddd',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600
          }}
        >
          👥 <span style={{ display: window.innerWidth < 480 ? 'none' : 'inline' }}>Personajes</span>
        </button>

        {/* Exportar JSON */}
        <button
          onClick={exportProjectJson}
          title="Guardar archivo .json"
          style={{
            padding: '6px 8px',
            background: '#161622',
            border: '1px solid #2d2d3f',
            color: '#aaa',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11
          }}
        >
          💾
        </button>

        {/* Importar JSON */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Abrir archivo .json"
          style={{
            padding: '6px 8px',
            background: '#161622',
            border: '1px solid #2d2d3f',
            color: '#aaa',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11
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
              padding: '6px 12px',
              background: '#10b981',
              color: '#052e16',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: 11,
              boxShadow: '0 0 12px rgba(16,185,129,0.4)'
            }}
          >
            ▶ PROBAR
          </button>
        ) : (
          <button
            onClick={() => setMode('editor')}
            style={{
              padding: '6px 10px',
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

        <div style={{ width: 1, height: 18, background: '#2d2d3f', margin: '0 2px' }} />

        {/* Cuenta de Usuario / Iniciar Sesión */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <button
              onClick={() => setMode('profile')}
              title="Ver y editar mi perfil"
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
                fontSize: 11
              }}
            >
              <img 
                src={profile?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`} 
                alt="" 
                style={{ width: 18, height: 18, borderRadius: '50%' }} 
              />
              <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.displayName || 'Perfil'}
              </span>
            </button>
            <button 
              onClick={logout} 
              title="Cerrar sesión"
              style={{ padding: '4px 6px', background: '#1c1c28', color: '#999', border: '1px solid #333', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}
            >
              Salir
            </button>
          </div>
        ) : (
          <button 
            onClick={loginWithGoogle} 
            style={{ padding: '5px 8px', background: '#ea4335', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
          >
            Entrar
          </button>
        )}

      </div>
    </div>
  );
}
