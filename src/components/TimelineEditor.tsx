import React, { useState, useRef, useEffect } from 'react';
import { useNovel } from '../context/NovelContext';
import { 
  DialogueEvent, 
  ChoiceEvent, 
  MagneticSlot, 
  VerticalSlot, 
  CharacterScale, 
  CharacterAnimation, 
  StageCharacterInstance, 
  TimelineEvent, 
  ScreenEffect,
  VariableChange
} from '../types';
import VariablesModal from './VariablesModal';

const SLOTS_X: { slot: MagneticSlot; label: string; xPercent: number }[] = [
  { slot: 'far-left' as any, label: 'Ext-Izq', xPercent: 12 },
  { slot: 'left', label: 'Izq', xPercent: 25 },
  { slot: 'center-left', label: 'C-Izq', xPercent: 38 },
  { slot: 'center', label: 'Centro', xPercent: 50 },
  { slot: 'center-right', label: 'C-Der', xPercent: 62 },
  { slot: 'right', label: 'Der', xPercent: 75 },
  { slot: 'far-right' as any, label: 'Ext-Der', xPercent: 88 }
];

const SLOTS_Y: { slot: VerticalSlot; label: string; bottomPercent: number; yDetectPercent: number }[] = [
  { slot: 'deep_sink' as any, label: 'Oculto', bottomPercent: -25, yDetectPercent: 95 },
  { slot: 'sink', label: 'Bajo', bottomPercent: -12, yDetectPercent: 85 },
  { slot: 'floor', label: 'Suelo', bottomPercent: 0, yDetectPercent: 72 },
  { slot: 'ground', label: 'Normal', bottomPercent: 12, yDetectPercent: 58 },
  { slot: 'elevated', label: 'Elevado', bottomPercent: 24, yDetectPercent: 44 },
  { slot: 'floating', label: 'Flotando', bottomPercent: 36, yDetectPercent: 30 },
  { slot: 'sky' as any, label: 'Aire', bottomPercent: 48, yDetectPercent: 18 }
];

const SCALES: { scale: CharacterScale; label: string; heightPercent: number }[] = [
  { scale: 'small', label: 'Pequeño', heightPercent: 48 },
  { scale: 'medium', label: 'Medio', heightPercent: 68 },
  { scale: 'large', label: 'Grande', heightPercent: 88 },
  { scale: 'closeup', label: 'Primer Plano', heightPercent: 108 }
];

const ANIMATIONS: { anim: CharacterAnimation; label: string }[] = [
  { anim: 'none', label: 'Estático' },
  { anim: 'bounce', label: '🦘 Salto' },
  { anim: 'shake', label: '📳 Sacudida' },
  { anim: 'slide_in', label: '➡️ Entrada' },
  { anim: 'fade_in', label: '✨ Aparición' }
];

type MobileTab = 'dialogue' | 'actors' | 'scene' | 'choice_config';

