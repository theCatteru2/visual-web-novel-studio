import { useState, useEffect } from 'react';
import { useNovel } from '../context/NovelContext';
import { MagneticSlot, VerticalSlot, CharacterScale, CharacterAnimation } from '../types';

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
  const [isMobilePortrait, setIsMobilePortrait] = useState(
    window.innerWidth < 768 && window.innerHeight > window.innerWidth
  );

  useEffect(() => {
    const handleResize = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const isSmall = window.innerWidth < 768 || (isPortrait && window.innerWidth < 900);
      setIsMobilePortrait(isSmall && isPortrait);
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

  const speakerChar = currentEvent?.type === 'dialogue' && currentEvent.speakerId !== 'narrator'
    ? gameState.runtimeCharacters[currentEvent.speakerId] || project.characters[currentEvent.speakerId]
    : null;

  const visibleVariables = Object.entries(gameState.runtimeVariables).filter(([key]) => {
    return project.variables?.[key]?.isVisibleInHUD === true;
  });

  const handleScreenClick = () => {
    if (currentEvent?.type === 'choice' || showHistory || askingName) return;
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
        justifyContent: isMobilePortrait ? 'flex-start' : 'center',
        background: '#09090e',
        padding: isMobilePortrait ? 6 : 12,
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

      {/* Contenedor del Lienzo */}
      <div 
        onClick={handleScreenClick}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isMobilePortrait ? '100%' : 'calc(100vw - 210px)',
          maxHeight: '100%',
          aspectRatio: '16 / 9',
          backgroundImage: `url(${effectiveBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
          borderRadius: isMobilePortrait ? 8 : 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
          userSelect: 'none',
          cursor: currentEvent?.type === 'dialogue' ? 'pointer' : 'default',
          flexShrink: 0
        }}
      >
        {/* Barra Superior */}
        <div 
          style={{
            position: 'absolute',
            top: isMobilePortrait ? 8 : 14,
            left: isMobilePortrait ? 8 : 16,
            right: isMobilePortrait ? 8 : 16,
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
                    padding: isMobilePortrait ? '2px 6px' : '4px 8px',
                    borderRadius: 20,
                    color: '#38bdf8',
                    fontSize: isMobilePortrait ? 9 : 11,
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

          <button
            onClick={(e) => { e.stopPropagation(); setShowHistory(prev => !prev); }}
            style={{
              background: 'rgba(20, 20, 28, 0.85)',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 6,
              padding: isMobilePortrait ? '3px 8px' : '6px 12px',
              fontSize: isMobilePortrait ? 10 : 12,
              cursor: 'pointer'
            }}
          >
            📜 {isMobilePortrait ? '' : 'Historial'}
          </button>
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
              top: isMobilePortrait ? '8%' : '12%',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobilePortrait ? 6 : 10,
              width: isMobilePortrait ? '92%' : '85%',
              maxWidth: 540,
              zIndex: 35
            }}
          >
            <div style={{
              background: 'rgba(15, 15, 22, 0.95)',
              color: '#fff',
              padding: isMobilePortrait ? '8px 12px' : '14px 18px',
              borderRadius: 8,
              textAlign: 'center',
              fontSize: isMobilePortrait ? 12 : 16,
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
                  padding: isMobilePortrait ? '8px 12px' : '14px 20px',
                  background: '#1f1f2e',
                  color: '#fff',
                  border: '1px solid #4f46e5',
                  borderRadius: 8,
                  fontSize: isMobilePortrait ? 11 : 15,
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
              bottom: isMobilePortrait ? 4 : 14,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '94%',
              background: 'rgba(10, 10, 15, 0.94)',
              backdropFilter: 'blur(10px)',
              border: `2px solid ${speakerChar?.color || '#3b82f6'}`,
              borderRadius: isMobilePortrait ? 8 : 14,
              padding: isMobilePortrait ? '6px 10px' : '14px 22px',
              color: '#fff',
              boxShadow: '0 10px 35px rgba(0,0,0,0.7)',
              zIndex: 30,
              boxSizing: 'border-box'
            }}
          >
            <div style={{ 
              color: speakerChar?.color || '#fff', 
              fontWeight: 800, 
              fontSize: isMobilePortrait ? 12 : 18, 
              marginBottom: isMobilePortrait ? 2 : 6,
              textShadow: '0 2px 4px rgba(0,0,0,0.6)'
            }}>
              {currentEvent.speakerId === 'narrator' ? 'Narrador' : (speakerChar?.name || 'Personaje')}
            </div>
            <div style={{ 
              fontSize: isMobilePortrait ? 11 : 16, 
              lineHeight: isMobilePortrait ? 1.3 : 1.5, 
              minHeight: isMobilePortrait ? 22 : 48, 
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
                padding: isMobilePortrait ? 16 : 24,
                width: '100%',
                maxWidth: 340,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: 20 }}>✍️</span>
              <strong style={{ color: '#fff', fontSize: isMobilePortrait ? 14 : 16 }}>¿Cómo te llamas?</strong>
              
              <input
                type="text"
                autoFocus
                value={tempPlayerName}
                onChange={e => setTempPlayerName(e.target.value)}
                placeholder="Nombre..."
                style={{
                  background: '#090910',
                  border: '1px solid #334155',
                  color: '#fff',
                  borderRadius: 6,
                  padding: isMobilePortrait ? '6px 10px' : '10px 14px',
                  fontSize: isMobilePortrait ? 13 : 15,
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
                  padding: isMobilePortrait ? '8px 12px' : '10px 16px',
                  fontSize: isMobilePortrait ? 12 : 14,
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
              top: isMobilePortrait ? 35 : 55,
              right: isMobilePortrait ? 8 : 16,
              width: isMobilePortrait ? 260 : 340,
              maxHeight: '65%',
              background: '#121218f2',
              border: '1px solid #333',
              borderRadius: 8,
              padding: 10,
              overflowY: 'auto',
              zIndex: 50,
              color: '#ddd',
              fontSize: isMobilePortrait ? 11 : 13,
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}
          >
            <div style={{ fontWeight: 800, borderBottom: '1px solid #333', paddingBottom: 4 }}>Registro de Diálogos</div>
            {gameState.history.length === 0 && <span style={{ color: '#666' }}>No hay diálogos previos.</span>}
            {gameState.history.map((line, idx) => (
              <div key={idx} style={{ lineHeight: 1.3 }}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
