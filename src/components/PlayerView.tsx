import { useState, useEffect, useRef } from 'react';
import { useNovel } from '../context/NovelContext';
import { MagneticSlot, VerticalSlot, CharacterScale, CharacterAnimation } from '../types';
import SaveLoadModal from './SaveLoadModal';

const SLOT_POSITIONS_X: Record<MagneticSlot, string> = {
  'far-left': '12%',
  'left': '25%',
  'center-left': '38%',
  'center': '50%',
  'center-right': '62%',
  'right': '75%',
  'far-right': '88%'
};

const SLOT_POSITIONS_Y: Record<VerticalSlot, string> = {
  'deep_sink': '-25%',
  'sink': '-12%',
  'floor': '0%',
  'ground': '12%',
  'elevated': '24%',
  'floating': '36%',
  'sky': '48%'
};

const SCALE_PERCENTAGES: Record<CharacterScale, string> = {
  'small': '48%',
  'medium': '68%',
  'large': '88%',
  'closeup': '108%'
};

export default function PlayerView() {
  const { project, gameState, advancePlayerEvent, selectChoiceOption, parseTextTokens, setPlayerName } = useNovel();
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const sfxAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const [askingName, setAskingName] = useState(Boolean(project.askPlayerName && gameState.currentEventIndex === 0 && gameState.history.length === 0));
  const [tempPlayerName, setTempPlayerName] = useState(gameState.playerName || project.defaultPlayerName || '');

  const currentChapter = project.chapters.find(c => c.id === gameState.currentChapterId) || project.chapters[0];
  const currentScene = currentChapter?.scenes.find(s => s.id === gameState.currentSceneId) || currentChapter?.scenes[0];

  const timeline = gameState.currentBranchId === 'main'
    ? currentScene?.timeline
    : (currentScene?.branches?.[gameState.currentBranchId]?.timeline || []);

  const currentEvent = timeline?.[gameState.currentEventIndex];
  const effectiveBgUrl = currentEvent?.backgroundUrl || currentScene?.backgroundUrl;

  useEffect(() => {
    const eventBgm = currentEvent?.bgmUrl;
    if (eventBgm === 'stop') {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current.src = '';
      }
    } else if (eventBgm && eventBgm !== bgmAudioRef.current?.src) {
      if (!bgmAudioRef.current) {
        bgmAudioRef.current = new Audio(eventBgm);
        bgmAudioRef.current.loop = true;
      } else {
        bgmAudioRef.current.src = eventBgm;
      }
      bgmAudioRef.current.play().catch(() => {});
    }

    if (currentEvent?.sfxUrl) {
      if (!sfxAudioRef.current) {
        sfxAudioRef.current = new Audio(currentEvent.sfxUrl);
      } else {
        sfxAudioRef.current.src = currentEvent.sfxUrl;
      }
      sfxAudioRef.current.currentTime = 0;
      sfxAudioRef.current.play().catch(() => {});
    }
  }, [gameState.currentEventIndex, gameState.currentSceneId, gameState.currentBranchId]);

  useEffect(() => {
    return () => {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current = null;
      }
      if (sfxAudioRef.current) {
        sfxAudioRef.current.pause();
        sfxAudioRef.current = null;
      }
    };
  }, []);

  const speakerChar = currentEvent?.type === 'dialogue' && currentEvent.speakerId !== 'narrator'
    ? gameState.runtimeCharacters[currentEvent.speakerId] || project.characters[currentEvent.speakerId]
    : null;

  const visibleVariables = Object.entries(gameState.runtimeVariables).filter(([key]) => {
    return project.variables?.[key]?.isVisibleInHUD === true;
  });

  const handleScreenClick = () => {
    if (currentEvent?.type === 'choice' || showHistory || showSaveLoad || askingName) return;
    advancePlayerEvent();
  };

  const handleConfirmName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempPlayerName.trim()) {
      setPlayerName(tempPlayerName.trim());
    }
    setAskingName(false);
  };

  const getAnimationKeyframes = (anim: CharacterAnimation | undefined) => {
    switch (anim) {
      case 'bounce':
        return 'jumpAnim 0.4s ease-out';
      case 'shake':
        return 'shakeAnim 0.3s ease-in-out';
      case 'fade_in':
        return 'fadeInAnim 0.5s ease-out';
      case 'slide_in':
        return 'slideInAnim 0.4s ease-out';
      default:
        return 'none';
    }
  };

  return (
    <div 
      style={{
        position: 'relative',
        width: '100vw',
        height: 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090e',
        padding: 16,
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes jumpAnim {
          0% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -25px); }
          100% { transform: translate(-50%, 0); }
        }
        @keyframes shakeAnim {
          0%, 100% { transform: translate(-50%, 0); }
          25% { transform: translate(-55%, 0); }
          75% { transform: translate(-45%, 0); }
        }
        @keyframes fadeInAnim {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes slideInAnim {
          0% { transform: translate(-70%, 0); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>

      {/* Contenedor del Lienzo unificado en tamaño grande para PC */}
      <div 
        onClick={handleScreenClick}
        style={{
          position: 'relative',
          width: isPortrait ? '100%' : 'calc((100vh - 80px) * 16 / 9)',
          height: isPortrait ? 'auto' : 'calc(100vh - 80px)',
          maxWidth: isPortrait ? '100%' : 'calc((100vh - 80px) * 16 / 9)',
          maxHeight: 'calc(100vh - 80px)',
          aspectRatio: '16 / 9',
          backgroundImage: `url(${effectiveBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
          borderRadius: 14,
          boxShadow: '0 25px 70px rgba(0,0,0,0.85)',
          border: '1px solid rgba(255,255,255,0.15)',
          userSelect: 'none',
          cursor: currentEvent?.type === 'dialogue' ? 'pointer' : 'default',
          flexShrink: 0
        }}
      
      >
        {/* Barra Superior */}
        <div 
          style={{
            position: 'absolute',
            top: 12,
            left: 16,
            right: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 40
          }}
        >
          {visibleVariables.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {visibleVariables.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    background: 'rgba(15, 15, 20, 0.85)',
                    backdropFilter: 'blur(6px)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    color: '#38bdf8',
                    fontSize: 11,
                    border: '1px solid rgba(56,189,248,0.3)'
                  }}
                >
                  {k}: <strong style={{ color: '#fff' }}>{String(v)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowSaveLoad(true); }}
              style={{
                background: 'rgba(16, 185, 129, 0.9)',
                color: '#052e16',
                border: 'none',
                borderRadius: 6,
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              💾 Guardar / Cargar
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setShowHistory(prev => !prev); }}
              style={{
                background: 'rgba(20, 20, 28, 0.9)',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: 6,
                padding: '5px 12px',
                fontSize: 11,
                cursor: 'pointer'
              }}
            >
              📜 Historial
            </button>
          </div>
        </div>

        {/* Personajes en Escena */}
        {currentEvent?.type === 'dialogue' && currentEvent.charactersOnStage?.map(inst => {
          const charDef = project.characters[inst.characterId];
          if (!charDef) return null;

          const slotX = SLOT_POSITIONS_X[inst.slot || 'center'] || '50%';
          const slotY = SLOT_POSITIONS_Y[inst.verticalSlot || 'floor'] || '0%';
          const scale = SCALE_PERCENTAGES[inst.scale || 'medium'] || '68%';

          return (
            <div
              key={inst.characterId}
              style={{
                position: 'absolute',
                bottom: slotY,
                left: slotX,
                transform: 'translateX(-50%)',
                transition: 'all 0.2s ease',
                pointerEvents: 'none',
                zIndex: 10,
                height: scale,
                filter: `brightness(${inst.brightness / 100}) drop-shadow(0 8px 16px rgba(0,0,0,0.5))`,
                animation: getAnimationKeyframes(inst.animation)
              }}
            >
              <img 
                src={charDef.expressions[inst.expression] || charDef.avatarUrl} 
                alt={charDef.name}
                draggable={false}
                style={{ height: '100%', width: 'auto', objectFit: 'contain' }}
              />
            </div>
          );
        })}

        {/* Decisiones */}
        {currentEvent?.type === 'choice' && (
          <div 
            style={{
              position: 'absolute',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              width: '90%',
              maxWidth: 540,
              zIndex: 35
            }}
          >
            <div style={{
              background: 'rgba(15, 15, 22, 0.95)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: 8,
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 800,
              border: '1.5px solid #3b82f6'
            }}>
              {parseTextTokens(currentEvent.prompt)}
            </div>

            {currentEvent.options.map((option) => (
              <button
                key={option.id}
                onClick={(e) => {
                  e.stopPropagation();
                  selectChoiceOption(option.id);
                }}
                style={{
                  padding: '10px 18px',
                  background: '#1f1f2e',
                  color: '#fff',
                  border: '1px solid #4f46e5',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
                }}
              >
                {parseTextTokens(option.text)}
              </button>
            ))}
          </div>
        )}

        {/* Caja de Diálogo */}
        {currentEvent?.type === 'dialogue' && (
          <div 
            style={{
              position: 'absolute',
              bottom: 14,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '95%',
              background: 'rgba(10, 10, 15, 0.94)',
              backdropFilter: 'blur(10px)',
              border: `1.5px solid ${speakerChar?.color || '#3b82f6'}`,
              borderRadius: 10,
              padding: '10px 16px',
              color: '#fff',
              boxShadow: '0 10px 35px rgba(0,0,0,0.7)',
              zIndex: 30,
              boxSizing: 'border-box'
            }}
          >
            <div style={{ 
              color: speakerChar?.color || '#fff', 
              fontWeight: 800, 
              fontSize: 14, 
              marginBottom: 4,
              textShadow: '0 2px 4px rgba(0,0,0,0.6)'
            }}>
              {currentEvent.speakerId === 'narrator' ? 'Narrador' : (speakerChar?.name || 'Personaje')}
            </div>
            <div style={{ 
              fontSize: 13, 
              lineHeight: 1.4, 
              minHeight: 26, 
              color: '#f3f4f6' 
            }}>
              {parseTextTokens(currentEvent.text)}
            </div>
          </div>
        )}

        {/* Modal de Nombre */}
        {askingName && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(5, 5, 10, 0.88)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12
          }}>
            <form 
              onSubmit={handleConfirmName}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#13131f',
                border: '2px solid #38bdf8',
                borderRadius: 12,
                padding: 20,
                width: '100%',
                maxWidth: 360,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: 24 }}>✍️</span>
              <strong style={{ color: '#fff', fontSize: 16 }}>¿Cómo te llamas?</strong>
              
              <input
                type="text"
                autoFocus
                value={tempPlayerName}
                onChange={e => setTempPlayerName(e.target.value)}
                placeholder="Nombre..."
                style={{
                  background: '#090910',
                  border: '1px solid #333',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 14,
                  textAlign: 'center',
                  fontWeight: 700
                }}
              />

              <button
                type="submit"
                style={{
                  background: '#38bdf8',
                  color: '#000',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Comenzar Historia
              </button>
            </form>
          </div>
        )}

        {/* Historial */}
        {showHistory && (
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 50,
              right: 16,
              width: 300,
              maxHeight: '65%',
              background: '#121218f2',
              border: '1px solid #444',
              borderRadius: 8,
              padding: 12,
              overflowY: 'auto',
              zIndex: 50,
              color: '#ddd',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ fontWeight: 800, borderBottom: '1px solid #444', paddingBottom: 6 }}>Registro de Diálogos</div>
            {gameState.history.length === 0 && <span style={{ color: '#666' }}>No hay diálogos previos.</span>}
            {gameState.history.map((line, idx) => (
              <div key={idx} style={{ lineHeight: 1.4 }}>{line}</div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Guardar / Cargar Partida */}
      <SaveLoadModal
        isOpen={showSaveLoad}
        mode="save"
        onClose={() => setShowSaveLoad(false)}
      />
    </div>
  );
}