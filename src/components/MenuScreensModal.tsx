import React, { useEffect, useRef, useState } from 'react';
import { useNovel } from '../context/NovelContext';
import {
  MenuScreen,
  MenuElement,
  MenuElementType,
  MagneticSlot,
  VerticalSlot,
  VariableChange
} from '../types';

interface MenuScreensModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MENU_SLOTS_X: { slot: MagneticSlot; label: string; xPercent: number }[] = [
  { slot: 'far-left', label: 'Ext-Izq', xPercent: 12 },
  { slot: 'left', label: 'Izq', xPercent: 25 },
  { slot: 'center-left', label: 'C-Izq', xPercent: 38 },
  { slot: 'center', label: 'Centro', xPercent: 50 },
  { slot: 'center-right', label: 'C-Der', xPercent: 62 },
  { slot: 'right', label: 'Der', xPercent: 75 },
  { slot: 'far-right', label: 'Ext-Der', xPercent: 88 }
];

export const MENU_SLOTS_Y: { slot: VerticalSlot; label: string; yPercent: number }[] = [
  { slot: 'sky', label: 'Arriba', yPercent: 18 },
  { slot: 'floating', label: 'Flotando', yPercent: 30 },
  { slot: 'elevated', label: 'Elevado', yPercent: 44 },
  { slot: 'ground', label: 'Centro', yPercent: 58 },
  { slot: 'floor', label: 'Suelo', yPercent: 72 },
  { slot: 'sink', label: 'Abajo', yPercent: 85 },
  { slot: 'deep_sink', label: 'Fondo', yPercent: 95 }
];

