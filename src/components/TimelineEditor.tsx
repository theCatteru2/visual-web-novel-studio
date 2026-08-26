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
  VariableChange,
  ScreenEffect
} from '../types';
import VariablesModal from './VariablesModal';

const SLOTS_X: { slot: MagneticSlot; label: string; xPercent: number }[] = [
  { slot: 'far-left', label: 'Ext-Izq', xPercent: 12 },
  { slot: 'left', label: 'Izq', xPercent: 25 },
  { slot: 'center-left', label: 'C-Izq', xPercent: 38 },
  { slot: 'center', label: 'Centro', xPercent: 50 },
  { slot: 'center-right', label: 'C-Der', xPercent: 62 },
  { slot: 'right', label: 'Der', xPercent: 75 },
  { slot: 'far-right', label: 'Ext-Der', xPercent: 88 }
];

const SLOTS_Y: { slot: VerticalSlot; label: string; bottomPercent: number; yDetectPercent: number }[] = [
  { slot: 'deep_sink', label: 'Bajo Pantalla', bottomPercent: -25, yDetectPercent: 95 },
  { slot: 'sink', label: 'Hundido', bottomPercent: -12, yDetectPercent: 85 },
  { slot: 'floor', label: 'Suelo', bottomPercent: 0, yDetectPercent: 72 },
  { slot: 'ground', label: 'Normal', bottomPercent: 12, yDetectPercent: 58 },
  { slot: 'elevated', label: 'Elevado', bottomPercent: 24, yDetectPercent: 44 },
  { slot: 'floating', label: 'Flotando', bottomPercent: 36, yDetectPercent: 30 },
  { slot: 'sky', label: 'Alto / Aire', bottomPercent: 48, yDetectPercent: 18 }
];

const SCALES: { scale: CharacterScale; label: string; heightPercent: number }[] = [
  { scale: 'small', label: 'Pequeño', heightPercent: 48 },
  { scale: 'medium', label: 'Medio', heightPercent: 68 },
  { scale: 'large', label: 'Grande', heightPercent: 88 },
  { scale: 'closeup', label: 'Primer Plano', heightPercent: 108 }
];

