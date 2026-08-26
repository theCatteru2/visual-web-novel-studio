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
  VariableChange,
  VariableOperation
} from '../types';
import VariablesModal from './VariablesModal';

const SLOTS_X: { slot: MagneticSlot; label: string; xPercent: number }[] = [
  { slot: 'left', label: 'Izq', xPercent: 18 },
  { slot: 'center-left', label: 'C-Izq', xPercent: 34 },
  { slot: 'center', label: 'Centro', xPercent: 50 },
  { slot: 'center-right', label: 'C-Der', xPercent: 66 },
  { slot: 'right', label: 'Der', xPercent: 82 },
];

const SLOTS_Y: { slot: VerticalSlot; label: string; bottomPercent: number; yDetectPercent: number }[] = [
  { slot: 'sink', label: 'Muy Abajo', bottomPercent: -12, yDetectPercent: 92 },
  { slot: 'floor', label: 'Abajo / Suelo', bottomPercent: 0, yDetectPercent: 80 },
  { slot: 'ground', label: 'Normal', bottomPercent: 10, yDetectPercent: 66 },
  { slot: 'elevated', label: 'Elevado', bottomPercent: 22, yDetectPercent: 48 },
  { slot: 'floating', label: 'Flotando', bottomPercent: 36, yDetectPercent: 26 }
];