export default function MenuScreensModal({ isOpen, onClose }: MenuScreensModalProps) {
  const {
    project,
    setProject,
    currentSceneId,
    addOrUpdateMenuScreen,
    deleteMenuScreen,
    addOrUpdateMenuElement,
    deleteMenuElement
  } = useNovel();

  const customScreens = project.customScreens || {};
  const screensList = Object.values(customScreens);

  const [selectedScreenId, setSelectedScreenId] = useState<string>(screensList[0]?.id || '');
  const [activeEditingElemId, setActiveEditingElemId] = useState<string | null>(null);
  const [newScreenTitle, setNewScreenTitle] = useState('');

  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [resizingElementId, setResizingElementId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ startX: number; startWidth: number } | null>(null);

  const [activeHoverSlotX, setActiveHoverSlotX] = useState<MagneticSlot | null>(null);
  const [activeHoverSlotY, setActiveHoverSlotY] = useState<VerticalSlot | null>(null);

  const [mobileTab, setMobileTab] = useState<'canvas' | 'inspector' | 'screens'>('canvas');
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  const canvasRef = useRef<HTMLDivElement>(null);
  const btnBgInputRef = useRef<HTMLInputElement>(null);

  const activeScene =
    (project as any).scenes?.find((s: any) => s.id === currentSceneId) ||
    project.chapters?.[0]?.scenes?.find((s: any) => s.id === currentSceneId) ||
    (project as any).scenes?.[0] ||
    project.chapters?.[0]?.scenes?.[0];

  const branchesMap = activeScene?.branches || {};

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!selectedScreenId && screensList.length > 0) {
      setSelectedScreenId(screensList[0].id);
    }
  }, [selectedScreenId, screensList]);

  if (!isOpen) return null;

  const currentScreen = customScreens[selectedScreenId] || screensList[0];

  const updateElement = (element: MenuElement, changes: Partial<MenuElement>) => {
    if (!currentScreen) return;
    addOrUpdateMenuElement(currentScreen.id, {
      ...element,
      ...changes
    });
  };

  const handleCreateScreen = (type: 'start_menu' | 'end_screen' | 'custom_menu') => {
    const title =
      newScreenTitle.trim() ||
      (type === 'start_menu' ? 'Menú Principal' : type === 'end_screen' ? 'Pantalla Final' : 'Nuevo Menú');

    const timestamp = Date.now();
    const newId = `screen_${timestamp}`;
    const defaultBg = project.backgroundGallery?.[0]?.url || '';

    const titleElement: MenuElement = {
      id: `el_title_${timestamp}`,
      type: 'text',
      text: project.title || 'Título de la Novela',
      slotX: 'center',
      verticalSlot: 'sky',
      styleVariant: 'title',
      customTextColor: '#38bdf8'
    };

    const playButton: MenuElement = {
      id: `el_btn_play_${timestamp + 1}`,
      type: 'button',
      text: 'Comenzar Historia',
      slotX: 'center',
      verticalSlot: 'ground',
      styleVariant: 'primary',
      action: { type: 'start_game' }
    };

    const newScreen: MenuScreen = {
      id: newId,
      title,
      type,
      backgroundUrl: defaultBg,
      elements: [titleElement, playButton]
    };

    addOrUpdateMenuScreen(newScreen);
    setSelectedScreenId(newId);
    setActiveEditingElemId(null);
    setNewScreenTitle('');
    if (isPortrait) setMobileTab('canvas');
  };

  const handleAddElement = (type: MenuElementType) => {
    if (!currentScreen) return;

    const newElem: MenuElement = {
      id: `elem_${Date.now()}`,
      type,
      text: type === 'button' ? 'Nuevo Botón' : type === 'card' ? 'Nueva Tarjeta' : 'Texto Personalizado',
      slotX: 'center',
      verticalSlot: 'ground',
      styleVariant: type === 'button' ? 'primary' : 'subtitle',
      action: type === 'button' ? { type: 'start_game' } : undefined,
      widthPercent: type === 'button' ? 30 : undefined
    } as any;

    addOrUpdateMenuElement(currentScreen.id, newElem);
    setActiveEditingElemId(newElem.id);
  };

  const handlePointerDown = (e: React.PointerEvent, element: MenuElement) => {
    e.stopPropagation();
    if (!canvasRef.current || !currentScreen) return;

    setActiveEditingElemId(element.id);
    setDraggingElementId(element.id);
    setActiveHoverSlotX(element.slotX || 'center');
    setActiveHoverSlotY(element.verticalSlot || 'ground');
  };

  const handleResizePointerDown = (e: React.PointerEvent, element: MenuElement) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const currentW = (element as any).widthPercent || (element.type === 'button' ? 25 : 35);

    setResizingElementId(element.id);
    setResizeStart({
      startX: e.clientX,
      startWidth: currentW
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!canvasRef.current || !currentScreen) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    if (resizingElementId && resizeStart) {
      const deltaX = e.clientX - resizeStart.startX;
      const deltaPercent = (deltaX / rect.width) * 100;
      const newWidth = Math.max(10, Math.min(90, Math.round(resizeStart.startWidth + deltaPercent)));

      const element = currentScreen.elements?.find(el => el.id === resizingElementId);
      if (element) {
        updateElement(element, { widthPercent: newWidth } as any);
      }
      return;
    }

    if (draggingElementId) {
      const touchXPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const touchYPercent = ((e.clientY - rect.top) / rect.height) * 100;

      let closestSlotX = MENU_SLOTS_X[0];
      let minDistanceX = 999;
      MENU_SLOTS_X.forEach(s => {
        const dist = Math.abs(s.xPercent - touchXPercent);
        if (dist < minDistanceX) {
          minDistanceX = dist;
          closestSlotX = s;
        }
      });

      let closestSlotY = MENU_SLOTS_Y[0];
      let minDistanceY = 999;
      MENU_SLOTS_Y.forEach(s => {
        const dist = Math.abs(s.yPercent - touchYPercent);
        if (dist < minDistanceY) {
          minDistanceY = dist;
          closestSlotY = s;
        }
      });

      setActiveHoverSlotX(closestSlotX.slot);
      setActiveHoverSlotY(closestSlotY.slot);

      const element = currentScreen.elements?.find(el => el.id === draggingElementId);
      if (element) {
        updateElement(element, {
          slotX: closestSlotX.slot,
          verticalSlot: closestSlotY.slot
        });
      }
    }
  };

  const handlePointerUp = () => {
    setDraggingElementId(null);
    setResizingElementId(null);
    setResizeStart(null);
    setActiveHoverSlotX(null);
    setActiveHoverSlotY(null);
  };

  const handleButtonBgUpload = (e: React.ChangeEvent<HTMLInputElement>, el: MenuElement) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = uploadEvent => {
      if (typeof uploadEvent.target?.result === 'string') {
        updateElement(el, { customBgImage: uploadEvent.target.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getElementStyle = (el: MenuElement): React.CSSProperties => {
    const customBg = el.customBgColor;
    const customColor = el.customTextColor;
    const bgImage = el.customBgImage;
    const customWidth = (el as any).widthPercent ? `${(el as any).widthPercent}%` : undefined;
    const customFontSize = (el as any).fontSizePx ? `${(el as any).fontSizePx}px` : undefined;

    if (el.type === 'button') {
      const baseBg =
        customBg ||
        (el.styleVariant === 'danger'
          ? '#dc2626'
          : el.styleVariant === 'glass'
          ? 'rgba(15,23,42,0.85)'
          : el.styleVariant === 'secondary'
          ? '#1e293b'
          : '#2563eb');

      return {
        background: bgImage ? `url(${bgImage}) center/cover no-repeat` : baseBg,
        color: customColor || '#fff',
        padding: '3% 5%',
        borderRadius: 8,
        fontSize: customFontSize || 'clamp(10px, 2.4cqw, 15px)',
        fontWeight: 800,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
        border: bgImage ? '1px solid rgba(255,255,255,0.4)' : 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: customWidth || 'auto',
        boxSizing: 'border-box'
      };
    }

    if (el.type === 'card') {
      return {
        background: customBg || (el.styleVariant === 'glass' ? 'rgba(15,23,42,0.75)' : '#1e293b'),
        color: customColor || '#fff',
        padding: '3% 5%',
        borderRadius: 8,
        fontSize: customFontSize || 'clamp(10px, 2.2cqw, 14px)',
        fontWeight: 700,
        width: customWidth || 'auto',
        minWidth: '20%',
        textAlign: 'center',
        boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
        boxSizing: 'border-box'
      };
    }

    return {
      color: customColor || (el.styleVariant === 'title' ? '#38bdf8' : '#e2e8f0'),
      fontSize: customFontSize || (el.styleVariant === 'title' ? 'clamp(14px, 4cqw, 24px)' : 'clamp(11px, 2.4cqw, 15px)'),
      fontWeight: el.styleVariant === 'title' ? 900 : 600,
      textShadow: '0 2px 8px rgba(0,0,0,0.9)',
      whiteSpace: 'nowrap',
      width: customWidth || 'auto',
      textAlign: 'center'
    };
  };

  const activeElement = currentScreen?.elements?.find(e => e.id === activeEditingElemId);
  const targetBranchId = activeElement?.action?.targetBranchId || 'main';
  const targetTimelineEvents = targetBranchId === 'main'
    ? (activeScene?.timeline || [])
    : (branchesMap[targetBranchId]?.timeline || []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,4,8,0.95)',
        backdropFilter: 'blur(8px)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isPortrait ? 0 : 8
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        .menu-editor-root {
          width: 100%;
          max-width: 1180px;
          height: ${isPortrait ? '100dvh' : 'min(94vh, 900px)'};
          background: #0d0d16;
          border: ${isPortrait ? 'none' : '1px solid #232338'};
          border-radius: ${isPortrait ? '0' : '16px'};
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: #fff;
          box-shadow: 0 25px 60px rgba(0,0,0,0.85);
        }
        .canvas-container {
          container-type: inline-size;
        }
        .canva-resize-handle {
          position: absolute;
          right: -6px;
          bottom: -6px;
          width: 14px;
          height: 14px;
          background: #38bdf8;
          border: 2px solid #fff;
          border-radius: 50%;
          cursor: se-resize;
          z-index: 50;
          box-shadow: 0 2px 6px rgba(0,0,0,0.6);
        }
      `}</style>

      <div className="menu-editor-root">
        {/* HEADER */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid #1f1f2e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#12121e',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🖥️</span>
            <div>
              <strong style={{ fontSize: 14, color: '#f8fafc' }}>
                {isPortrait ? (currentScreen?.title || 'Menús') : 'Editor de Menús y Pantallas'}
              </strong>
            </div>
          </div>

          {isPortrait && (
            <div style={{ display: 'flex', background: '#0a0a12', padding: 2, borderRadius: 6, border: '1px solid #2a2a3e' }}>
              <button
                onClick={() => setMobileTab('canvas')}
                style={{
                  padding: '4px 8px',
                  background: mobileTab === 'canvas' ? '#38bdf8' : 'transparent',
                  color: mobileTab === 'canvas' ? '#000' : '#aaa',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 800
                }}
              >
                Lienzo
              </button>
              <button
                onClick={() => setMobileTab('inspector')}
                style={{
                  padding: '4px 8px',
                  background: mobileTab === 'inspector' ? '#38bdf8' : 'transparent',
                  color: mobileTab === 'inspector' ? '#000' : '#aaa',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 800
                }}
              >
                Ajustes {activeElement && '●'}
              </button>
              <button
                onClick={() => setMobileTab('screens')}
                style={{
                  padding: '4px 8px',
                  background: mobileTab === 'screens' ? '#38bdf8' : 'transparent',
                  color: mobileTab === 'screens' ? '#000' : '#aaa',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 800
                }}
              >
                Menús
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 18,
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          {/* PANEL IZQUIERDO */}
          {(!isPortrait || mobileTab === 'screens') && (
            <div
              style={{
                width: isPortrait ? '100%' : 240,
                borderRight: isPortrait ? 'none' : '1px solid #1f1f2e',
                background: '#0a0a12',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                overflowY: 'auto',
                flexShrink: 0
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8' }}>PANTALLAS DEL JUEGO</div>

              <div style={{ background: '#141422', border: '1px solid #232338', borderRadius: 8, padding: 8 }}>
                <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 4 }}>
                  Inicio del Juego
                </label>
                <select
                  value={project.startScreenType === 'menu' && project.startMenuId ? project.startMenuId : 'first_scene'}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'first_scene') {
                      setProject(prev => ({ ...prev, startScreenType: 'scene', startMenuId: undefined }));
                    } else {
                      setProject(prev => ({ ...prev, startScreenType: 'menu', startMenuId: val }));
                    }
                  }}
                  style={{
                    width: '100%',
                    background: '#0a0a12',
                    border: '1px solid #333',
                    color: '#38bdf8',
                    padding: 5,
                    borderRadius: 6,
                    fontSize: 11
                  }}
                >
                  <option value="first_scene">🎬 Iniciar Historia Directamente</option>
                  {screensList.map(screen => (
                    <option key={screen.id} value={screen.id}>
                      🖥️ {screen.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {screensList.map(screen => {
                  const isSelected = currentScreen?.id === screen.id;
                  const isStart = project.startMenuId === screen.id;

                  return (
                    <div
                      key={screen.id}
                      onClick={() => {
                        setSelectedScreenId(screen.id);
                        setActiveEditingElemId(null);
                        if (isPortrait) setMobileTab('canvas');
                      }}
                      style={{
                        background: isSelected ? '#1e1e32' : '#12121c',
                        border: `1px solid ${isSelected ? '#38bdf8' : '#232338'}`,
                        borderRadius: 8,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#fff' : '#ddd' }}>
                          {screen.title}
                        </div>
                        <div style={{ fontSize: 9, color: isStart ? '#10b981' : '#888' }}>
                          {isStart ? '★ Pantalla de Inicio' : screen.type === 'end_screen' ? 'Pantalla Final' : 'Menú'}
                        </div>
                      </div>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (window.confirm(`¿Eliminar la pantalla "${screen.title}"?`)) {
                            deleteMenuScreen(screen.id);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Crear Pantalla */}
              <div style={{ borderTop: '1px solid #1f1f2e', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Nombre de la pantalla..."
                  value={newScreenTitle}
                  onChange={e => setNewScreenTitle(e.target.value)}
                  style={{
                    background: '#161624',
                    border: '1px solid #333',
                    color: '#fff',
                    padding: '6px 8px',
                    borderRadius: 6,
                    fontSize: 11
                  }}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleCreateScreen('start_menu')}
                    style={{
                      flex: 1,
                      padding: 6,
                      background: '#2563eb',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Inicio
                  </button>
                  <button
                    onClick={() => handleCreateScreen('end_screen')}
                    style={{
                      flex: 1,
                      padding: 6,
                      background: '#7c3aed',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Final
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CENTRO: LIENZO */}
          {(!isPortrait || mobileTab === 'canvas') && currentScreen && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  padding: isPortrait ? '6px 10px' : '8px 14px',
                  borderBottom: '1px solid #1f1f2e',
                  background: '#12121e',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 10, color: '#aaa' }}>Fondo:</label>
                  <select
                    value={currentScreen.backgroundUrl}
                    onChange={e => addOrUpdateMenuScreen({ ...currentScreen, backgroundUrl: e.target.value })}
                    style={{
                      background: '#161624',
                      border: '1px solid #333',
                      color: '#38bdf8',
                      padding: '3px 6px',
                      borderRadius: 6,
                      fontSize: 10,
                      maxWidth: 130
                    }}
                  >
                    <option value="">(Negro)</option>
                    {project.backgroundGallery?.map(bg => (
                      <option key={bg.id} value={bg.url}>
                        {bg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleAddElement('text')}
                    style={{
                      padding: '4px 8px',
                      background: '#334155',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Texto
                  </button>
                  <button
                    onClick={() => handleAddElement('button')}
                    style={{
                      padding: '4px 10px',
                      background: '#2563eb',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    + Botón
                  </button>
                </div>
              </div>

              {/* Área del Lienzo */}
              <div
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isPortrait ? 6 : 14,
                  overflow: 'hidden',
                  background: '#05050a'
                }}
              >
                <div
                  ref={canvasRef}
                  className="canvas-container"
                  style={{
                    position: 'relative',
                    width: isPortrait ? '100%' : 'min(100%, 750px)',
                    aspectRatio: '16 / 9',
                    backgroundImage: currentScreen.backgroundUrl ? `url(${currentScreen.backgroundUrl})` : undefined,
                    backgroundColor: '#0c0c16',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: 10,
                    border: '1.5px solid #2d2d42',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                    overflow: 'hidden',
                    touchAction: 'none'
                  }}
                >
                  {/* Guías Magnéticas */}
                  {draggingElementId && (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 }}>
                      {MENU_SLOTS_X.map(s => (
                        <div
                          key={s.slot}
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${s.xPercent}%`,
                            width: 1,
                            borderLeft: activeHoverSlotX === s.slot ? '2px dashed #38bdf8' : '1px dashed rgba(255,255,255,0.15)',
                            backgroundColor: activeHoverSlotX === s.slot ? 'rgba(56,189,248,0.1)' : 'transparent'
                          }}
                        />
                      ))}
                      {MENU_SLOTS_Y.map(s => (
                        <div
                          key={s.slot}
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${s.yPercent}%`,
                            height: 1,
                            borderTop: activeHoverSlotY === s.slot ? '2px dashed #a855f7' : '1px dashed rgba(255,255,255,0.15)',
                            backgroundColor: activeHoverSlotY === s.slot ? 'rgba(168,85,247,0.1)' : 'transparent'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {currentScreen.elements?.map(el => {
                    const slotXDef = MENU_SLOTS_X.find(s => s.slot === (el.slotX || 'center')) || MENU_SLOTS_X[3];
                    const slotYDef = MENU_SLOTS_Y.find(s => s.slot === (el.verticalSlot || 'ground')) || MENU_SLOTS_Y[3];
                    const x = slotXDef.xPercent;
                    const y = slotYDef.yPercent;

                    const isSelected = activeEditingElemId === el.id;
                    const isDragging = draggingElementId === el.id;

                    return (
                      <div
                        key={el.id}
                        onPointerDown={e => handlePointerDown(e, el)}
                        style={{
                          position: 'absolute',
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: 'translate(-50%, -50%)',
                          cursor: isDragging ? 'grabbing' : 'grab',
                          outline: isSelected ? '2px dashed #38bdf8' : 'none',
                          outlineOffset: 3,
                          zIndex: isSelected ? 40 : 20,
                          touchAction: 'none',
                          transition: isDragging || resizingElementId ? 'none' : 'left 0.15s ease, top 0.15s ease',
                          display: 'inline-flex',
                          width: (el as any).widthPercent ? `${(el as any).widthPercent}%` : 'auto',
                          justifyContent: 'center'
                        }}
                      >
                        <div style={getElementStyle(el)}>{el.text}</div>

                        {/* Canva Resize Handle */}
                        {isSelected && (
                          <div
                            className="canva-resize-handle"
                            title="Arrastrar para cambiar ancho"
                            onPointerDown={e => handleResizePointerDown(e, el)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {isPortrait && activeElement && (
                  <button
                    onClick={() => setMobileTab('inspector')}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      padding: '8px 12px',
                      background: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #38bdf8',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ⚙️ Configurar elemento ({activeElement.text}) ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PANEL DERECHO: INSPECTOR */}
          {(!isPortrait || mobileTab === 'inspector') && (
            <div
              style={{
                width: isPortrait ? '100%' : 300,
                borderLeft: isPortrait ? 'none' : '1px solid #1f1f2e',
                background: '#0d0d16',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                overflowY: 'auto',
                flexShrink: 0
              }}
            >
              {activeElement ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13, color: '#38bdf8' }}>
                      {activeElement.type === 'button'
                        ? '⚙️ Editar Botón'
                        : activeElement.type === 'card'
                        ? '🗂️ Editar Tarjeta'
                        : '✍️ Editar Texto'}
                    </strong>

                    <button
                      onClick={() => {
                        deleteMenuElement(currentScreen.id, activeElement.id);
                        setActiveEditingElemId(null);
                        if (isPortrait) setMobileTab('canvas');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Eliminar
                    </button>
                  </div>

                  {/* Texto */}
                  <div>
                    <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Texto</label>
                    <input
                      type="text"
                      value={activeElement.text}
                      onChange={e => updateElement(activeElement, { text: e.target.value })}
                      style={{
                        width: '100%',
                        background: '#161624',
                        border: '1px solid #333',
                        color: '#fff',
                        padding: '6px 8px',
                        borderRadius: 6,
                        fontSize: 12
                      }}
                    />
                  </div>

                  {/* Redimensionado Manual / Canva */}
                  <div style={{ background: '#131320', padding: 8, borderRadius: 8, border: '1px solid #232338', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 10, color: '#38bdf8', fontWeight: 800 }}>📐 Dimensiones y Escala</span>
                    
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginBottom: 2 }}>
                        <span>Ancho (% pantalla):</span>
                        <span>{(activeElement as any).widthPercent || 'Auto'}</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={90}
                        value={(activeElement as any).widthPercent || 30}
                        onChange={e => updateElement(activeElement, { widthPercent: Number(e.target.value) } as any)}
                        style={{ width: '100%', accentColor: '#38bdf8' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginBottom: 2 }}>
                        <span>Tamaño de Fuente (px):</span>
                        <span>{(activeElement as any).fontSizePx ? `${(activeElement as any).fontSizePx}px` : 'Auto'}</span>
                      </div>
                      <input
                        type="range"
                        min={9}
                        max={40}
                        value={(activeElement as any).fontSizePx || 14}
                        onChange={e => updateElement(activeElement, { fontSizePx: Number(e.target.value) } as any)}
                        style={{ width: '100%', accentColor: '#a855f7' }}
                      />
                    </div>
                  </div>

                  {/* Color y Fondo */}
                  <div style={{ background: '#131320', padding: 8, borderRadius: 8, border: '1px solid #232338', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#38bdf8', fontWeight: 800 }}>🎨 Color y Fondo</span>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <label style={{ fontSize: 10, color: '#aaa', flex: 1 }}>Color de Texto:</label>
                      <input
                        type="color"
                        value={activeElement.customTextColor || '#ffffff'}
                        onChange={e => updateElement(activeElement, { customTextColor: e.target.value })}
                        style={{ width: 28, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}
                      />
                      {activeElement.customTextColor && (
                        <button
                          onClick={() => updateElement(activeElement, { customTextColor: undefined })}
                          style={{ background: 'none', border: 'none', color: '#888', fontSize: 10, cursor: 'pointer' }}
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {(activeElement.type === 'button' || activeElement.type === 'card') && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <label style={{ fontSize: 10, color: '#aaa', flex: 1 }}>Color Fondo:</label>
                        <input
                          type="color"
                          value={activeElement.customBgColor || '#2563eb'}
                          onChange={e => updateElement(activeElement, { customBgColor: e.target.value })}
                          style={{ width: 28, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}
                        />
                        {activeElement.customBgColor && (
                          <button
                            onClick={() => updateElement(activeElement, { customBgColor: undefined })}
                            style={{ background: 'none', border: 'none', color: '#888', fontSize: 10, cursor: 'pointer' }}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    )}

                    {activeElement.type === 'button' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                        <label style={{ fontSize: 10, color: '#aaa' }}>Imagen de Fondo Botón:</label>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => btnBgInputRef.current?.click()}
                            style={{
                              flex: 1,
                              padding: '4px 6px',
                              background: 'rgba(56,189,248,0.15)',
                              border: '1px dashed #38bdf8',
                              color: '#38bdf8',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {activeElement.customBgImage ? 'Cambiar Imagen' : '+ Subir Imagen'}
                          </button>
                          {activeElement.customBgImage && (
                            <button
                              onClick={() => updateElement(activeElement, { customBgImage: undefined })}
                              style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '0 8px', fontSize: 10, cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={btnBgInputRef}
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => handleButtonBgUpload(e, activeElement)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  {activeElement.type === 'button' && (
                    <div style={{ background: '#131320', border: '1px solid #232338', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, color: '#38bdf8', fontWeight: 800 }}>⚡ Acción al hacer clic</label>
                      <select
                        value={activeElement.action?.type || 'start_game'}
                        onChange={e => {
                          const actionType = e.target.value as any;
                          updateElement(activeElement, {
                            action: {
                              type: actionType,
                              targetBranchId: 'main',
                              targetEventIndex: 0
                            }
                          });
                        }}
                        style={{
                          width: '100%',
                          background: '#161624',
                          border: '1px solid #333',
                          color: '#fff',
                          padding: 5,
                          borderRadius: 6,
                          fontSize: 11
                        }}
                      >
                        <option value="start_game">▶ Comenzar Historia</option>
                        <option value="jump_to_scene">🌿 Ir a la Historia / Rama</option>
                        <option value="jump_to_menu">🖥️ Saltar a Menú</option>
                        <option value="open_save_load">💾 Guardar / Cargar</option>
                        <option value="restart">🔄 Reiniciar Partida</option>
                      </select>

                      {/* SALTO DIRECTO A VÍA / RAMA + VIÑETA */}
                      {activeElement.action?.type === 'jump_to_scene' && (
                        <div style={{ display: 'flex', gap: 4, background: '#0a0a10', padding: 6, borderRadius: 6, border: '1px solid #2a2a3e' }}>
                          <div style={{ flex: 1.2 }}>
                            <label style={{ fontSize: 9, color: '#aaa' }}>Vía / Rama:</label>
                            <select
                              value={activeElement.action.targetBranchId || 'main'}
                              onChange={e => {
                                updateElement(activeElement, {
                                  action: {
                                    ...activeElement.action!,
                                    targetBranchId: e.target.value,
                                    targetEventIndex: 0
                                  }
                                });
                              }}
                              style={{
                                width: '100%',
                                background: '#161624',
                                border: '1px solid #333',
                                color: '#c084fc',
                                padding: 4,
                                borderRadius: 6,
                                fontSize: 10
                              }}
                            >
                              <option value="main">🌿 Vía Principal (Main)</option>
                              {Object.values(branchesMap).map((b: any) => (
                                <option key={b.id} value={b.id}>🔀 {b.name}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ flex: 0.8 }}>
                            <label style={{ fontSize: 9, color: '#aaa' }}>Viñeta:</label>
                            <select
                              value={activeElement.action.targetEventIndex ?? 0}
                              onChange={e => {
                                updateElement(activeElement, {
                                  action: {
                                    ...activeElement.action!,
                                    targetEventIndex: Number(e.target.value)
                                  }
                                });
                              }}
                              style={{
                                width: '100%',
                                background: '#161624',
                                border: '1px solid #333',
                                color: '#38bdf8',
                                padding: 4,
                                borderRadius: 6,
                                fontSize: 10
                              }}
                            >
                              {targetTimelineEvents.length === 0 ? (
                                <option value={0}>Viñeta #1</option>
                              ) : (
                                Array.from({ length: targetTimelineEvents.length }).map((_, i) => (
                                  <option key={i} value={i}>Viñeta #{i + 1}</option>
                                ))
                              )}
                            </select>
                          </div>
                        </div>
                      )}

                      {activeElement.action?.type === 'jump_to_menu' && (
                        <div>
                          <label style={{ fontSize: 9, color: '#aaa' }}>Menú Destino:</label>
                          <select
                            value={activeElement.action.targetMenuId || screensList.find(s => s.id !== currentScreen.id)?.id || ''}
                            onChange={e =>
                              updateElement(activeElement, {
                                action: {
                                  ...activeElement.action!,
                                  targetMenuId: e.target.value
                                }
                              })
                            }
                            style={{
                              width: '100%',
                              background: '#161624',
                              border: '1px solid #333',
                              color: '#a855f7',
                              padding: 4,
                              borderRadius: 6,
                              fontSize: 11
                            }}
                          >
                            {screensList
                              .filter(s => s.id !== currentScreen.id)
                              .map(s => (
                                <option key={s.id} value={s.id}>
                                  🖥️ {s.title}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {/* Variables */}
                      <div style={{ borderTop: '1px solid #232338', paddingTop: 6, marginTop: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: '#38bdf8', fontWeight: 700 }}>⚡ Memoria / Estado:</span>
                          <button
                            onClick={() => {
                              const varKeys = Object.keys(project.variables || {});
                              if (varKeys.length === 0) return;
                              const newChange: VariableChange = {
                                variableName: varKeys[0],
                                operation: 'set',
                                valueType: 'literal',
                                value: true
                              };
                              updateElement(activeElement, {
                                variableChanges: [...(activeElement.variableChanges || []), newChange]
                              });
                            }}
                            style={{
                              padding: '2px 6px',
                              background: '#38bdf8',
                              color: '#000',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: 9,
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            + Estado
                          </button>
                        </div>

                        {activeElement.variableChanges?.map((ch: VariableChange, cIdx: number) => (
                          <div key={cIdx} style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 3 }}>
                            <select
                              value={ch.variableName}
                              onChange={e => {
                                const copy = [...(activeElement.variableChanges || [])];
                                copy[cIdx].variableName = e.target.value;
                                updateElement(activeElement, { variableChanges: copy });
                              }}
                              style={{ flex: 1.5, background: '#0a0a0f', color: '#fff', border: '1px solid #333', fontSize: 9, padding: 1 }}
                            >
                              {Object.keys(project.variables || {}).map(vn => (
                                <option key={vn} value={vn}>{vn}</option>
                              ))}
                            </select>

                            <select
                              value={ch.operation}
                              onChange={e => {
                                const copy = [...(activeElement.variableChanges || [])];
                                copy[cIdx].operation = e.target.value as any;
                                updateElement(activeElement, { variableChanges: copy });
                              }}
                              style={{ flex: 1, background: '#0a0a0f', color: '#a7f3d0', border: '1px solid #333', fontSize: 9, padding: 1 }}
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
                                onChange={e => {
                                  const copy = [...(activeElement.variableChanges || [])];
                                  copy[cIdx].value = e.target.value;
                                  updateElement(activeElement, { variableChanges: copy });
                                }}
                                style={{ width: 35, background: '#0a0a0f', color: '#fff', border: '1px solid #333', fontSize: 9, textAlign: 'center', padding: 1 }}
                              />
                            )}

                            <button
                              onClick={() => {
                                const copy = activeElement.variableChanges!.filter((_: VariableChange, i: number) => i !== cIdx);
                                updateElement(activeElement, { variableChanges: copy });
                              }}
                              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 9, cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isPortrait && (
                    <button
                      onClick={() => setMobileTab('canvas')}
                      style={{
                        padding: '8px',
                        background: '#38bdf8',
                        color: '#000',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 800,
                        fontSize: 11,
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Volver al Lienzo
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#888', textAlign: 'center', padding: '30px 10px' }}>
                  Toca un elemento en el lienzo para editar sus propiedades o redimensionarlo.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
