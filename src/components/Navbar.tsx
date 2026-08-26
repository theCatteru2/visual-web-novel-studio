import React, { useRef } from 'react';
import { useNovel } from '../context/NovelContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  mode: 'editor' | 'player' | 'community';
  setMode: (mode: 'editor' | 'player' | 'community') => void;
  onOpenCharacterTree: () => void;
  onOpenPublishModal: () => void;
}

export default function Navbar({ mode, setMode, onOpenCharacterTree, onOpenPublishModal }: NavbarProps) {
  const { project, exportProjectJson, importProjectJson, startPlaytest } = useNovel();
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
      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        <span style={{ fontSize: 16 }}>📖</span>
        <span style={{ fontWeight: 800, fontSize: 13, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
          {project.title || 'Studio Maker'}
        </span>
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
            <img 
              src={profile?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`} 
              alt="" 
              title={profile?.displayName || 'Mi Perfil'}
              style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #38bdf8' }} 
            />
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