const SCALES: { scale: CharacterScale; label: string; heightPercent: number }[] = [
  { scale: 'small', label: 'Pequeño', heightPercent: 50 },
  { scale: 'medium', label: 'Medio', heightPercent: 70 },
  { scale: 'large', label: 'Grande', heightPercent: 88 },
  { scale: 'closeup', label: 'Primer Plano', heightPercent: 105 }
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

  // Responsive / Drawer móvil
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
  const [draggedTimelineIdx, setDraggedTimelineIdx] = useState<number | null>(null);

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const holdTimerRef = useRef<number | null>(null);
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
    setDraggingCharId(charId);
    touchStartPos.current = { x: e.clientX, y: e.clientY };

    holdTimerRef.current = window.setTimeout(() => {
      setActiveEditingCharId(charId);
      setDraggingCharId(null);
    }, 450);
  };

  const handleCharPointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setDraggingCharId(null);
    touchStartPos.current = null;
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!draggingCharId || !canvasRef.current || currentEvent?.type !== 'dialogue') return;

    if (touchStartPos.current) {
      const dist = Math.hypot(e.clientX - touchStartPos.current.x, e.clientY - touchStartPos.current.y);
      if (dist > 8 && holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
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

  const handleAddVariableChangeToOption = (optionId: string) => {
    if (currentEvent?.type !== 'choice') return;
    const varNames = Object.keys(project.variables || {});
    if (varNames.length === 0) {
      setShowVariablesModal(true);
      return;
    }

    const newChange: VariableChange = {
      variableName: varNames[0],
      operation: 'set',
      valueType: 'literal',
      value: true
    };

    const updatedOpts = currentEvent.options.map(o => {
      if (o.id === optionId) {
        return { ...o, variableChanges: [...(o.variableChanges || []), newChange] };
      }
      return o;
    });

    updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: updatedOpts });
  };

  const editingCharInstance = currentEvent?.type === 'dialogue'
    ? currentEvent.charactersOnStage.find(c => c.characterId === activeEditingCharId)
    : null;
  const editingCharDef = editingCharInstance ? project.characters[editingCharInstance.characterId] : null;

  return (
    <div style={{ position: 'relative', width: '100vw', height: 'calc(100vh - 52px)', display: 'flex', background: '#050508', overflow: 'hidden' }}>
      
      {/* Botón flotante móvil para abrir el panel de viñetas */}
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
            padding: '6px 10px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
        >
          ☰ Viñetas ({activeFrameIdx + 1}/{activeTimeline.length})
        </button>
      )}

      {/* Overlay para cerrar sidebar en móvil */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 45 }}
        />
      )}

      {/* Barra Lateral / Drawer Móvil */}
      <div style={{
        position: isMobile ? 'absolute' : 'relative',
        top: 0,
        left: 0,
        width: isMobile ? 240 : 175,
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
        {/* Encabezado Drawer Móvil */}
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

        {/* Botones de Navegación y Variables */}
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
            🧮 Variables ({Object.keys(project.variables || {}).length})
          </button>
        </div>

        {/* Acciones */}
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

        {/* Viñetas Verticales */}
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
                        title="Duplicar base (Escena y personajes sin texto)"
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

      {/* Canvas Central */}
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
          {/* Barra de Gestión de Personajes */}
          {currentEvent?.type === 'dialogue' && (
            <div style={{ 
              position: 'absolute', 
              top: isMobile ? 40 : 12, 
              left: 12, 
              zIndex: 40, 
              display: 'flex', 
              gap: 4, 
              background: 'rgba(0,0,0,0.6)', 
              padding: 3, 
              borderRadius: 8, 
              backdropFilter: 'blur(6px)',
              maxWidth: '65%',
              overflowX: 'auto'
            }}>
              {Object.values(project.characters).map(char => {
                const isPresent = currentEvent.charactersOnStage.some(c => c.characterId === char.id);
                return (
                  <button
                    key={char.id}
                    onClick={() => handleToggleCharacterOnStage(char.id)}
                    style={{
                      padding: '3px 6px',
                      background: isPresent ? char.color : 'rgba(255,255,255,0.1)',
                      color: isPresent ? '#000' : '#aaa',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 9,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {char.name} {isPresent ? '✓' : '+'}
                  </button>
                );
              })}
            </div>
          )}

          {/* Botón Fondos */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 40 }}>
            <button
              onClick={() => setShowBgGalleryModal(true)}
              style={{
                padding: '4px 8px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                borderRadius: 8,
                fontSize: 10,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              🖼️ Fondos
            </button>
          </div>

          {/* Personajes en Canvas */}
          {currentEvent?.type === 'dialogue' && currentEvent.charactersOnStage.map(inst => {
            const charDef = project.characters[inst.characterId];
            if (!charDef) return null;

            const slotX = SLOTS_X.find(s => s.slot === inst.slot)?.xPercent || 50;
            const slotY = SLOTS_Y.find(s => s.slot === (inst.verticalSlot || 'floor'))?.bottomPercent || 0;
            const scale = SCALES.find(s => s.scale === (inst.scale || 'medium'))?.heightPercent || 70;
            const isDraggingThis = draggingCharId === inst.characterId;

            return (
              <div
                key={inst.characterId}
                onPointerDown={(e) => handleCharPointerDown(e, inst.characterId)}
                onPointerUp={handleCharPointerUp}
                style={{
                  position: 'absolute',
                  bottom: `${slotY}%`,
                  left: `${slotX}%`,
                  transform: 'translateX(-50%)',
                  cursor: isDraggingThis ? 'grabbing' : 'grab',
                  zIndex: 10,
                  height: `${scale}%`,
                  transition: isDraggingThis ? 'none' : 'bottom 0.15s ease, left 0.15s ease, filter 0.2s ease',
                  pointerEvents: 'auto',
                  touchAction: 'none',
                  filter: `brightness(${inst.brightness / 100}) ${isDraggingThis ? 'drop-shadow(0 0 14px #38bdf8)' : 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))'}`
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

          {/* Rueda / Menú de Estado del Personaje */}
          {activeEditingCharId && editingCharInstance && editingCharDef && currentEvent?.type === 'dialogue' && (
            <div 
              onClick={() => setActiveEditingCharId(null)}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(5, 5, 10, 0.8)',
                backdropFilter: 'blur(6px)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 10
              }}
            >
              <div 
                onClick={e => e.stopPropagation()}
                style={{
                  background: '#13131c',
                  padding: 12,
                  borderRadius: 14,
                  border: `1.5px solid ${editingCharDef.color}`,
                  boxShadow: '0 25px 50px rgba(0,0,0,0.9)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxWidth: 380,
                  width: '100%',
                  maxHeight: '90%',
                  overflowY: 'auto'
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: editingCharDef.color, marginBottom: 4 }}>
                    🎭 Expresión para {editingCharDef.name}:
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {Object.entries(editingCharDef.expressions || {}).map(([exprKey, spriteUrl]) => (
                      <div
                        key={exprKey}
                        onClick={() => {
                          const updated = currentEvent.charactersOnStage.map(c => c.characterId === editingCharInstance.characterId ? { ...c, expression: exprKey } : c);
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updated });
                        }}
                        style={{
                          width: 48,
                          height: 56,
                          background: editingCharInstance.expression === exprKey ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.3)',
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
                        <img src={spriteUrl} alt={exprKey} style={{ width: '100%', height: 34, objectFit: 'contain' }} />
                        <span style={{ fontSize: 8, color: '#fff', textTransform: 'capitalize' }}>{exprKey}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>
                    <span>💡 Iluminación / Brillo:</span>
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
                      const updated = currentEvent.charactersOnStage.map(c => c.characterId === editingCharInstance.characterId ? { ...c, brightness: val } : c);
                      updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updated });
                    }}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                  />
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 2 }}>
                    🎬 Animación al entrar:
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {ANIMATIONS.map(a => {
                      const isSel = (editingCharInstance.animation || 'none') === a.anim;
                      return (
                        <button
                          key={a.anim}
                          onClick={() => {
                            const updated = currentEvent.charactersOnStage.map(c => c.characterId === editingCharInstance.characterId ? { ...c, animation: a.anim } : c);
                            updateTimelineEvent(activeFrameIdx, { ...currentEvent, charactersOnStage: updated });
                          }}
                          style={{
                            flex: '1 1 45%',
                            padding: '3px',
                            background: isSel ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                            color: isSel ? '#0f172a' : '#fff',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 9,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setActiveEditingCharId(null)}
                  style={{ width: '100%', padding: 6, background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 11 }}
                >
                  Listo
                </button>
              </div>
            </div>
          )}

          {/* Editor de Decisión */}
          {currentEvent?.type === 'choice' && (
            <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: 440, maxHeight: '84%', overflowY: 'auto', zIndex: 20 }}>
              <input 
                type="text"
                value={currentEvent.prompt}
                onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, prompt: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(15, 15, 25, 0.95)',
                  color: '#c084fc',
                  fontWeight: 600,
                  padding: '6px',
                  borderRadius: 6,
                  border: '1px solid #a855f7',
                  textAlign: 'center',
                  marginBottom: 6,
                  fontSize: 12,
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {currentEvent.options.map((opt) => (
                  <div key={opt.id} style={{ background: '#1b1b28', border: '1px solid #3c3c52', borderRadius: 6, padding: 6 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      <input 
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = currentEvent.options.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o);
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: newOpts });
                        }}
                        style={{ flex: 2, background: '#111', color: '#fff', padding: '3px 6px', borderRadius: 4, border: '1px solid #444', fontSize: 11 }}
                      />
                      <select
                        value={opt.jumpToBranchId || ''}
                        onChange={(e) => {
                          const newOpts = currentEvent.options.map(o => o.id === opt.id ? { ...o, jumpToBranchId: e.target.value } : o);
                          updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: newOpts });
                        }}
                        style={{ flex: 1, background: '#111', color: '#c084fc', border: '1px solid #444', borderRadius: 4, fontSize: 10 }}
                      >
                        <option value="">(Recto)</option>
                        <option value="main">🌳 Tronco</option>
                        {Object.values(branchesMap).map(b => (
                          <option key={b.id} value={b.id}>🌿 {b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ background: '#14141e', padding: 4, borderRadius: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontSize: 9, color: '#38bdf8' }}>⚙️ Variables:</span>
                        <button
                          onClick={() => handleAddVariableChangeToOption(opt.id)}
                          style={{ padding: '2px 4px', background: '#38bdf8', color: '#000', border: 'none', borderRadius: 4, fontSize: 8, fontWeight: 700, cursor: 'pointer' }}
                        >
                          + Op
                        </button>
                      </div>

                      {opt.variableChanges?.map((ch, cIdx) => (
                        <div key={cIdx} style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 2 }}>
                          <select
                            value={ch.variableName}
                            onChange={(e) => {
                              const copy = [...(opt.variableChanges || [])];
                              copy[cIdx].variableName = e.target.value;
                              const newOpts = currentEvent.options.map(o => o.id === opt.id ? { ...o, variableChanges: copy } : o);
                              updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: newOpts });
                            }}
                            style={{ flex: 2, background: '#0a0a0f', color: '#fff', border: '1px solid #333', fontSize: 9, borderRadius: 2, padding: 1 }}
                          >
                            {Object.keys(project.variables || {}).map(vn => (
                              <option key={vn} value={vn}>{vn}</option>
                            ))}
                          </select>

                          <select
                            value={ch.operation}
                            onChange={(e) => {
                              const copy = [...(opt.variableChanges || [])];
                              copy[cIdx].operation = e.target.value as VariableOperation;
                              const newOpts = currentEvent.options.map(o => o.id === opt.id ? { ...o, variableChanges: copy } : o);
                              updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: newOpts });
                            }}
                            style={{ flex: 1, background: '#0a0a0f', color: '#a7f3d0', border: '1px solid #333', fontSize: 9, borderRadius: 2, padding: 1 }}
                          >
                            <option value="set">=</option>
                            <option value="add">+</option>
                            <option value="subtract">-</option>
                            <option value="multiply">×</option>
                            <option value="divide">÷</option>
                            <option value="toggle">Alt</option>
                          </select>

                          {ch.operation !== 'toggle' && (
                            <input 
                              type="text"
                              value={String(ch.value)}
                              onChange={(e) => {
                                const copy = [...(opt.variableChanges || [])];
                                copy[cIdx].value = e.target.value;
                                const newOpts = currentEvent.options.map(o => o.id === opt.id ? { ...o, variableChanges: copy } : o);
                                updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: newOpts });
                              }}
                              style={{ flex: 1, background: '#0a0a0f', color: '#fff', border: '1px solid #333', fontSize: 9, borderRadius: 2, padding: 1 }}
                            />
                          )}

                          <button
                            onClick={() => {
                              const copy = opt.variableChanges?.filter((_, i) => i !== cIdx);
                              const newOpts = currentEvent.options.map(o => o.id === opt.id ? { ...o, variableChanges: copy } : o);
                              updateTimelineEvent(activeFrameIdx, { ...currentEvent, options: newOpts });
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 9, cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                border: `2px solid ${project.characters[currentEvent.speakerId]?.color || '#3b82f6'}`,
                borderRadius: 10,
                padding: '6px 10px',
                zIndex: 20,
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, gap: 4 }}>
                <select
                  value={currentEvent.speakerId}
                  onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, speakerId: e.target.value })}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: project.characters[currentEvent.speakerId]?.color || '#fff',
                    fontWeight: 700,
                    fontSize: isMobile ? 12 : 14,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="narrator" style={{ background: '#111', color: '#fff' }}>Narrador</option>
                  {Object.values(project.characters).map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#111', color: '#fff' }}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: 4 }}>
                  <select
                    value={currentEvent.jumpToBranchId || ''}
                    onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, jumpToBranchId: e.target.value })}
                    style={{ background: '#1a1a26', color: '#c084fc', border: '1px solid #333', borderRadius: 4, fontSize: 9, padding: '1px 4px' }}
                  >
                    <option value="">➡️ Vía</option>
                    <option value="main">🌳 Tronco</option>
                    {Object.values(branchesMap).map(b => (
                      <option key={b.id} value={b.id}>🌿 {b.name}</option>
                    ))}
                  </select>

                  <select
                    value={currentEvent.effect || 'none'}
                    onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, effect: e.target.value as ScreenEffect })}
                    style={{ background: '#1a1a26', color: '#aaa', border: '1px solid #333', borderRadius: 4, fontSize: 9, padding: '1px 4px' }}
                  >
                    <option value="none">Efecto</option>
                    <option value="shake">💥 Temblor</option>
                    <option value="flash">⚡ Flash</option>
                    <option value="fade_black">🌑 Fundido</option>
                  </select>
                </div>
              </div>

              <textarea
                rows={2}
                value={currentEvent.text}
                onChange={(e) => updateTimelineEvent(activeFrameIdx, { ...currentEvent, text: e.target.value })}
                placeholder="Escribe el diálogo aquí..."
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: isMobile ? 12 : 13, resize: 'none', outline: 'none' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal Galería */}
      {showBgGalleryModal && (
        <div 
          onClick={() => setShowBgGalleryModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 5, 10, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 110,
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
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 620,
              padding: 16,
              color: '#fff'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>🖼️ Galería de Fondos</h3>
              <input type="file" ref={bgImportInputRef} accept="image/*" onChange={handleImportBgToGallery} style={{ display: 'none' }} />
              <button
                onClick={() => bgImportInputRef.current?.click()}
                style={{ padding: '6px 10px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                + Importar
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {(project.backgroundGallery || []).map(bg => (
                <div
                  key={bg.id}
                  onClick={() => handleSelectBackground(bg.url)}
                  style={{
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: currentScene?.backgroundUrl === bg.url ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <img src={bg.url} alt={bg.name} style={{ width: '100%', height: 70, objectFit: 'cover' }} />
                  <div style={{ padding: '2px 4px', background: 'rgba(0,0,0,0.7)', fontSize: 9, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {bg.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Vías */}
      {showBranchesModal && (
        <div 
          onClick={() => setShowBranchesModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: '#151520',
              border: '1px solid #333',
              borderRadius: 14,
              width: '100%',
              maxWidth: 480,
              padding: 14,
              color: '#fff'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: 15 }}>🗺️ Ramas y Vías</h3>
            
            <div
              onClick={() => {
                setCurrentBranchId('main');
                setActiveFrameIdx(0);
                setShowBranchesModal(false);
              }}
              style={{
                background: currentBranchId === 'main' ? '#1e3a8a' : '#1c1c28',
                border: `2px solid ${currentBranchId === 'main' ? '#38bdf8' : '#333'}`,
                borderRadius: 8,
                padding: 10,
                cursor: 'pointer',
                marginBottom: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong style={{ fontSize: 13 }}>🌳 Tronco Principal</strong>
              </div>
              <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4 }}>
                {currentScene?.timeline.length || 0} evts
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', marginBottom: 10 }}>
              {Object.values(branchesMap).map(b => (
                <div
                  key={b.id}
                  onClick={() => {
                    setCurrentBranchId(b.id);
                    setActiveFrameIdx(0);
                    setShowBranchesModal(false);
                  }}
                  style={{
                    background: currentBranchId === b.id ? '#581c87' : '#1a1a24',
                    border: `2px solid ${currentBranchId === b.id ? '#c084fc' : '#2d2d3d'}`,
                    borderRadius: 8,
                    padding: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <strong style={{ fontSize: 12, color: '#c084fc' }}>🌿 {b.name}</strong>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBranch(b.id);
                    }}
                    style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 9, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateNewBranch} style={{ display: 'flex', gap: 6 }}>
              <input 
                type="text"
                placeholder="Nombre de la rama..."
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                style={{ flex: 1, padding: 6, background: '#0a0a0f', color: '#fff', border: '1px solid #333', borderRadius: 6, fontSize: 11 }}
                required
              />
              <button 
                type="submit"
                style={{ padding: '6px 12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
              >
                + Crear
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Variables */}
      <VariablesModal 
        isOpen={showVariablesModal} 
        onClose={() => setShowVariablesModal(false)} 
      />

    </div>
  );
}