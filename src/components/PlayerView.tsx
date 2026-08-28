import React, { useState, useEffect, useRef } from 'react';
import { useNovel } from '../context/NovelContext';
import { 
  MagneticSlot, 
  VerticalSlot, 
  CharacterScale, 
  CharacterAnimation,
  StageCharacterInstance,
  ChoiceOption 
} from '../types';
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
  const { project, gameState, advancePlayerEvent, selectChoiceOption, parseTextTokens, setPlayerName, startPlaytest } = useNovel();
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [isLargeScreenMode, setIsLargeScreenMode] = useState(false);

  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const sfxAudioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const [askingName, setAskingName] = useState(false);
  const [tempPlayerName, setTempPlayerName] = useState(gameState.playerName || project.defaultPlayerName || '');

  useEffect(() => {
    if (project.askPlayerName && !gameState.playerName && gameState.currentEventIndex === 0 && gameState.history.length === 0) {
      setAskingName(true);
    }
  }, []);

  useEffect(() => {
    if (!gameState.currentSceneId) {
      startPlaytest();
    }
  }, [gameState.currentSceneId]);

  const scenesList = (project as any).scenes || project.chapters?.[0]?.scenes || [];
  const currentScene = scenesList.find((s: any) => s.id === gameState.currentSceneId) || scenesList[0];

  const timeline = gameState.currentBranchId === 'main'
    ? (currentScene?.timeline || [])
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

  const visibleVariables = Object.entries(gameState.runtimeVariables || {}).filter(([key]) => {
    return project.variables?.[key]?.isVisibleInHUD === true;
  });

  const handleScreenClick = () => {
    if (showHistory || showSaveLoad || askingName) return;
    if (currentEvent?.type === 'choice') return;
    advancePlayerEvent();
  };

  const handleConfirmName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempPlayerName.trim()) {
      setPlayerName(tempPlayerName.trim());
    }
    setAskingName(false);
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
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
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: 'calc(100dvh - 48px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#040407',
        padding: isPortrait ? 0 : 4,
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

        /* Diseño estándar para PC y pantallas grandes */
        .vn-dialog-box {
          padding: 14px 24px;
          bottom: 14px;
          min-height: 85px;
        }
        .vn-dialog-title {
          font-size: 16px;
          margin-bottom: 4px;
        }
        .vn-dialog-text {
          font-size: 16px;
          line-height: 1.45;
        }

        /* Ajuste compacto para móviles en vertical (portrait) */
        @media (max-width: 640px) and (orientation: portrait) {
          .vn-dialog-box {
            padding: 8px 12px !important;
            bottom: 6px !important;
            min-height: 58px !important;
          }
          .vn-dialog-title {
            font-size: 13px !important;
            margin-bottom: 2px !important;
          }
          .vn-dialog-text {
            font-size: 12px !important;
            line-height: 1.35 !important;
          }
        }

        /* Ajuste compacto para móviles en horizontal / landscape */
        @media (max-height: 520px) and (orientation: landscape) {
          .vn-dialog-box {
            padding: 6px 14px !important;
            bottom: 4px !important;
            min-height: 54px !important;
          }
          .vn-dialog-title {
            font-size: 12px !important;
            margin-bottom: 1px !important;
          }
          .vn-dialog-text {
            font-size: 11px !important;
            line-height: 1.25 !important;
          }
          .vn-choice-container {
            top: 4% !important;
            gap: 4px !important;
          }
        }
      `}</style>

      {/* Lienzo del Juego */}
      <div 
        onClick={handleScreenClick}
        style={{
          position: 'relative',
          width: isPortrait ? '100%' : 'auto',
          height: isPortrait ? 'auto' : '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: '16 / 9',
          backgroundImage: effectiveBgUrl ? `url(${effectiveBgUrl})` : undefined,
          backgroundColor: '#0c0c14',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
          borderRadius: isPortrait ? 0 : 8,
          boxShadow: '0 10px 40px rgba(0,0,0,0.85)',
          border: isPortrait ? 'none' : '1px solid rgba(255,255,255,0.12)',
          userSelect: 'none',
          cursor: currentEvent ? 'pointer' : 'default',
          flexShrink: 0
        }}
      >
        {/* Barra Superior con Controles */}
        <div 
          style={{
            position: 'absolute',
            top: isPortrait ? 6 : 8,
            left: isPortrait ? 6 : 10,
            right: isPortrait ? 6 : 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 40
          }}
        >
          {visibleVariables.length > 0 ? (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {visibleVariables.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    background: 'rgba(15, 15, 20, 0.85)',
                    backdropFilter: 'blur(6px)',
                    padding: '2px 8px',
                    borderRadius: 14,
                    color: '#38bdf8',
                    fontSize: 10,
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

          <div style={{ display: 'flex', gap: 5 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowSaveLoad(true); }}
              title="Guardar / Cargar Partida"
              style={{
                background: 'rgba(16, 185, 129, 0.9)',
                color: '#052e16',
                border: 'none',
                borderRadius: 6,
                padding: isPortrait ? '3px 7px' : '4px 9px',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              💾 <span style={{ display: isPortrait ? 'none' : 'inline' }}>Guardar/Cargar</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setShowHistory(prev => !prev); }}
              title="Historial de Diálogos"
              style={{
                background: 'rgba(20, 20, 28, 0.85)',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: 6,
                padding: isPortrait ? '3px 7px' : '4px 9px',
                fontSize: 10,
                cursor: 'pointer'
              }}
            >
              📜 <span style={{ display: isPortrait ? 'none' : 'inline' }}>Historial</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLargeScreenMode(prev => !prev);
                toggleFullScreen();
              }}
              title="Pantalla Completa"
              style={{
                background: isLargeScreenMode ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)',
                color: isLargeScreenMode ? '#000' : '#38bdf8',
                border: '1px solid #38bdf8',
                borderRadius: 6,
                padding: isPortrait ? '3px 7px' : '4px 8px',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⛶
            </button>
          </div>
        </div>

        {/* Personajes en Escena */}
        {currentEvent?.type === 'dialogue' && currentEvent.charactersOnStage?.map((inst: StageCharacterInstance) => {
          const charDef = project.characters[inst.characterId];
          if (!charDef) return null;

          const slotX = SLOT_POSITIONS_X[inst.slot as MagneticSlot] || '50%';
          const slotY = SLOT_POSITIONS_Y[inst.verticalSlot as VerticalSlot] || '0%';
          const scale = SCALE_PERCENTAGES[inst.scale as CharacterScale] || '68%';

          const resolvedSprite = charDef.expressions[inst.expression] 
            || Object.values(charDef.expressions || {})[0] 
            || charDef.avatarUrl;

          return (
            <div
              key={`${inst.characterId}_evt_${gameState.currentEventIndex}_${inst.animation || 'none'}`}
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
                src={resolvedSprite} 
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
            className="vn-choice-container"
            style={{
              position: 'absolute',
              top: '8%',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              width: '92%',
              maxWidth: 520,
              zIndex: 35
            }}
          >
            <div style={{
              background: 'rgba(15, 15, 22, 0.96)',
              color: '#fff',
              padding: isPortrait ? '6px 10px' : '8px 14px',
              borderRadius: 8,
              textAlign: 'center',
              fontSize: isPortrait ? 12 : 13,
              fontWeight: 800,
              border: '1.5px solid #3b82f6'
            }}>
              {parseTextTokens(currentEvent.prompt)}
            </div>

            {currentEvent.options.map((option: ChoiceOption) => (
              <button
                key={option.id}
                onClick={(e) => {
                  e.stopPropagation();
                  selectChoiceOption(option.id);
                }}
                style={{
                  padding: isPortrait ? '8px 12px' : '10px 16px',
                  background: '#1f1f2e',
                  color: '#fff',
                  border: '1px solid #4f46e5',
                  borderRadius: 8,
                  fontSize: isPortrait ? 11 : 12,
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
            className="vn-dialog-box"
            onClick={handleScreenClick}
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              width: isPortrait ? '96%' : '94%',
              background: 'rgba(8, 8, 14, 0.94)',
              backdropFilter: 'blur(12px)',
              border: `2px solid ${speakerChar?.color || '#3b82f6'}`,
              borderRadius: 12,
              color: '#fff',
              boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
              zIndex: 30,
              boxSizing: 'border-box',
              cursor: 'pointer'
            }}
          >
            <div 
              className="vn-dialog-title"
              style={{ 
                color: speakerChar?.color || '#fff', 
                fontWeight: 900, 
                letterSpacing: '0.4px',
                textShadow: '0 2px 6px rgba(0,0,0,0.7)'
              }}
            >
              {currentEvent.speakerId === 'narrator' ? 'Narrador' : (speakerChar?.name || 'Personaje')}
            </div>
            <div 
              className="vn-dialog-text"
              style={{ 
                color: '#f8fafc',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)'
              }}
            >
              {parseTextTokens(currentEvent.text)}
            </div>
          </div>
        )}

        {/* Fin de la Historia */}
        {!currentEvent && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: 'rgba(10, 10, 16, 0.95)',
            color: '#fff',
            zIndex: 35,
            padding: 20,
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: 18, color: '#38bdf8', margin: 0 }}>Fin de la Escena / Historia</h2>
            <p style={{ color: '#aaa', fontSize: 12, margin: 0 }}>Has llegado al final de las viñetas disponibles.</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startPlaytest(undefined, true);
              }}
              style={{
                marginTop: 6,
                padding: '7px 16px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              🔄 Reiniciar
            </button>
          </div>
        )}

        {/* Modal de Entrada de Nombre */}
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
                padding: 18,
                width: '100%',
                maxWidth: 340,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: 22 }}>✍️</span>
              <strong style={{ color: '#fff', fontSize: 15 }}>¿Cómo te llamas?</strong>
              
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
                  padding: '7px 10px',
                  fontSize: 13,
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
                  padding: '8px 12px',
                  fontSize: 12,
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
              top: 40,
              right: 10,
              width: 280,
              maxHeight: '70%',
              background: '#121218f2',
              border: '1px solid #444',
              borderRadius: 8,
              padding: 10,
              overflowY: 'auto',
              zIndex: 50,
              color: '#ddd',
              fontSize: 11,
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}
          >
            <div style={{ fontWeight: 800, borderBottom: '1px solid #444', paddingBottom: 4 }}>Registro de Diálogos</div>
            {gameState.history.length === 0 && <span style={{ color: '#666' }}>No hay diálogos previos.</span>}
            {gameState.history.map((line, idx) => (
              <div key={idx} style={{ lineHeight: 1.35 }}>{line}</div>
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
