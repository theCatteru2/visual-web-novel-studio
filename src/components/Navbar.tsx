import React, { useRef } from 'react';
import { useNovel } from '../context/NovelContext';

interface NavbarProps {
  mode: 'editor' | 'player';
  setMode: (mode: 'editor' | 'player') => void;
  onOpenCharacterTree: () => void;
}

export default function Navbar({ mode, setMode, onOpenCharacterTree }: NavbarProps) {
  const { project, exportProjectJson, importProjectJson, startPlaytest } = useNovel();
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
        <span style={{ fontWeight: 800, fontSize: 13, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
          {project.title || 'Studio Maker'}
        </span>
      </div>

      {/* Controles de Acción Rápidos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        
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

        {/* Botón de Play / Volver */}
        {mode === 'player' ? (
          <button
            onClick={() => setMode('editor')}
            style={{
              padding: '6px 12px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 12
            }}
          >
            ✏️ Editor
          </button>
        ) : (
          <button
            onClick={handleStartPlay}
            style={{
              padding: '6px 14px',
              background: '#10b981',
              color: '#052e16',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: 12,
              boxShadow: '0 0 12px rgba(16,185,129,0.4)'
            }}
          >
            ▶ PROBAR
          </button>
        )}
      </div>
    </div>
  );
}
