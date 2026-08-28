import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { NovelProvider, useNovel } from './context/NovelContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import TimelineEditor from './components/TimelineEditor';
import PlayerView from './components/PlayerView';
import CharacterTreeModal from './components/CharacterTreeModal';
import PublishModal from './components/PublishModal';
import CommunityFeed from './components/CommunityFeed';
import HomeScreen from './components/HomeScreen';
import UserProfileView from './components/UserProfileView';
import MyLibraryView from './components/MyLibraryView';

function MainStudio() {
  const { setProject, startPlaytest } = useNovel();

  const [mode, setMode] = useState<'home' | 'editor' | 'player' | 'community' | 'profile' | 'library'>('home');
  const [isCharTreeOpen, setIsCharTreeOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const privateNovelId = params.get('privatePlay');
    if (privateNovelId) {
      getDoc(doc(db, 'user_library', privateNovelId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.projectData) {
            setProject(data.projectData);
            startPlaytest(undefined, true);
            setMode('player');
          }
        }
      }).catch(err => console.error('Error cargando enlace privado:', err));
    }
  }, []);

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
            onStartTest={() => {
              startPlaytest(undefined, true);
              setMode('player');
            }}
            onOpenCommunity={() => setMode('community')}
            onOpenProfile={() => setMode('profile')}
            onOpenLibrary={() => setMode('library')}
          />
        )}
        {mode === 'editor' && <TimelineEditor />}
        {mode === 'player' && <PlayerView />}
        {mode === 'community' && (
          <CommunityFeed 
            onPlayNovel={() => setMode('player')} 
            onOpenProfile={() => setMode('profile')}
          />
        )}
        {mode === 'profile' && (
          <UserProfileView 
            onBackToFeed={() => setMode('community')}
            onPlayNovel={() => setMode('player')}
          />
        )}
        {mode === 'library' && (
          <MyLibraryView
            onOpenEditor={() => setMode('editor')}
            onPlayNovel={() => setMode('player')}
            onOpenPublishModal={(proj) => {
              setProject(proj);
              setIsPublishOpen(true);
            }}
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
