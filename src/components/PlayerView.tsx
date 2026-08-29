import React, { useState, useEffect, useRef } from 'react';
import { useNovel } from '../context/NovelContext';
import {
  CharacterAnimation,
  MenuElement,
  VariableCondition
} from '../types';
import SaveLoadModal from './SaveLoadModal';

const STAGE_SLOTS_X: Record<string, string> = {
  'far-left': '12%',
  'left': '25%',
  'center-left': '38%',
  'center': '50%',
  'center-right': '62%',
  'right': '75%',
  'far-right': '88%'
};

const STAGE_SLOTS_Y: Record<string, string> = {
  'deep_sink': '-25%',
  'sink': '-12%',
  'floor': '0%',
  'ground': '12%',
  'elevated': '24%',
  'floating': '36%',
  'sky': '48%'
};

const MENU_SLOTS_X: Record<string, number> = {
  'far-left': 12,
  'left': 25,
  'center-left': 38,
  'center': 50,
  'center-right': 62,
  'right': 75,
  'far-right': 88
};

const MENU_SLOTS_Y: Record<string, number> = {
  'sky': 18,
  'floating': 30,
  'elevated': 44,
  'ground': 58,
  'floor': 72,
  'sink': 85,
  'deep_sink': 95
};

const SCALE_PERCENTAGES: Record<string, string> = {
  'small': '48%',
  'medium': '68%',
  'large': '88%',
  'closeup': '108%'
};

