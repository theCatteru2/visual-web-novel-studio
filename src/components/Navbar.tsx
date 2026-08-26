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
          alert('¡Proyecto cargado exitosamente!');
        } else {
          alert('Error al leer el archivo JSON.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleStartPlay = () => {
    startPlaytest();
    setMode('player');
  };

  return (
    <div style={{
      height: 52,
      background: '#0e0e14',
      borderBottom: '1px solid #272736',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      color: '#fff',
      zIndex: 100
    }}>
      {/* Título de la Novela */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>📖</span>
        <span style={{ fontWeight: 'bold', fontSize: 15, color: '#f3f4f6' }}>
          {project.title || 'Visual Web Novel Studio'}
        </span>
      </div>

      {/* Controles de Acción y Modos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        
        {/* Modal de Personajes */}
        <button
          onClick={onOpenCharacterTree}
          style={{
            padding: '6px 12px',
            background: '#1f1f2e',
            border: '1px solid #3d3d52',
            color: '#ddd',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13
          }}
        >
          👥 Personajes y Lore
        </button>

        {/* Exportar e Importar JSON */}
        <button
          onClick={exportProjectJson}
          title="Guardar archivo .json en tu disco"
          style={{
            padding: '6px 10px',
            background: '#1f1f2e',
            border: '1px solid #3d3d52',
            color: '#aaa',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          💾 Exportar
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Cargar archivo .json guardado"
          style={{
            padding: '6px 10px',
            background: '#1f1f2e',
            border: '1px solid #3d3d52',
            color: '#aaa',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          📂 Importar
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          style={{ display: 'none' }}
        />

        <div style={{ width: 1, height: 24, background: '#333', margin: '0 4px' }} />

        {/* Conmutador Editor / Juego */}
        {mode === 'player' ? (
          <button
            onClick={() => setMode('editor')}
            style={{
              padding: '6px 14px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 13
            }}
          >
            ✏️ Volver al Editor
          </button>
        ) : (
          <button
            onClick={handleStartPlay}
            style={{
              padding: '6px 14px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 13
            }}
          >
            ▶️ Probar Novela
          </button>
        )}

      </div>
    </div>
  );
}