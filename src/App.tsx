import { useState } from 'react';
import { NovelProvider } from './context/NovelContext';
import Navbar from './components/Navbar';
import TimelineEditor from './components/TimelineEditor';
import PlayerView from './components/PlayerView';
import CharacterTreeModal from './components/CharacterTreeModal';

function MainStudio() {
  const [mode, setMode] = useState<'editor' | 'player'>('editor');
  const [isCharTreeOpen, setIsCharTreeOpen] = useState(false);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#09090d'
    }}>
      {/* Barra de Navegación Global */}
      <Navbar 
        mode={mode} 
        setMode={setMode} 
        onOpenCharacterTree={() => setIsCharTreeOpen(true)} 
      />

      {/* Vista Activa */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {mode === 'editor' ? (
          <TimelineEditor />
        ) : (
          <PlayerView />
        )}
      </div>

      {/* Modal de Árbol de Personajes (Modo Creador) */}
      <CharacterTreeModal 
        isOpen={isCharTreeOpen} 
        onClose={() => setIsCharTreeOpen(false)} 
        isReadOnly={false} 
      />
    </div>
  );
}

export default function App() {
  return (
    <NovelProvider>
      <MainStudio />
    </NovelProvider>
  );
}