export default function TimelineEditor() {
  const { 
    project, 
    setProject,
    currentChapterId, 
    currentSceneId, 
    currentBranchId, 
    setCurrentBranchId, 
    createBranch,
    deleteBranch, 
    updateTimelineEvent, 
    addTimelineEvent, 
    deleteTimelineEvent, 
    reorderTimelineEvents,
    duplicateTimelineEventBase 
  } = useNovel();

  const currentChapter = project.chapters.find(c => c.id === currentChapterId) || project.chapters[0];
  const currentScene = currentChapter?.scenes.find(s => s.id === currentSceneId) || currentChapter?.scenes[0];

  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const [showBranchesModal, setShowBranchesModal] = useState(false);
  const [showBgGalleryModal, setShowBgGalleryModal] = useState(false);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileTab, setMobileTab] = useState<MobileTab>('dialogue');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeEditingCharId, setActiveEditingCharId] = useState<string | null>(null);
  const [draggingCharId, setDraggingCharId] = useState<string | null>(null);
  const [activeHoverSlotX, setActiveHoverSlotX] = useState<string | null>(null);
  const [activeHoverSlotY, setActiveHoverSlotY] = useState<string | null>(null);

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const hasMovedRef = useRef<boolean>(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const bgImportInputRef = useRef<HTMLInputElement>(null);

  const branchesMap = currentScene?.branches || {};
  const activeTimeline: TimelineEvent[] = currentBranchId === 'main'
    ? (currentScene?.timeline || [])
    : (branchesMap[currentBranchId]?.timeline || []);

  const currentEvent = activeTimeline[activeFrameIdx] as TimelineEvent | undefined;

  const handleAddDialogue = () => {
    const firstCharId = Object.keys(project.characters)[0] || 'mio';
    const newDialogue: DialogueEvent = {
      type: 'dialogue',
      id: `dlg_${Date.now()}`,
      speakerId: firstCharId,
      text: '',
      charactersOnStage: [
        {
          characterId: firstCharId,
          expression: 'normal',
          slot: 'center',
          verticalSlot: 'floor',
          scale: 'medium',
          brightness: 100,
          animation: 'none'
        }
      ]
    };
    addTimelineEvent(newDialogue);
    setActiveFrameIdx(activeTimeline.length);
    setMobileTab('dialogue');
  };

  const handleAddChoice = () => {
    const newChoice: ChoiceEvent = {
      type: 'choice',
      id: `chc_${Date.now()}`,
      prompt: '¿Qué decisión tomar?',
      options: [
        { id: `opt_1_${Date.now()}`, text: 'Primera Opción', variableChanges: [] },
        { id: `opt_2_${Date.now()}`, text: 'Segunda Opción', variableChanges: [] }
      ]
    };
    addTimelineEvent(newChoice);
    setActiveFrameIdx(activeTimeline.length);
    setMobileTab('choice_config');
  };

  const handleToggleCharacterOnStage = (charId: string) => {
    if (currentEvent?.type !== 'dialogue') return;
    const exists = currentEvent.charactersOnStage.some(c => c.characterId === charId);

    let updatedList: StageCharacterInstance[];
    if (exists) {
      updatedList = currentEvent.charactersOnStage.filter(c => c.characterId !== charId);
    } else {
      updatedList = [
        ...currentEvent.charactersOnStage,
        {
          characterId: charId,
          expression: 'normal',
          slot: 'center-right',
          verticalSlot: 'floor',
          scale: 'medium',
          brightness: 100,
          animation: 'none'
        }
      ];
    }
    updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updatedList });
  };

  const handleSelectBackground = (url: string) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(chap => ({
        ...chap,
        scenes: chap.scenes.map(sc => sc.id === currentSceneId ? { ...sc, backgroundUrl: url } : sc)
      }))
    }));
    setShowBgGalleryModal(false);
  };

  const handleImportBgToGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (typeof uploadEvent.target?.result === 'string') {
        const bgUrl = uploadEvent.target.result;
        const newBgItem = {
          id: `bg_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: bgUrl
        };
        setProject(prev => ({
          ...prev,
          backgroundGallery: [...(prev.backgroundGallery || []), newBgItem]
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreateNewBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    const newId = createBranch(newBranchName.trim());
    setNewBranchName('');
    setCurrentBranchId(newId);
    setActiveFrameIdx(0);
    setShowBranchesModal(false);
  };

  const handleCharPointerDown = (e: React.PointerEvent, charId: string) => {
    e.stopPropagation();
    setDraggingCharId(charId);
    hasMovedRef.current = false;
    touchStartPos.current = { x: e.clientX, y: e.clientY };

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      if (!hasMovedRef.current) {
        setActiveEditingCharId(charId);
        setDraggingCharId(null);
        if (isMobile) setMobileTab('actors');
      }
    }, 380);
  };

  const handleCharPointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setDraggingCharId(null);
    setActiveHoverSlotX(null);
    setActiveHoverSlotY(null);
    touchStartPos.current = null;
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!draggingCharId || !canvasRef.current || currentEvent?.type !== 'dialogue') return;

    if (touchStartPos.current) {
      const dist = Math.hypot(e.clientX - touchStartPos.current.x, e.clientY - touchStartPos.current.y);
      if (dist > 6) {
        hasMovedRef.current = true;
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
      }
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const touchXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const touchYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    let closestSlotX = SLOTS_X[0];
    let minDistanceX = 999;
    SLOTS_X.forEach(s => {
      const dist = Math.abs(s.xPercent - touchXPercent);
      if (dist < minDistanceX) {
        minDistanceX = dist;
        closestSlotX = s;
      }
    });

    let closestSlotY = SLOTS_Y[0];
    let minDistanceY = 999;
    SLOTS_Y.forEach(s => {
      const dist = Math.abs(s.yDetectPercent - touchYPercent);
      if (dist < minDistanceY) {
        minDistanceY = dist;
        closestSlotY = s;
      }
    });

    setActiveHoverSlotX(closestSlotX.slot);
    setActiveHoverSlotY(closestSlotY.slot);

    const updatedChars = currentEvent.charactersOnStage.map(c => {
      if (c.characterId === draggingCharId) {
        return {
          ...c,
          slot: closestSlotX.slot,
          verticalSlot: closestSlotY.slot
        };
      }
      return c;
    });

    updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updatedChars });
  };

  const moveFrame = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= activeTimeline.length) return;
    reorderTimelineEvents(fromIndex, toIndex);
    setActiveFrameIdx(toIndex);
  };

  const getTargetBranchEventsCount = (branchId: string) => {
    if (branchId === 'main') return currentScene?.timeline.length || 0;
    return branchesMap[branchId]?.timeline.length || 0;
  };

  const editingCharInstance = currentEvent?.type === 'dialogue'
    ? (currentEvent.charactersOnStage.find(c => c.characterId === activeEditingCharId) || currentEvent.charactersOnStage[0])
    : null;
  const editingCharDef = editingCharInstance ? project.characters[editingCharInstance.characterId] : null;

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: 'calc(100vh - 48px)',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      background: '#07070b',
      overflow: 'hidden'
    }}>

      {/* 1. SIDEBAR ESCRITORIO */}
      {!isMobile && (
        <div style={{
          width: 210,
          height: '100%',
          background: currentBranchId !== 'main' ? '#14101e' : '#0e0e14',
          borderRight: currentBranchId !== 'main' ? '2px solid #a855f7' : '1px solid #1f1f2e',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          flexShrink: 0
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid #1f1f2e', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => setShowBranchesModal(true)}
              style={{ width: '100%', padding: '7px', background: currentBranchId !== 'main' ? '#7c3aed' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              🗺️ Ramas de la Trama
            </button>
            <button
              onClick={() => setShowVariablesModal(true)}
              style={{ width: '100%', padding: '7px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              ⚙️ Interruptores y Memoria
            </button>
          </div>

          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid #1f1f2e' }}>
            <button onClick={handleAddDialogue} style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              + Viñeta de Diálogo
            </button>
            <button onClick={handleAddChoice} style={{ padding: '6px', background: '#581c87', border: '1px solid #7e22ce', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              + Bifurcación / Decisión
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeTimeline.map((evt, idx) => {
              const isActive = idx === activeFrameIdx;
              const speaker = evt.type === 'dialogue' ? project.characters[evt.speakerId] : null;
              return (
                <div
                  key={evt.id || idx}
                  onClick={() => setActiveFrameIdx(idx)}
                  style={{
                    minHeight: 62,
                    background: isActive ? '#242436' : '#14141c',
                    borderRadius: 6,
                    border: isActive ? '2px solid #38bdf8' : '1px solid #2a2a38',
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#666' }}>#{idx + 1}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); moveFrame(idx, 'left'); }} disabled={idx === 0} style={{ background: 'none', border: 'none', color: idx === 0 ? '#333' : '#aaa', cursor: 'pointer', fontSize: 10 }}>▲</button>
                      <button onClick={(e) => { e.stopPropagation(); moveFrame(idx, 'right'); }} disabled={idx === activeTimeline.length - 1} style={{ background: 'none', border: 'none', color: idx === activeTimeline.length - 1 ? '#333' : '#aaa', cursor: 'pointer', fontSize: 10 }}>▼</button>
                      {evt.type === 'dialogue' && (
                        <button onClick={(e) => { e.stopPropagation(); duplicateTimelineEventBase(idx); }} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer' }}>📋</button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); deleteTimelineEvent(idx); if (activeFrameIdx >= idx && activeFrameIdx > 0) setActiveFrameIdx(prev => prev - 1); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                  {evt.type === 'dialogue' ? (
                    <div style={{ fontSize: 11, color: speaker?.color || '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {speaker?.name || 'Narrador'}: <span style={{ color: '#bbb', fontWeight: 'normal' }}>{evt.text || '...'}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 800 }}>🔀 Decisión</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. CANVAS CENTRAL (16:9) */}
      <div style={{
        flex: isMobile ? '0 0 auto' : 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        padding: isMobile ? 4 : 10,
        boxSizing: 'border-box'
      }}>
        <div 
          ref={canvasRef}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCharPointerUp}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: isMobile ? '100%' : '95%',
            aspectRatio: '16 / 9',
            maxHeight: isMobile ? '38vh' : '88vh',
            backgroundImage: `url(${currentScene?.backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            overflow: 'hidden',
            borderRadius: isMobile ? 8 : 14,
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
            border: '1px solid rgba(255,255,255,0.12)',
            userSelect: 'none',
            touchAction: 'none'
          }}
        >
          {/* Guías Magnéticas Visibles */}
          {draggingCharId && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 }}>
              {SLOTS_X.map(s => (
                <div
                  key={s.slot}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${s.xPercent}%`,
                    width: 1,
                    borderLeft: activeHoverSlotX === s.slot ? '2px dashed #38bdf8' : '1px dashed rgba(255,255,255,0.2)',
                    backgroundColor: activeHoverSlotX === s.slot ? 'rgba(56,189,248,0.1)' : 'transparent'
                  }}
                >
                  <span style={{ position: 'absolute', top: 4, left: 2, fontSize: 8, color: activeHoverSlotX === s.slot ? '#38bdf8' : 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                    {s.label}
                  </span>
                </div>
              ))}

              {SLOTS_Y.map(s => (
                <div
                  key={s.slot}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `${s.bottomPercent}%`,
                    height: 1,
                    borderTop: activeHoverSlotY === s.slot ? '2px dashed #a855f7' : '1px dashed rgba(255,255,255,0.2)'
                  }}
                >
                  <span style={{ position: 'absolute', right: 4, bottom: 2, fontSize: 8, color: activeHoverSlotY === s.slot ? '#c084fc' : 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Renderizado de Personajes en Escena */}
          {currentEvent?.type === 'dialogue' && currentEvent.charactersOnStage.map(inst => {
            const charDef = project.characters[inst.characterId];
            if (!charDef) return null;

            const slotX = SLOTS_X.find(s => s.slot === inst.slot)?.xPercent ?? 50;
            const slotY = SLOTS_Y.find(s => s.slot === inst.verticalSlot)?.bottomPercent ?? 0;
            const scaleHeight = SCALES.find(s => s.scale === inst.scale)?.heightPercent ?? 68;
            const isDraggingThis = draggingCharId === inst.characterId;

            return (
              <div
                key={inst.characterId}
                onPointerDown={(e) => handleCharPointerDown(e, inst.characterId)}
                onClick={() => {
                  setActiveEditingCharId(inst.characterId);
                  if (isMobile) setMobileTab('actors');
                }}
                style={{
                  position: 'absolute',
                  bottom: `${slotY}%`,
                  left: `${slotX}%`,
                  transform: 'translateX(-50%)',
                  height: `${scaleHeight}%`,
                  cursor: isDraggingThis ? 'grabbing' : 'grab',
                  zIndex: isDraggingThis ? 25 : 10,
                  filter: `brightness(${inst.brightness / 100}) ${isDraggingThis ? 'drop-shadow(0 0 16px #38bdf8)' : 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))'}`,
                  transition: isDraggingThis ? 'none' : 'bottom 0.2s ease, left 0.2s ease'
                }}
              >
                <img 
                  src={charDef.expressions[inst.expression] || charDef.avatarUrl} 
                  alt={charDef.name}
                  draggable={false}
                  style={{ height: '100%', width: 'auto', objectFit: 'contain', pointerEvents: 'none' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TIRA DE VIÑETAS HORIZONTAL CON REORDENAMIENTO */}
      {isMobile && (
        <div style={{
          background: '#0b0b12',
          borderTop: '1px solid #1f1f2e',
          borderBottom: '1px solid #1f1f2e',
          padding: '6px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto',
          flexShrink: 0
        }}>
          <button
            onClick={handleAddDialogue}
            style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #3b82f6', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}
          >
            + 💬
          </button>
          <button
            onClick={handleAddChoice}
            style={{ padding: '6px 10px', background: '#581c87', border: '1px solid #a855f7', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}
          >
            + 🔀
          </button>

          <div style={{ width: 1, height: 24, background: '#333', margin: '0 2px' }} />

          {activeTimeline.map((evt, idx) => {
            const isActive = idx === activeFrameIdx;
            return (
              <div
                key={evt.id || idx}
                onClick={() => {
                  setActiveFrameIdx(idx);
                  if (evt.type === 'choice') setMobileTab('choice_config');
                }}
                style={{
                  minWidth: 62,
                  padding: '4px 6px',
                  background: isActive ? '#38bdf8' : '#171722',
                  color: isActive ? '#000' : '#aaa',
                  border: `1px solid ${isActive ? '#38bdf8' : '#333'}`,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <span>#{idx + 1} {evt.type === 'dialogue' ? '💬' : '🔀'}</span>
                {isActive && (
                  <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => moveFrame(idx, 'left')} disabled={idx === 0} style={{ background: 'none', border: 'none', color: '#000', fontSize: 10, fontWeight: 900 }}>◀</button>
                    <button onClick={() => moveFrame(idx, 'right')} disabled={idx === activeTimeline.length - 1} style={{ background: 'none', border: 'none', color: '#000', fontSize: 10, fontWeight: 900 }}>▶</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. PANEL INFERIOR MAKER TÁCTIL */}
      <div style={{
        flex: 1,
        background: '#101018',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Pestañas Contextuales */}
        <div style={{
          display: 'flex',
          background: '#09090e',
          borderBottom: '1px solid #222233',
          padding: '2px 6px'
        }}>
          <button
            onClick={() => setMobileTab('dialogue')}
            style={{
              flex: 1,
              padding: '9px',
              background: mobileTab === 'dialogue' ? '#181826' : 'transparent',
              border: 'none',
              borderBottom: mobileTab === 'dialogue' ? '2px solid #38bdf8' : 'none',
              color: mobileTab === 'dialogue' ? '#fff' : '#777',
              fontSize: 12,
              fontWeight: 800
            }}
          >
            💬 Diálogo
          </button>
          <button
            onClick={() => setMobileTab('actors')}
            style={{
              flex: 1,
              padding: '9px',
              background: mobileTab === 'actors' ? '#181826' : 'transparent',
              border: 'none',
              borderBottom: mobileTab === 'actors' ? '2px solid #ec4899' : 'none',
              color: mobileTab === 'actors' ? '#fff' : '#777',
              fontSize: 12,
              fontWeight: 800
            }}
          >
            👥 Personajes
          </button>
          <button
            onClick={() => setMobileTab('scene')}
            style={{
              flex: 1,
              padding: '9px',
              background: mobileTab === 'scene' ? '#181826' : 'transparent',
              border: 'none',
              borderBottom: mobileTab === 'scene' ? '2px solid #10b981' : 'none',
              color: mobileTab === 'scene' ? '#fff' : '#777',
              fontSize: 12,
              fontWeight: 800
            }}
          >
            🎬 Escena
          </button>
          {currentEvent?.type === 'choice' && (
            <button
              onClick={() => setMobileTab('choice_config')}
              style={{
                flex: 1,
                padding: '9px',
                background: mobileTab === 'choice_config' ? '#181826' : 'transparent',
                border: 'none',
                borderBottom: mobileTab === 'choice_config' ? '2px solid #a855f7' : 'none',
                color: mobileTab === 'choice_config' ? '#fff' : '#777',
                fontSize: 12,
                fontWeight: 800
              }}
            >
              🔀 Consecuencias
            </button>
          )}
        </div>

        {/* Contenido Contextual */}
        <div style={{ flex: 1, padding: 12, overflowY: 'auto', boxSizing: 'border-box' }}>
          
          {/* TAB 1: DIÁLOGO */}
          {mobileTab === 'dialogue' && currentEvent?.type === 'dialogue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={currentEvent.speakerId}
                  onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, speakerId: e.target.value })}
                  style={{
                    background: '#1c1c28',
                    color: project.characters[currentEvent.speakerId]?.color || '#fff',
                    border: '1px solid #333',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 800,
                    flex: 1
                  }}
                >
                  <option value="narrator">Narrador</option>
                  {Object.values(project.characters).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={currentEvent.effect || 'none'}
                  onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, effect: e.target.value as ScreenEffect })}
                  style={{ background: '#1c1c28', color: '#aaa', border: '1px solid #333', borderRadius: 8, padding: '8px', fontSize: 12 }}
                >
                  <option value="none">Sin Efecto</option>
                  <option value="shake">💥 Temblor</option>
                  <option value="flash">⚡ Flash</option>
                  <option value="fade_black">🌑 Fundido</option>
                </select>
              </div>

              <textarea
                rows={3}
                value={currentEvent.text}
                onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, text: e.target.value })}
                placeholder="Escribe el diálogo de la escena aquí..."
                style={{
                  width: '100%',
                  background: '#0a0a10',
                  border: '1px solid #2a2a3e',
                  borderRadius: 8,
                  padding: 10,
                  color: '#fff',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  resize: 'none'
                }}
              />

              {/* Salto Preciso de Rama en Diálogo */}
              <div style={{ background: '#161622', padding: 8, borderRadius: 8, border: '1px solid #2d2d42', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#c084fc', fontWeight: 700 }}>Al terminar:</span>
                <select
                  value={currentEvent.jumpToBranchId || ''}
                  onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, jumpToBranchId: e.target.value || undefined, jumpToEventIndex: 0 })}
                  style={{ flex: 1, background: '#0a0a10', color: '#c084fc', border: '1px solid #444', borderRadius: 4, padding: '4px 6px', fontSize: 11 }}
                >
                  <option value="">➡️ Seguir viñeta siguiente</option>
                  <option value="main">🌿 Vía Principal (Tronco)</option>
                  {Object.values(branchesMap).map(b => (
                    <option key={b.id} value={b.id}>🔀 Rama: {b.name}</option>
                  ))}
                </select>

                {currentEvent.jumpToBranchId && (
                  <select
                    value={currentEvent.jumpToEventIndex ?? 0}
                    onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, jumpToEventIndex: Number(e.target.value) })}
                    style={{ width: 110, background: '#0a0a10', color: '#38bdf8', border: '1px solid #444', borderRadius: 4, padding: '4px 6px', fontSize: 11 }}
                  >
                    {Array.from({ length: getTargetBranchEventsCount(currentEvent.jumpToBranchId) }).map((_, i) => (
                      <option key={i} value={i}>Viñeta #{i + 1}</option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => duplicateTimelineEventBase(activeFrameIdx)}
                  style={{ flex: 1, padding: '9px', background: '#1e293b', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: 6, fontSize: 11, fontWeight: 800 }}
                >
                  📋 Duplicar Escena
                </button>
                <button
                  onClick={() => {
                    deleteTimelineEvent(activeFrameIdx);
                    if (activeFrameIdx > 0) setActiveFrameIdx(prev => prev - 1);
                  }}
                  style={{ flex: 1, padding: '9px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, fontSize: 11, fontWeight: 800 }}
                >
                  🗑️ Eliminar Viñeta
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAJES */}
          {mobileTab === 'actors' && currentEvent?.type === 'dialogue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#aaa', fontWeight: 800, display: 'block', marginBottom: 6 }}>Personajes en el plano:</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.values(project.characters).map(char => {
                    const onStage = currentEvent.charactersOnStage.some(c => c.characterId === char.id);
                    return (
                      <button
                        key={char.id}
                        onClick={() => handleToggleCharacterOnStage(char.id)}
                        style={{
                          padding: '6px 12px',
                          background: onStage ? char.color : '#1c1c28',
                          color: onStage ? '#000' : '#fff',
                          border: `1px solid ${char.color}`,
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {onStage ? '✓ ' : '+ '}{char.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {editingCharInstance && editingCharDef && (
                <div style={{ background: '#0a0a12', padding: 10, borderRadius: 8, border: '1px solid #222' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: editingCharDef.color, marginBottom: 8 }}>
                    🎭 Expresión activa ({editingCharDef.name}):
                  </div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {Object.entries(editingCharDef.expressions || {}).map(([exprKey, spriteUrl]) => (
                      <div
                        key={exprKey}
                        onClick={() => {
                          const updated = currentEvent.charactersOnStage.map(c => 
                            c.characterId === editingCharInstance.characterId ? { ...c, expression: exprKey } : c
                          );
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updated });
                        }}
                        style={{
                          minWidth: 54,
                          height: 64,
                          background: editingCharInstance.expression === exprKey ? 'rgba(56,189,248,0.25)' : '#161622',
                          border: `2px solid ${editingCharInstance.expression === exprKey ? '#38bdf8' : '#333'}`,
                          borderRadius: 6,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 2,
                          cursor: 'pointer'
                        }}
                      >
                        <img src={spriteUrl} alt={exprKey} style={{ width: '100%', height: 42, objectFit: 'contain' }} />
                        <span style={{ fontSize: 8, color: '#fff', textTransform: 'capitalize' }}>{exprKey}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Tamaño:</label>
                      <select
                        value={editingCharInstance.scale}
                        onChange={(e) => {
                          const updated = currentEvent.charactersOnStage.map(c => 
                            c.characterId === editingCharInstance.characterId ? { ...c, scale: e.target.value as CharacterScale } : c
                          );
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updated });
                        }}
                        style={{ width: '100%', background: '#1c1c28', color: '#fff', border: '1px solid #333', padding: 6, borderRadius: 6, fontSize: 11 }}
                      >
                        {SCALES.map(s => <option key={s.scale} value={s.scale}>{s.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Animación de Entrada:</label>
                      <select
                        value={editingCharInstance.animation || 'none'}
                        onChange={(e) => {
                          const updated = currentEvent.charactersOnStage.map(c => 
                            c.characterId === editingCharInstance.characterId ? { ...c, animation: e.target.value as CharacterAnimation } : c
                          );
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updated });
                        }}
                        style={{ width: '100%', background: '#1c1c28', color: '#fff', border: '1px solid #333', padding: 6, borderRadius: 6, fontSize: 11 }}
                      >
                        {ANIMATIONS.map(a => <option key={a.anim} value={a.anim}>{a.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ESCENA */}
          {mobileTab === 'scene' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setShowBgGalleryModal(true)}
                style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800 }}
              >
                🖼️ Galería y Fondo de la Escena
              </button>
              <button
                onClick={() => setShowBranchesModal(true)}
                style={{ width: '100%', padding: '12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800 }}
              >
                🗺️ Mapa de Vías y Ramas
              </button>
              <button
                onClick={() => setShowVariablesModal(true)}
                style={{ width: '100%', padding: '12px', background: '#0e7490', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800 }}
              >
                ⚙️ Interruptores y Memoria de la Historia
              </button>
            </div>
          )}

          {/* TAB 4: DECISIONES Y CONSECUENCIAS MAKER */}
          {mobileTab === 'choice_config' && currentEvent?.type === 'choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input 
                type="text"
                value={currentEvent.prompt}
                onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, prompt: e.target.value })}
                placeholder="Pregunta o dilema central..."
                style={{ width: '100%', background: '#0a0a10', border: '1px solid #a855f7', borderRadius: 6, color: '#fff', padding: '8px', fontSize: 13, boxSizing: 'border-box', fontWeight: 700 }}
              />

              {currentEvent.options.map((opt, oIdx) => (
                <div key={opt.id} style={{ background: '#161622', padding: 10, borderRadius: 8, border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input 
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const copy = [...currentEvent.options];
                        copy[oIdx].text = e.target.value;
                        updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                      }}
                      placeholder="Texto del botón"
                      style={{ flex: 1, background: '#0a0a10', border: '1px solid #444', color: '#fff', padding: '6px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}
                    />
                    <button
                      onClick={() => {
                        const copy = currentEvent.options.filter((_, i) => i !== oIdx);
                        updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                      }}
                      style={{ background: '#ef4444', border: 'none', borderRadius: 4, color: '#fff', padding: '4px 8px', fontSize: 11 }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Destino Preciso de Salto */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: '#0d0d14', padding: 6, borderRadius: 6 }}>
                    <span style={{ fontSize: 10, color: '#c084fc', fontWeight: 700 }}>Destino:</span>
                    <select
                      value={opt.jumpToBranchId || ''}
                      onChange={(e) => {
                        const copy = [...currentEvent.options];
                        copy[oIdx].jumpToBranchId = e.target.value || undefined;
                        copy[oIdx].jumpToEventIndex = 0;
                        updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                      }}
                      style={{ flex: 1, background: '#161622', color: '#c084fc', border: '1px solid #444', borderRadius: 4, fontSize: 11, padding: 3 }}
                    >
                      <option value="">(Continuar Recto)</option>
                      <option value="main">🌿 Vía Principal (Tronco)</option>
                      {Object.values(branchesMap).map(b => (
                        <option key={b.id} value={b.id}>🔀 {b.name}</option>
                      ))}
                    </select>

                    {opt.jumpToBranchId && (
                      <select
                        value={opt.jumpToEventIndex ?? 0}
                        onChange={(e) => {
                          const copy = [...currentEvent.options];
                          copy[oIdx].jumpToEventIndex = Number(e.target.value);
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                        }}
                        style={{ width: 105, background: '#161622', color: '#38bdf8', border: '1px solid #444', borderRadius: 4, fontSize: 11, padding: 3 }}
                      >
                        {Array.from({ length: getTargetBranchEventsCount(opt.jumpToBranchId) }).map((_, i) => (
                          <option key={i} value={i}>Viñeta #{i + 1}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Impactos en la Memoria / Interruptores */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: '#38bdf8', fontWeight: 700 }}>⚡ Impacto en la Memoria:</span>
                    <button
                      onClick={() => {
                        const varKeys = Object.keys(project.variables || {});
                        if (varKeys.length === 0) {
                          setShowVariablesModal(true);
                          return;
                        }
                        const newChange: VariableChange = {
                          variableName: varKeys[0],
                          operation: 'set',
                          valueType: 'literal',
                          value: true
                        };
                        const copy = [...currentEvent.options];
                        copy[oIdx].variableChanges = [...(copy[oIdx].variableChanges || []), newChange];
                        updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                      }}
                      style={{ padding: '3px 8px', background: '#38bdf8', color: '#000', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                    >
                      + Modificar Estado
                    </button>
                  </div>

                  {opt.variableChanges?.map((ch, cIdx) => (
                    <div key={cIdx} style={{ display: 'flex', gap: 4, alignItems: 'center', background: '#0a0a10', padding: 4, borderRadius: 4 }}>
                      <select
                        value={ch.variableName}
                        onChange={(e) => {
                          const copy = [...currentEvent.options];
                          copy[oIdx].variableChanges![cIdx].variableName = e.target.value;
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                        }}
                        style={{ flex: 1.5, background: '#161622', color: '#fff', border: '1px solid #333', fontSize: 10, padding: 2 }}
                      >
                        {Object.keys(project.variables || {}).map(vn => (
                          <option key={vn} value={vn}>{vn}</option>
                        ))}
                      </select>

                      <select
                        value={ch.operation}
                        onChange={(e) => {
                          const copy = [...currentEvent.options];
                          copy[oIdx].variableChanges![cIdx].operation = e.target.value as any;
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                        }}
                        style={{ flex: 1, background: '#161622', color: '#a7f3d0', border: '1px solid #333', fontSize: 10, padding: 2 }}
                      >
                        <option value="set">Fijar en</option>
                        <option value="add">+ Sumar</option>
                        <option value="subtract">- Restar</option>
                        <option value="toggle">Invertir ON/OFF</option>
                      </select>

                      {ch.operation !== 'toggle' && (
                        <input
                          type="text"
                          value={String(ch.value)}
                          onChange={(e) => {
                            const copy = [...currentEvent.options];
                            copy[oIdx].variableChanges![cIdx].value = e.target.value;
                            updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                          }}
                          style={{ width: 45, background: '#161622', color: '#fff', border: '1px solid #333', fontSize: 10, padding: 2, textAlign: 'center' }}
                        />
                      )}

                      <button
                        onClick={() => {
                          const copy = [...currentEvent.options];
                          copy[oIdx].variableChanges = copy[oIdx].variableChanges!.filter((_, i) => i !== cIdx);
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              <button
                onClick={() => {
                  const newOpt = { id: `opt_${Date.now()}`, text: 'Nueva Opción', variableChanges: [] };
                  updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: [...currentEvent.options, newOpt] });
                }}
                style={{ background: '#581c87', border: 'none', borderRadius: 6, color: '#fff', padding: '9px', fontSize: 12, fontWeight: 800 }}
              >
                + Añadir Otra Opción
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Modales de Fondos y Vías */}
      {showBgGalleryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <div style={{ width: '100%', maxWidth: 500, background: '#12121a', borderRadius: 12, padding: 14, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#fff' }}>Galería de Fondos</strong>
              <button onClick={() => setShowBgGalleryModal(false)} style={{ background: 'none', border: 'none', color: '#999', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {project.backgroundGallery?.map(bg => (
                <div key={bg.id} onClick={() => { handleSelectBackground(bg.url); }} style={{ cursor: 'pointer', border: '1px solid #333', borderRadius: 6, overflow: 'hidden' }}>
                  <img src={bg.url} alt={bg.name} style={{ width: '100%', height: 70, objectFit: 'cover' }} />
                  <div style={{ padding: 4, fontSize: 9, color: '#ddd', textAlign: 'center' }}>{bg.name}</div>
                </div>
              ))}
            </div>
            <button onClick={() => bgImportInputRef.current?.click()} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px', fontSize: 12, fontWeight: 800 }}>
              + Importar Nuevo Fondo
            </button>
            <input type="file" ref={bgImportInputRef} onChange={handleImportBgToGallery} accept="image/*" style={{ display: 'none' }} />
          </div>
        </div>
      )}

      {showBranchesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <div style={{ width: '100%', maxWidth: 400, background: '#12121a', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#fff' }}>Ramas y Vías de la Escena</strong>
              <button onClick={() => setShowBranchesModal(false)} style={{ background: 'none', border: 'none', color: '#999', fontSize: 18 }}>✕</button>
            </div>
            <button onClick={() => { setCurrentBranchId('main'); setActiveFrameIdx(0); setShowBranchesModal(false); }} style={{ background: currentBranchId === 'main' ? '#2563eb' : '#1c1c28', color: '#fff', border: '1px solid #333', padding: 8, borderRadius: 6, textAlign: 'left', fontWeight: 700 }}>
              🌿 Vía Principal (Tronco)
            </button>
            {Object.values(branchesMap).map(br => (
              <div key={br.id} style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setCurrentBranchId(br.id); setActiveFrameIdx(0); setShowBranchesModal(false); }} style={{ flex: 1, background: currentBranchId === br.id ? '#7c3aed' : '#1c1c28', color: '#fff', border: '1px solid #333', padding: 8, borderRadius: 6, textAlign: 'left', fontWeight: 700 }}>
                  🔀 Rama: {br.name}
                </button>
                <button onClick={() => deleteBranch(br.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '0 10px' }}>✕</button>
              </div>
            ))}
            <form onSubmit={handleCreateNewBranch} style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} placeholder="Nombre de la nueva rama..." style={{ flex: 1, background: '#0a0a0f', border: '1px solid #333', borderRadius: 6, color: '#fff', padding: 6, fontSize: 12 }} />
              <button type="submit" style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>Crear</button>
            </form>
          </div>
        </div>
      )}

      <VariablesModal isOpen={showVariablesModal} onClose={() => setShowVariablesModal(false)} />
    </div>
  );
}
