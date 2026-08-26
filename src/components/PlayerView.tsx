import { useState } from 'react';
import { useNovel } from '../context/NovelContext';
import { MagneticSlot, VerticalSlot, CharacterScale, CharacterAnimation } from '../types';
import CharacterTreeModal from './CharacterTreeModal';

const SLOT_POSITIONS_X: Record<MagneticSlot, string> = {
  'left': '18%',
  'center-left': '34%',
  'center': '50%',
  'center-right': '66%',
  'right': '82%'
};

const SLOT_POSITIONS_Y: Record<VerticalSlot, string> = {
  'sink': '-12%',
  'floor': '0%',
  'ground': '10%',
  'elevated': '22%',
  'floating': '36%'
};

const SCALE_PERCENTAGES: Record<CharacterScale, string> = {
  'small': '50%',
  'medium': '70%',
  'large': '88%',
  'closeup': '105%'
};

export default function PlayerView() {
  const { project, gameState, advancePlayerEvent, selectChoiceOption } = useNovel();
  const [showCharModal, setShowCharModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const currentChapter = project.chapters.find(c => c.id === gameState.currentChapterId) || project.chapters[0];
  const currentScene = currentChapter?.scenes.find(s => s.id === gameState.currentSceneId) || currentChapter?.scenes[0];

  const timeline = gameState.currentBranchId === 'main'
    ? currentScene?.timeline
    : (currentScene?.branches?.[gameState.currentBranchId]?.timeline || []);

  const currentEvent = timeline?.[gameState.currentEventIndex];

  const speakerChar = currentEvent?.type === 'dialogue' && currentEvent.speakerId !== 'narrator'
    ? gameState.runtimeCharacters[currentEvent.speakerId] || project.characters[currentEvent.speakerId]
    : null;

  const handleScreenClick = () => {
    if (currentEvent?.type === 'choice' || showCharModal || showHistory) return;
    advancePlayerEvent();
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
        height: 'calc(100vh - 52px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050508',
        padding: 12,
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

      <div 
        onClick={handleScreenClick}
        style={{
          position: 'relative',
          height: 'calc(100vh - 84px)',
          maxHeight: '100%',
          aspectRatio: '16 / 9',
          backgroundImage: `url(${currentScene?.backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
          userSelect: 'none'
        }}
      >
        {/* Barra Superior */}
        <div 
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 40
          }}
        >
          {/* Variables y Afinidad en Pantalla */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.values(gameState.runtimeCharacters).map(char => (
              char.showAffinityBar && (
                <div 
                  key={char.id} 
                  style={{
                    background: 'rgba(15, 15, 20, 0.85)',
                    backdropFilter: 'blur(6px)',
                    padding: '4px 10px',
                    borderRadius: 20,
                    color: '#fff',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: `1px solid ${char.color}55`
                  }}
                >
                  <span>❤️</span>
                  <strong>{char.name}:</strong>
                  <span>{char.affinity}</span>
                </div>
              )
            ))}

            {/* Mostrar variables clave en juego */}
            {Object.entries(gameState.runtimeVariables).map(([k, v]) => (
              <div 
                key={k} 
                style={{
                  background: 'rgba(15, 15, 20, 0.85)',
                  backdropFilter: 'blur(6px)',
                  padding: '4px 8px',
                  borderRadius: 20,
                  color: '#38bdf8',
                  fontSize: 10,
                  border: '1px solid rgba(56,189,248,0.3)'
                }}
              >
                {k}: <strong style={{ color: '#fff' }}>{String(v)}</strong>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowHistory(prev => !prev); }}
              style={{
                background: 'rgba(20, 20, 28, 0.85)',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                cursor: 'pointer'
              }}
            >
              📜 Historial
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCharModal(true); }}
              style={{
                background: 'rgba(37, 99, 235, 0.85)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              👥 Personajes
            </button>
          </div>
        </div>

        {/* Múltiples Personajes con Brillos y Animaciones */}
        {currentEvent?.type === 'dialogue' && currentEvent.charactersOnStage?.map(inst => {
          const charDef = project.characters[inst.characterId];
          if (!charDef) return null;

          const slotX = SLOT_POSITIONS_X[inst.slot || 'center'];
          const slotY = SLOT_POSITIONS_Y[inst.verticalSlot || 'floor'];
          const scale = SCALE_PERCENTAGES[inst.scale || 'medium'];

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
              top: '15%',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              width: '85%',
              maxWidth: 440,
              zIndex: 30
            }}
          >
            <div style={{
              background: 'rgba(15, 15, 22, 0.95)',
              color: '#fff',
              padding: '10px 14px',
              borderRadius: 8,
              textAlign: 'center',
              fontSize: 14,
              border: '1px solid #3b82f6'
            }}>
              {currentEvent.prompt}
            </div>

            {currentEvent.options.map((option) => (
              <button
                key={option.id}
                onClick={(e) => {
                  e.stopPropagation();
                  selectChoiceOption(option.id);
                }}
                style={{
                  padding: '10px 16px',
                  background: '#1f1f2e',
                  color: '#fff',
                  border: '1px solid #4f46e5',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }}
              >
                {option.text}
              </button>
            ))}
          </div>
        )}

        {/* Diálogo */}
        {currentEvent?.type === 'dialogue' && (
          <div 
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '92%',
              background: 'rgba(10, 10, 15, 0.94)',
              backdropFilter: 'blur(8px)',
              border: `2px solid ${speakerChar?.color || '#3b82f6'}`,
              borderRadius: 12,
              padding: '12px 18px',
              color: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              zIndex: 20
            }}
          >
            <div style={{ 
              color: speakerChar?.color || '#fff', 
              fontWeight: 700, 
              fontSize: 16, 
              marginBottom: 4 
            }}>
              {currentEvent.speakerId === 'narrator' ? 'Narrador' : (speakerChar?.name || 'Personaje')}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.4, minHeight: 38, color: '#f3f4f6' }}>
              {currentEvent.text}
            </div>
          </div>
        )}

        {/* Historial */}
        {showHistory && (
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 50,
              right: 12,
              width: 300,
              maxHeight: '55%',
              background: '#121218f2',
              border: '1px solid #333',
              borderRadius: 8,
              padding: 12,
              overflowY: 'auto',
              zIndex: 50,
              color: '#ddd',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}
          >
            <div style={{ fontWeight: 700, borderBottom: '1px solid #333', paddingBottom: 4 }}>Registro de Diálogos</div>
            {gameState.history.length === 0 && <span style={{ color: '#666' }}>No hay diálogos previos.</span>}
            {gameState.history.map((line, idx) => (
              <div key={idx} style={{ lineHeight: 1.3 }}>{line}</div>
            ))}
          </div>
        )}
      </div>

      <CharacterTreeModal 
        isOpen={showCharModal} 
        onClose={() => setShowCharModal(false)} 
        isReadOnly={true}
      />
    </div>
  );
}