export default function PlayerView() {
  const {
    activePlayProject,
    gameState,
    advancePlayerEvent,
    selectChoiceOption,
    jumpToScene,
    jumpToMenu,
    applyVariableChanges,
    parseTextTokens,
    setPlayerName,
    startPlaytest
  } = useNovel();

  const [showHistory, setShowHistory] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [isLargeScreenMode, setIsLargeScreenMode] = useState(false);

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typewriterTimerRef = useRef<number | null>(null);

  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const sfxAudioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------
  // PRECARGA DE IMÁGENES AL ABRIR LA NOVELA
  // -------------------------------------------------------------
  useEffect(() => {
    const urlsToPreload = new Set<string>();

    // 1. Sprites y avatares de personajes
    Object.values(activePlayProject.characters || {}).forEach(char => {
      if (char.avatarUrl) urlsToPreload.add(char.avatarUrl);
      if (char.expressions) {
        Object.values(char.expressions).forEach(exprUrl => {
          if (exprUrl) urlsToPreload.add(exprUrl);
        });
      }
    });

    // 2. Fondos de galería
    (activePlayProject.backgroundGallery || []).forEach(bg => {
      if (bg.url) urlsToPreload.add(bg.url);
    });

    // 3. Menús y botones personalizados
    Object.values(activePlayProject.customScreens || {}).forEach(scr => {
      if (scr.backgroundUrl) urlsToPreload.add(scr.backgroundUrl);
      scr.elements?.forEach(el => {
        if (el.customBgImage) urlsToPreload.add(el.customBgImage);
      });
    });

    // 4. Fondos dentro de la línea de tiempo
    const scenes = (activePlayProject as any).scenes || activePlayProject.chapters?.flatMap((c: any) => c.scenes || []) || [];
    scenes.forEach((sc: any) => {
      if (sc.backgroundUrl) urlsToPreload.add(sc.backgroundUrl);
      sc.timeline?.forEach((evt: any) => {
        if (evt.backgroundUrl) urlsToPreload.add(evt.backgroundUrl);
      });
      Object.values(sc.branches || {}).forEach((br: any) => {
        br.timeline?.forEach((evt: any) => {
          if (evt.backgroundUrl) urlsToPreload.add(evt.backgroundUrl);
        });
      });
    });

    // Cargar en la caché del navegador
    urlsToPreload.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, [activePlayProject]);

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
  const [tempPlayerName, setTempPlayerName] = useState(
    gameState.playerName || activePlayProject.defaultPlayerName || ''
  );

  useEffect(() => {
    if (
      activePlayProject.askPlayerName &&
      !gameState.playerName &&
      gameState.currentEventIndex === 0 &&
      gameState.history.length === 0 &&
      !gameState.currentMenuId
    ) {
      setAskingName(true);
    }
  }, [activePlayProject.askPlayerName, gameState.currentMenuId]);

  useEffect(() => {
    if (!gameState.currentSceneId && !gameState.currentMenuId) {
      startPlaytest();
    }
  }, [gameState.currentSceneId, gameState.currentMenuId]);

  const activeMenuScreen = gameState.currentMenuId
    ? activePlayProject.customScreens?.[gameState.currentMenuId]
    : null;

  const scenesList =
    (activePlayProject as any).scenes ||
    activePlayProject.chapters?.flatMap((c: any) => c.scenes || []) ||
    [];
  const currentScene =
    scenesList.find((s: any) => s.id === gameState.currentSceneId) || scenesList[0];

  const timeline =
    gameState.currentBranchId === 'main'
      ? currentScene?.timeline || []
      : currentScene?.branches?.[gameState.currentBranchId]?.timeline || [];

  const currentEvent = timeline?.[gameState.currentEventIndex] as any;
  const effectiveBgUrl = activeMenuScreen
    ? activeMenuScreen.backgroundUrl
    : currentEvent?.backgroundUrl || currentScene?.backgroundUrl;

  // Typewriter
  useEffect(() => {
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }

    if (!activeMenuScreen && currentEvent?.type === 'dialogue') {
      const fullText = parseTextTokens(currentEvent.text || '');
      setDisplayedText('');
      setIsTyping(true);

      let charIndex = 0;
      typewriterTimerRef.current = window.setInterval(() => {
        charIndex += 1;
        setDisplayedText(fullText.slice(0, charIndex));
        if (charIndex >= fullText.length) {
          if (typewriterTimerRef.current) {
            clearInterval(typewriterTimerRef.current);
            typewriterTimerRef.current = null;
          }
          setIsTyping(false);
        }
      }, 22);
    } else {
      setDisplayedText('');
      setIsTyping(false);
    }

    return () => {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
      }
    };
  }, [
    gameState.currentEventIndex,
    gameState.currentSceneId,
    gameState.currentBranchId,
    gameState.currentMenuId
  ]);

  // Audio
  useEffect(() => {
    const activeBgm = activeMenuScreen ? activeMenuScreen.bgmUrl : currentEvent?.bgmUrl;

    if (activeBgm === 'stop') {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current.src = '';
      }
    } else if (activeBgm && activeBgm !== bgmAudioRef.current?.src) {
      if (!bgmAudioRef.current) {
        bgmAudioRef.current = new Audio(activeBgm);
        bgmAudioRef.current.loop = true;
      } else {
        bgmAudioRef.current.src = activeBgm;
      }
      bgmAudioRef.current.play().catch(() => {});
    }

    if (!activeMenuScreen && currentEvent?.sfxUrl) {
      if (!sfxAudioRef.current) {
        sfxAudioRef.current = new Audio(currentEvent.sfxUrl);
      } else {
        sfxAudioRef.current.src = currentEvent.sfxUrl;
      }
      sfxAudioRef.current.currentTime = 0;
      sfxAudioRef.current.play().catch(() => {});
    }
  }, [
    gameState.currentEventIndex,
    gameState.currentSceneId,
    gameState.currentBranchId,
    gameState.currentMenuId
  ]);

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

  const hasSpeaker =
    currentEvent?.type === 'dialogue' &&
    currentEvent.speakerId &&
    currentEvent.speakerId !== 'none';
  const speakerChar =
    hasSpeaker && currentEvent.speakerId !== 'narrator'
      ? gameState.runtimeCharacters[currentEvent.speakerId] ||
        activePlayProject.characters[currentEvent.speakerId]
      : null;

  const visibleVariables = Object.entries(gameState.runtimeVariables || {}).filter(([key]) => {
    return activePlayProject.variables?.[key]?.isVisibleInHUD === true;
  });

  const checkCondition = (cond: VariableCondition | undefined): boolean => {
    if (!cond || !cond.variableName) return true;
    const currentVal = gameState.runtimeVariables[cond.variableName];
    const targetVal = cond.value;

    switch (cond.operator) {
      case 'equals':
        return String(currentVal) === String(targetVal);
      case 'not_equals':
        return String(currentVal) !== String(targetVal);
      case 'greater':
        return Number(currentVal) > Number(targetVal);
      case 'less':
        return Number(currentVal) < Number(targetVal);
      default:
        return true;
    }
  };

  const handleScreenClick = () => {
    if (activeMenuScreen) return;
    if (showHistory || showSaveLoad || askingName) return;
    if (currentEvent?.type === 'choice') return;

    if (isTyping && currentEvent?.type === 'dialogue') {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
      }
      setDisplayedText(parseTextTokens(currentEvent.text || ''));
      setIsTyping(false);
      return;
    }

    advancePlayerEvent();
  };

  const handleMenuElementClick = (element: MenuElement) => {
    const changes = element.action?.variableChanges || element.variableChanges;
    if (changes && changes.length > 0) {
      applyVariableChanges(changes, gameState.runtimeVariables);
    }

    if (!element.action) return;

    switch (element.action.type) {
      case 'start_game':
        startPlaytest(undefined, true);
        break;
      case 'jump_to_scene':
        jumpToScene(
          element.action.targetSceneId || currentScene?.id || '',
          element.action.targetBranchId || 'main',
          element.action.targetEventIndex || 0
        );
        break;
      case 'jump_to_menu':
        if (element.action.targetMenuId) {
          jumpToMenu(element.action.targetMenuId);
        }
        break;
      case 'open_save_load':
        setShowSaveLoad(true);
        break;
      case 'restart':
        startPlaytest(undefined, true);
        break;
    }
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

  const getElementStyle = (el: MenuElement): React.CSSProperties => {
    const customBg = el.customBgColor;
    const customColor = el.customTextColor;
    const bgImage = el.customBgImage;
    const customFontSize = (el as any).fontSizePx ? `${(el as any).fontSizePx}px` : undefined;

    if (el.type === 'button') {
      const baseBg =
        customBg ||
        (el.styleVariant === 'danger'
          ? '#dc2626'
          : el.styleVariant === 'glass'
          ? 'rgba(15, 23, 42, 0.85)'
          : el.styleVariant === 'secondary'
          ? '#1e293b'
          : '#2563eb');

      return {
        background: bgImage ? `url(${bgImage}) center/cover no-repeat` : baseBg,
        color: customColor || '#fff',
        border: bgImage
          ? '1px solid rgba(255,255,255,0.4)'
          : el.styleVariant === 'danger'
          ? '1px solid #ef4444'
          : el.styleVariant === 'glass'
          ? '1px solid rgba(255,255,255,0.2)'
          : 'none',
        backdropFilter: el.styleVariant === 'glass' ? 'blur(10px)' : undefined,
        borderRadius: 8,
        padding: '0 12px',
        fontWeight: 800,
        fontSize: customFontSize || 'clamp(10px, 2.4cqw, 15px)',
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap'
      };
    }

    if (el.type === 'card') {
      return {
        background: customBg || (el.styleVariant === 'glass' ? 'rgba(15, 23, 42, 0.75)' : '#1e293b'),
        backdropFilter: el.styleVariant === 'glass' ? 'blur(10px)' : undefined,
        color: customColor || '#e2e8f0',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        padding: 8,
        fontWeight: 700,
        fontSize: customFontSize || 'clamp(10px, 2.2cqw, 14px)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        boxSizing: 'border-box'
      };
    }

    return {
      fontSize:
        customFontSize ||
        (el.styleVariant === 'title' ? 'clamp(14px, 4cqw, 24px)' : 'clamp(11px, 2.4cqw, 15px)'),
      fontWeight: el.styleVariant === 'title' ? 900 : 600,
      color: customColor || (el.styleVariant === 'title' ? '#38bdf8' : '#cbd5e1'),
      textShadow: '0 2px 8px rgba(0,0,0,0.9)',
      background: 'none',
      border: 'none',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      whiteSpace: 'nowrap'
    };
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
        .canvas-container {
          container-type: inline-size;
        }

        @keyframes jumpAnim {
          0% { transform: translateY(0); }
          50% { transform: translateY(-25px); }
          100% { transform: translateY(0); }
        }

        @keyframes shakeAnim {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }

        @keyframes fadeInAnim {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes slideInAnim {
          0% { transform: translateX(-30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }

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
        className="canvas-container"
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
          cursor: activeMenuScreen ? 'default' : currentEvent ? 'pointer' : 'default',
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
          {visibleVariables.length > 0 && !activeMenuScreen ? (
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
              onClick={e => {
                e.stopPropagation();
                setShowSaveLoad(true);
              }}
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

            {!activeMenuScreen && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowHistory(prev => !prev);
                }}
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
            )}

            <button
              onClick={e => {
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

        {/* 1. MODO MENÚ PERSONALIZADO / PANTALLA FINAL */}
        {activeMenuScreen ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 25, pointerEvents: 'auto' }}>
            {activeMenuScreen.elements?.map(el => {
              if (!checkCondition(el.condition)) return null;

              const slotX = MENU_SLOTS_X[String(el.slotX || 'center')] ?? 50;
              const slotY = MENU_SLOTS_Y[String(el.verticalSlot || 'ground')] ?? 58;
              const style = getElementStyle(el);

              const widthVal = (el as any).widthPercent ? `${(el as any).widthPercent}%` : el.type === 'button' ? '30%' : 'auto';
              const heightVal = (el as any).heightPercent ? `${(el as any).heightPercent}%` : el.type === 'button' ? '9%' : 'auto';

              return (
                <div
                  key={el.id}
                  style={{
                    position: 'absolute',
                    top: `${slotY}%`,
                    left: `${slotX}%`,
                    transform: 'translate(-50%, -50%)',
                    width: widthVal,
                    height: heightVal,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 30
                  }}
                >
                  {el.type === 'button' ? (
                    <button onClick={() => handleMenuElementClick(el)} style={style}>
                      {parseTextTokens(el.text)}
                    </button>
                  ) : (
                    <div style={style}>{parseTextTokens(el.text)}</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* 2. MODO ESCENA NARRATIVA REGULAR */}
            {currentEvent?.type === 'dialogue' &&
              currentEvent.charactersOnStage?.map((inst: any) => {
                const charDef = activePlayProject.characters[inst.characterId];
                if (!charDef) return null;

                const slotX = STAGE_SLOTS_X[String(inst.slot || 'center')] || '50%';
                const slotY = STAGE_SLOTS_Y[String(inst.verticalSlot || 'floor')] || '0%';
                const scale = SCALE_PERCENTAGES[String(inst.scale || 'medium')] || '68%';

                const resolvedSprite =
                  charDef.expressions?.[inst.expression] ||
                  Object.values(charDef.expressions || {})[0] ||
                  charDef.avatarUrl;

                const hasAnim = inst.animation && inst.animation !== 'none';

                return (
                  <div
                    key={inst.characterId}
                    style={{
                      position: 'absolute',
                      bottom: slotY,
                      left: slotX,
                      transform: 'translateX(-50%)',
                      transition:
                        'bottom 0.25s ease, left 0.25s ease, height 0.25s ease',
                      pointerEvents: 'none',
                      zIndex: 10,
                      height: scale,
                      filter: `brightness(${(inst.brightness ?? 100) / 100}) drop-shadow(0 8px 16px rgba(0,0,0,0.5))`
                    }}
                  >
                    <div
                      key={hasAnim ? `anim_${inst.animation}_${gameState.currentEventIndex}` : 'no_anim'}
                      style={{
                        height: '100%',
                        width: 'auto',
                        animation: getAnimationKeyframes(inst.animation)
                      }}
                    >
                      <img
                        key={`sprite_${inst.characterId}_${inst.expression}`}
                        src={resolvedSprite}
                        alt={charDef.name}
                        draggable={false}
                        decoding="sync"
                        style={{
                          display: 'block',
                          height: '100%',
                          width: 'auto',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  </div>
                );
              })}

            {/* Opciones de Elección */}
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
                <div
                  style={{
                    background: 'rgba(15, 15, 22, 0.96)',
                    color: '#fff',
                    padding: isPortrait ? '6px 10px' : '8px 14px',
                    borderRadius: 8,
                    textAlign: 'center',
                    fontSize: isPortrait ? 12 : 13,
                    fontWeight: 800,
                    border: '1.5px solid #3b82f6'
                  }}
                >
                  {parseTextTokens(currentEvent.prompt)}
                </div>

                {currentEvent.options?.map((option: any) => (
                  <button
                    key={option.id}
                    onClick={e => {
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
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: isPortrait ? '96%' : '94%',
                  background: 'rgba(8, 8, 14, 0.94)',
                  backdropFilter: 'blur(12px)',
                  border: `2px solid ${
                    hasSpeaker
                      ? speakerChar?.color || '#3b82f6'
                      : 'rgba(255,255,255,0.2)'
                  }`,
                  borderRadius: 12,
                  color: '#fff',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                  zIndex: 30,
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                {hasSpeaker && (
                  <div
                    className="vn-dialog-title"
                    style={{
                      color: speakerChar?.color || '#fff',
                      fontWeight: 900,
                      letterSpacing: '0.4px',
                      textShadow: '0 2px 6px rgba(0,0,0,0.7)'
                    }}
                  >
                    {currentEvent.speakerId === 'narrator'
                      ? 'Narrador'
                      : speakerChar?.name || 'Personaje'}
                  </div>
                )}

                <div
                  className="vn-dialog-text"
                  style={{
                    color: '#f8fafc',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    minHeight: '1.45em',
                    fontStyle: !hasSpeaker ? 'italic' : 'normal'
                  }}
                >
                  {displayedText}
                  {isTyping && <span style={{ opacity: 0.7, marginLeft: 2 }}>▍</span>}
                </div>
              </div>
            )}

            {/* Fin de la Historia */}
            {!currentEvent && (
              <div
                style={{
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
                }}
              >
                <h2 style={{ fontSize: 18, color: '#38bdf8', margin: 0 }}>
                  Fin de la Historia
                </h2>
                <p style={{ color: '#aaa', fontSize: 12, margin: 0 }}>
                  Has llegado al final de las viñetas disponibles.
                </p>
                <button
                  onClick={e => {
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
          </>
        )}

        {/* Modal de Entrada de Nombre */}
        {askingName && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(5, 5, 10, 0.88)',
              backdropFilter: 'blur(12px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 12
            }}
          >
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
        {showHistory && !activeMenuScreen && (
          <div
            onClick={e => e.stopPropagation()}
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
            <div style={{ fontWeight: 800, borderBottom: '1px solid #444', paddingBottom: 4 }}>
              Registro de Diálogos
            </div>
            {gameState.history.length === 0 && (
              <span style={{ color: '#666' }}>No hay diálogos previos.</span>
            )}
            {gameState.history.map((line: string, idx: number) => (
              <div key={idx} style={{ lineHeight: 1.35 }}>
                {line}
              </div>
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