const ANIMATIONS: { anim: CharacterAnimation; label: string }[] = [
  { anim: 'none', label: 'Sin animación' },
  { anim: 'bounce', label: '🦘 Salto' },
  { anim: 'shake', label: '📳 Sacudida' },
  { anim: 'slide_in', label: '➡️ Deslizar' },
  { anim: 'fade_in', label: '✨ Aparecer' }
];

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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeEditingCharId, setActiveEditingCharId] = useState<string | null>(null);
  const [draggingCharId, setDraggingCharId] = useState<string | null>(null);
  const [activeHoverSlotX, setActiveHoverSlotX] = useState<string | null>(null);
  const [activeHoverSlotY, setActiveHoverSlotY] = useState<string | null>(null);
  const [draggedTimelineIdx, setDraggedTimelineIdx] = useState<number | null>(null);

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
    if (isMobile) setSidebarOpen(false);
  };

  const handleAddChoice = () => {
    const newChoice: ChoiceEvent = {
      type: 'choice',
      id: `chc_${Date.now()}`,
      prompt: '¿Qué responder?',
      options: [
        { id: `opt_1_${Date.now()}`, text: 'Opción A', variableChanges: [] },
        { id: `opt_2_${Date.now()}`, text: 'Opción B', variableChanges: [] }
      ]
    };
    addTimelineEvent(newChoice);
    setActiveFrameIdx(activeTimeline.length);
    if (isMobile) setSidebarOpen(false);
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

  const handleCreateNewBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    const newId = createBranch(newBranchName.trim());
    setNewBranchName('');
    setCurrentBranchId(newId);
    setActiveFrameIdx(0);
    setShowBranchesModal(false);
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

  const getTargetBranchEventsCount = (branchId: string) => {
    if (branchId === 'main') return currentScene?.timeline.length || 0;
    return branchesMap[branchId]?.timeline.length || 0;
  };

  const editingCharInstance = currentEvent?.type === 'dialogue'
    ? currentEvent.charactersOnStage.find(c => c.characterId === activeEditingCharId)
    : null;
  const editingCharDef = editingCharInstance ? project.characters[editingCharInstance.characterId] : null;

  return (
    <div style={{ position: 'relative', width: '100vw', height: 'calc(100vh - 48px)', display: 'flex', background: '#050508', overflow: 'hidden' }}>
      
      {/* Botón flotante móvil */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 60,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#38bdf8',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
        >
          ☰ Viñetas ({activeFrameIdx + 1}/{activeTimeline.length})
        </button>
      )}

      {/* Overlay móvil */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 45 }}
        />
      )}

      {/* Barra Lateral de Viñetas */}
      <div style={{
        position: isMobile ? 'absolute' : 'relative',
        top: 0,
        left: 0,
        width: isMobile ? 240 : 180,
        height: '100%',
        background: currentBranchId !== 'main' ? '#14101e' : '#0e0e14',
        borderRight: currentBranchId !== 'main' ? '2px solid #a855f7' : '1px solid #1f1f2e',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        flexShrink: 0,
        transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.25s ease'
      }}>
        {isMobile && (
          <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f1f2e' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>Guion Gráfico</span>
            <button 
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        <div style={{ padding: 8, borderBottom: '1px solid #1f1f2e', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => setShowBranchesModal(true)}
            style={{
              width: '100%',
              padding: '6px',
              background: currentBranchId !== 'main' ? '#7c3aed' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🗺️ Vías y Ramas
          </button>

          <button
            onClick={() => setShowVariablesModal(true)}
            style={{
              width: '100%',
              padding: '6px',
              background: 'rgba(255,255,255,0.06)',
              color: '#38bdf8',
              border: '1px solid rgba(56,189,248,0.2)',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⚙️ Memoria ({Object.keys(project.variables || {}).length})
          </button>
        </div>

        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid #1f1f2e' }}>
          <button
            onClick={handleAddDialogue}
            style={{
              padding: '8px',
              background: currentBranchId !== 'main' ? '#9333ea' : '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Diálogo
          </button>

          <button
            onClick={handleAddChoice}
            style={{
              padding: '6px',
              background: '#581c87',
              border: '1px solid #7e22ce',
              borderRadius: 6,
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Decisión
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeTimeline.map((evt, idx) => {
            const isActive = idx === activeFrameIdx;
            const speaker = evt.type === 'dialogue' ? project.characters[evt.speakerId] : null;

            return (
              <div
                key={evt.id || idx}
                draggable
                onDragStart={() => setDraggedTimelineIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedTimelineIdx !== null && draggedTimelineIdx !== idx) {
                    reorderTimelineEvents(draggedTimelineIdx, idx);
                    setActiveFrameIdx(idx);
                  }
                  setDraggedTimelineIdx(null);
                }}
                onClick={() => {
                  setActiveFrameIdx(idx);
                  if (isMobile) setSidebarOpen(false);
                }}
                style={{
                  minHeight: 65,
                  background: isActive ? (currentBranchId !== 'main' ? '#3b2554' : '#242436') : '#14141c',
                  borderRadius: 6,
                  border: isActive ? `2px solid ${currentBranchId !== 'main' ? '#c084fc' : '#38bdf8'}` : '1px solid #2a2a38',
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: '#666' }}>#{idx + 1}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {evt.type === 'dialogue' && (
                      <button
                        title="Duplicar viñeta base"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateTimelineEventBase(idx);
                        }}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer' }}
                      >
                        📋
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTimelineEvent(idx);
                        if (activeFrameIdx >= idx && activeFrameIdx > 0) setActiveFrameIdx(prev => prev - 1);
                      }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {evt.type === 'dialogue' && (
                  <div style={{ fontSize: 10, color: speaker?.color || '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {speaker?.name || 'Narrador'}: <span style={{ color: '#aaa', fontWeight: 'normal' }}>{evt.text || '...'}</span>
                    <div style={{ fontSize: 8, color: '#888' }}>
                      👥 {evt.charactersOnStage?.length || 0} en escena
                    </div>
                  </div>
                )}

                {evt.type === 'choice' && (
                  <div style={{ fontSize: 10, color: '#c084fc', fontWeight: 600 }}>🔀 Decisión</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas Central WYSIWYG */}
      <div 
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#09090e',
          padding: isMobile ? 6 : 12,
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        <div 
          ref={canvasRef}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCharPointerUp}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '100%',
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
            touchAction: 'none'
          }}
        >
          {/* Guías Magnéticas */}
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
                  <span style={{
                    position: 'absolute',
                    top: 8,
                    left: 4,
                    fontSize: 8,
                    color: activeHoverSlotX === s.slot ? '#38bdf8' : 'rgba(255,255,255,0.4)',
                    fontWeight: 'bold'
                  }}>
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
                  <span style={{
                    position: 'absolute',
                    right: 8,
                    bottom: 2,
                    fontSize: 8,
                    color: activeHoverSlotY === s.slot ? '#c084fc' : 'rgba(255,255,255,0.4)',
                    fontWeight: 'bold'
                  }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Barra Superior */}
          <div style={{ 
            position: 'absolute', 
            top: isMobile ? 42 : 12, 
            left: 12, 
            right: 12, 
            zIndex: 40, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            gap: 6, 
            flexWrap: 'wrap' 
          }}>
            <button
              onClick={() => setShowBgGalleryModal(true)}
              style={{
                background: 'rgba(15, 15, 22, 0.85)',
                backdropFilter: 'blur(6px)',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                cursor: 'pointer'
              }}
            >
              🖼️ Fondo de Escena
            </button>

            {currentEvent?.type === 'dialogue' && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.values(project.characters).map(char => {
                  const onStage = currentEvent.charactersOnStage.some(c => c.characterId === char.id);
                  return (
                    <button
                      key={char.id}
                      onClick={() => handleToggleCharacterOnStage(char.id)}
                      style={{
                        background: onStage ? char.color : 'rgba(15, 15, 22, 0.8)',
                        backdropFilter: 'blur(6px)',
                        color: onStage ? '#000' : '#fff',
                        border: `1px solid ${char.color}`,
                        borderRadius: 20,
                        padding: '3px 10px',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: onStage ? 'bold' : 'normal'
                      }}
                    >
                      {onStage ? '✓ ' : '+ '}{char.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Personajes en Escena */}
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

          {/* Decisiones en Pantalla */}
          {currentEvent?.type === 'choice' && (
            <div style={{
              position: 'absolute',
              top: '12%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '88%',
              maxWidth: 520,
              maxHeight: '80%',
              overflowY: 'auto',
              background: 'rgba(15, 15, 24, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 12,
              padding: 14,
              border: '1.5px solid #a855f7',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              zIndex: 35,
              boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
            }}>
              <input 
                type="text"
                value={currentEvent.prompt}
                onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, prompt: e.target.value })}
                placeholder="Pregunta o dilema central..."
                style={{
                  width: '100%',
                  background: '#0a0a10',
                  border: '1px solid #a855f7',
                  borderRadius: 6,
                  color: '#fff',
                  padding: '8px 12px',
                  fontSize: 15,
                  boxSizing: 'border-box',
                  fontWeight: 800,
                  textAlign: 'center'
                }}
              />

              {currentEvent.options.map((opt, oIdx) => (
                <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#1c1c28', padding: 10, borderRadius: 8, border: '1px solid #2e2e42' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input 
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const copy = [...currentEvent.options];
                        copy[oIdx].text = e.target.value;
                        updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                      }}
                      placeholder="Texto de la opción"
                      style={{
                        flex: 1,
                        background: '#0e0e16',
                        border: '1px solid #3b3b4f',
                        borderRadius: 6,
                        color: '#fff',
                        padding: '6px 10px',
                        fontSize: 13,
                        fontWeight: 700
                      }}
                    />
                    <button
                      onClick={() => {
                        const copy = currentEvent.options.filter((_, i) => i !== oIdx);
                        updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                      }}
                      style={{ background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Destino */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#0d0d14', padding: 6, borderRadius: 6 }}>
                    <span style={{ fontSize: 11, color: '#c084fc', fontWeight: 700 }}>Destino:</span>
                    <select
                      value={opt.jumpToBranchId || ''}
                      onChange={(e) => {
                        const copy = [...currentEvent.options];
                        copy[oIdx].jumpToBranchId = e.target.value || undefined;
                        copy[oIdx].jumpToEventIndex = 0;
                        updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                      }}
                      style={{ flex: 1, background: '#161622', color: '#c084fc', border: '1px solid #444', borderRadius: 4, fontSize: 11, padding: '4px 6px' }}
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
                        style={{ width: 100, background: '#161622', color: '#38bdf8', border: '1px solid #444', borderRadius: 4, fontSize: 11, padding: '4px 6px' }}
                      >
                        {Array.from({ length: getTargetBranchEventsCount(opt.jumpToBranchId) }).map((_, i) => (
                          <option key={i} value={i}>Viñeta #{i + 1}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Modificar Memoria */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700 }}>⚡ Memoria:</span>
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
                      + Estado
                    </button>
                  </div>

                  {opt.variableChanges?.map((ch, cIdx) => (
                    <div key={cIdx} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <select
                        value={ch.variableName}
                        onChange={(e) => {
                          const copy = [...currentEvent.options];
                          copy[oIdx].variableChanges![cIdx].variableName = e.target.value;
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                        }}
                        style={{ flex: 1.5, background: '#0a0a0f', color: '#fff', border: '1px solid #333', fontSize: 11, padding: 3, borderRadius: 4 }}
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
                        style={{ flex: 1, background: '#0a0a0f', color: '#a7f3d0', border: '1px solid #333', fontSize: 11, padding: 3, borderRadius: 4 }}
                      >
                        <option value="set">=</option>
                        <option value="add">+</option>
                        <option value="subtract">-</option>
                        <option value="toggle">Inv</option>
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
                          style={{ width: 45, background: '#0a0a0f', color: '#fff', border: '1px solid #333', fontSize: 11, textAlign: 'center', padding: 3, borderRadius: 4 }}
                        />
                      )}

                      <button
                        onClick={() => {
                          const copy = [...currentEvent.options];
                          copy[oIdx].variableChanges = copy[oIdx].variableChanges!.filter((_, i) => i !== cIdx);
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: copy });
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              <button
                onClick={() => {
                  const newOpt = { id: `opt_${Date.now()}`, text: 'Nueva opción', variableChanges: [] };
                  updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: [...currentEvent.options, newOpt] });
                }}
                style={{
                  background: '#581c87',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  padding: '8px',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                + Añadir Opción
              </button>
            </div>
          )}

          {/* Caja de Diálogo con Escala Completa y Cómoda */}
          {currentEvent?.type === 'dialogue' && (
            <div style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '94%',
              background: 'rgba(10, 10, 15, 0.94)',
              backdropFilter: 'blur(10px)',
              border: `2px solid ${project.characters[currentEvent.speakerId]?.color || '#3b82f6'}`,
              borderRadius: 14,
              padding: '12px 18px',
              zIndex: 30,
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 6, flexWrap: 'wrap' }}>
                <select
                  value={currentEvent.speakerId}
                  onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, speakerId: e.target.value })}
                  style={{
                    background: '#1a1a24',
                    color: project.characters[currentEvent.speakerId]?.color || '#fff',
                    border: '1px solid #333',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 14,
                    fontWeight: 800
                  }}
                >
                  <option value="narrator">Narrador</option>
                  {Object.values(project.characters).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select
                    value={currentEvent.jumpToBranchId || ''}
                    onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, jumpToBranchId: e.target.value || undefined, jumpToEventIndex: 0 })}
                    style={{ background: '#1a1a26', color: '#c084fc', border: '1px solid #333', borderRadius: 4, fontSize: 11, padding: '3px 6px' }}
                  >
                    <option value="">➡️ Vía Directa</option>
                    <option value="main">🌿 Tronco</option>
                    {Object.values(branchesMap).map(b => (
                      <option key={b.id} value={b.id}>🔀 {b.name}</option>
                    ))}
                  </select>

                  {currentEvent.jumpToBranchId && (
                    <select
                      value={currentEvent.jumpToEventIndex ?? 0}
                      onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, jumpToEventIndex: Number(e.target.value) })}
                      style={{ width: 90, background: '#1a1a26', color: '#38bdf8', border: '1px solid #333', borderRadius: 4, fontSize: 11, padding: '3px 6px' }}
                    >
                      {Array.from({ length: getTargetBranchEventsCount(currentEvent.jumpToBranchId) }).map((_, i) => (
                        <option key={i} value={i}>Viñeta #{i + 1}</option>
                      ))}
                    </select>
                  )}

                  <select
                    value={currentEvent.effect || 'none'}
                    onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, effect: e.target.value as ScreenEffect })}
                    style={{ background: '#1a1a26', color: '#aaa', border: '1px solid #333', borderRadius: 4, fontSize: 11, padding: '3px 6px' }}
                  >
                    <option value="none">Sin Efecto</option>
                    <option value="shake">💥 Temblor</option>
                    <option value="flash">⚡ Flash</option>
                    <option value="fade_black">🌑 Fundido</option>
                  </select>
                </div>
              </div>

              <textarea 
                value={currentEvent.text}
                onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, text: e.target.value })}
                placeholder="Escribe el diálogo aquí..."
                rows={2}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: 15,
                  lineHeight: 1.4,
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Menú Modal de Edición del Personaje */}
      {editingCharInstance && editingCharDef && (
        <div 
          onClick={() => setActiveEditingCharId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 5, 10, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: '#13131c',
              border: `2px solid ${editingCharDef.color}`,
              borderRadius: 14,
              padding: 14,
              width: '100%',
              maxWidth: 400,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 20px 50px rgba(0,0,0,0.9)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: editingCharDef.color, fontSize: 14 }}>
                🎭 {editingCharDef.name}
              </span>
              <button onClick={() => setActiveEditingCharId(null)} style={{ background: 'none', border: 'none', color: '#999', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 11, color: '#aaa' }}>Expresiones disponibles:</label>
                <button
                  onClick={() => {
                    const tag = prompt('Nombre para la nueva expresión (ej. feliz, enojada):');
                    if (!tag) return;
                    
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target?.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        if (typeof evt.target?.result === 'string') {
                          const spriteUrl = evt.target.result;
                          const updatedChar = {
                            ...editingCharDef,
                            expressions: { ...editingCharDef.expressions, [tag.toLowerCase()]: spriteUrl }
                          };
                          setProject(prev => ({
                            ...prev,
                            characters: { ...prev.characters, [editingCharDef.id]: updatedChar }
                          }));
                        }
                      };
                      reader.readAsDataURL(file);
                    };
                    input.click();
                  }}
                  style={{ background: 'rgba(56,189,248,0.15)', border: '1px dashed #38bdf8', color: '#38bdf8', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}
                >
                  + Importar Sprite
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxHeight: 120, overflowY: 'auto' }}>
                {Object.entries(editingCharDef.expressions || {}).map(([exprKey, spriteUrl]) => (
                  <div
                    key={exprKey}
                    onClick={() => {
                      const updated = currentEvent?.type === 'dialogue' && currentEvent.charactersOnStage.map(c => 
                        c.characterId === editingCharInstance.characterId ? { ...c, expression: exprKey } : c
                      );
                      if (updated && currentEvent?.type === 'dialogue') updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updated });
                    }}
                    style={{
                      width: 52,
                      height: 60,
                      background: editingCharInstance.expression === exprKey ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0,0,0,0.3)',
                      border: `2px solid ${editingCharInstance.expression === exprKey ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 6,
                      padding: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <img src={spriteUrl} alt={exprKey} style={{ width: '100%', height: 38, objectFit: 'contain' }} />
                    <span style={{ fontSize: 8, color: '#fff', textTransform: 'capitalize' }}>{exprKey}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginBottom: 2 }}>
                <span>💡 Brillo / Iluminación:</span>
                <span>{editingCharInstance.brightness}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                step="10"
                value={editingCharInstance.brightness}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const updated = currentEvent?.type === 'dialogue' && currentEvent.charactersOnStage.map(c => 
                    c.characterId === editingCharInstance.characterId ? { ...c, brightness: val } : c
                  );
                  if (updated && currentEvent?.type === 'dialogue') updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updated });
                }}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 2 }}>Tamaño:</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {SCALES.map(s => (
                  <button
                    key={s.scale}
                    onClick={() => {
                      const updated = currentEvent?.type === 'dialogue' && currentEvent.charactersOnStage.map(c => 
                        c.characterId === editingCharInstance.characterId ? { ...c, scale: s.scale } : c
                      );
                      if (updated && currentEvent?.type === 'dialogue') updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updated });
                    }}
                    style={{
                      flex: 1,
                      padding: '4px',
                      background: editingCharInstance.scale === s.scale ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                      color: editingCharInstance.scale === s.scale ? '#000' : '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 2 }}>Animación al entrar:</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ANIMATIONS.map(a => (
                  <button
                    key={a.anim}
                    onClick={() => {
                      const updated = currentEvent?.type === 'dialogue' && currentEvent.charactersOnStage.map(c => 
                        c.characterId === editingCharInstance.characterId ? { ...c, animation: a.anim } : c
                      );
                      if (updated && currentEvent?.type === 'dialogue') updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updated });
                    }}
                    style={{
                      flex: '1 1 45%',
                      padding: '4px',
                      background: (editingCharInstance.animation || 'none') === a.anim ? '#a855f7' : 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setActiveEditingCharId(null)}
              style={{ padding: 6, background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', marginTop: 4 }}
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Modal Galería de Fondos */}
      {showBgGalleryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 540, background: '#12121a', border: '1px solid #333', borderRadius: 12, padding: 16, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>Galería de Fondos</span>
              <button onClick={() => setShowBgGalleryModal(false)} style={{ background: 'none', border: 'none', color: '#999', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {project.backgroundGallery?.map(bg => (
                <div 
                  key={bg.id}
                  onClick={() => handleSelectBackground(bg.url)}
                  style={{ cursor: 'pointer', border: '1px solid #333', borderRadius: 8, overflow: 'hidden', background: '#0a0a0f' }}
                >
                  <img src={bg.url} alt={bg.name} style={{ width: '100%', height: 75, objectFit: 'cover' }} />
                  <div style={{ padding: 4, fontSize: 10, color: '#ddd', textAlign: 'center' }}>{bg.name}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => bgImportInputRef.current?.click()}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              + Importar Fondo Personalizado
            </button>
            <input type="file" ref={bgImportInputRef} onChange={handleImportBgToGallery} accept="image/*" style={{ display: 'none' }} />
          </div>
        </div>
      )}

      {/* Modal Vías y Ramas */}
      {showBranchesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 420, background: '#12121a', border: '1px solid #333', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>Vías y Ramas de la Escena</span>
              <button onClick={() => setShowBranchesModal(false)} style={{ background: 'none', border: 'none', color: '#999', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>

            <button
              onClick={() => { setCurrentBranchId('main'); setActiveFrameIdx(0); setShowBranchesModal(false); }}
              style={{
                background: currentBranchId === 'main' ? '#2563eb' : '#1c1c28',
                color: '#fff',
                border: '1px solid #3b3b4f',
                borderRadius: 6,
                padding: '8px 12px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              🌿 Vía Principal (Main)
            </button>

            {Object.values(branchesMap).map(br => (
              <div key={br.id} style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { setCurrentBranchId(br.id); setActiveFrameIdx(0); setShowBranchesModal(false); }}
                  style={{
                    flex: 1,
                    background: currentBranchId === br.id ? '#7c3aed' : '#1c1c28',
                    color: '#fff',
                    border: '1px solid #3b3b4f',
                    borderRadius: 6,
                    padding: '8px 12px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  🔀 {br.name}
                </button>
                <button
                  onClick={() => deleteBranch(br.id)}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '0 10px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            ))}

            <form onSubmit={handleCreateNewBranch} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input 
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Nombre de la nueva rama..."
                style={{ flex: 1, background: '#0a0a0f', border: '1px solid #333', borderRadius: 6, color: '#fff', padding: '6px 10px', fontSize: 12 }}
              />
              <button type="submit" style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                Crear
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Variables */}
      <VariablesModal isOpen={showVariablesModal} onClose={() => setShowVariablesModal(false)} />
    </div>
  );
}
