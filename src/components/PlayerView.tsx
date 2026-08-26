import { useState } from 'react';
import { useNovel } from '../context/NovelContext';
import { MagneticSlot, VerticalSlot, CharacterScale, CharacterAnimation } from '../types';
import CharacterTreeModal from './CharacterTreeModal';

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
        height: 'calc(100vh - 48px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090e',
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

      {/* Contenedor con tamaño idéntico al Editor */}
      <div 
        onClick={handleScreenClick}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 'calc(100vw - 210px)',
          maxHeight: '100%',
          aspectRatio: '16 / 9',
          backgroundImage: `url(${currentScene?.backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
          userSelect: 'none',
          cursor: currentEvent?.type === 'dialogue' ? 'pointer' : 'default'
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
          {/* Afinidad y Estados del Mundo */}
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
              top: '12%',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              width: '88%',
              maxWidth: 480,
              zIndex: 35
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
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '94%',
              background: 'rgba(10, 10, 15, 0.94)',
              backdropFilter: 'blur(8px)',
              border: `2px solid ${speakerChar?.color || '#3b82f6'}`,
              borderRadius: 12,
              padding: '8px 12px',
              color: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              zIndex: 30,
              boxSizing: 'border-box'
            }}
          >
            <div style={{ 
              color: speakerChar?.color || '#fff', 
              fontWeight: 700, 
              fontSize: 13, 
              marginBottom: 4 
            }}>
              {currentEvent.speakerId === 'narrator' ? 'Narrador' : (speakerChar?.name || 'Personaje')}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.3, minHeight: 32, color: '#f3f4f6' }}>
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
