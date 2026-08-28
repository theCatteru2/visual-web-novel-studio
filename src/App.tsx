import { useState } from 'react';
import { NovelProvider } from './context/NovelContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import TimelineEditor from './components/TimelineEditor';
import PlayerView from './components/PlayerView';
import CharacterTreeModal from './components/CharacterTreeModal';
import PublishModal from './components/PublishModal';
import CommunityFeed from './components/CommunityFeed';
import HomeScreen from './components/HomeScreen';

function MainStudio() {
  const [mode, setMode] = useState<'home' | 'editor' | 'player' | 'community' | 'profile'>('home');
  const [isCharTreeOpen, setIsCharTreeOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
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
        onOpenPublishModal={() => setIsPublishOpen(true)}
      />

      {/* Vistas Principales */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {mode === 'home' && (
          <HomeScreen
            onOpenEditor={() => setMode('editor')}
            onStartTest={() => setMode('player')}
            onOpenCommunity={() => setMode('community')}
            onOpenProfile={() => setMode('profile')}
          />
        )}
        {mode === 'editor' && <TimelineEditor />}
        {mode === 'player' && <PlayerView />}
        {(mode === 'community' || mode === 'profile') && (
          <CommunityFeed 
            onPlayNovel={() => setMode('player')} 
            onOpenProfile={() => setMode('profile')}
          />
        )}
      </div>

      {/* Modales Flotantes */}
      <CharacterTreeModal 
        isOpen={isCharTreeOpen} 
        onClose={() => setIsCharTreeOpen(false)} 
        isReadOnly={false} 
      />

      <PublishModal 
        isOpen={isPublishOpen} 
        onClose={() => setIsPublishOpen(false)} 
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NovelProvider>
        <MainStudio />
      </NovelProvider>
    </AuthProvider>
  );
}
