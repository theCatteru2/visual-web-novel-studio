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

const SLOTS_X: { slot: MagneticSlot; label: string; xPercent: number }[] = [
  { slot: 'far-left', label: 'Ext-Izq', xPercent: 12 },
  { slot: 'left', label: 'Izq', xPercent: 25 },
  { slot: 'center-left', label: 'C-Izq', xPercent: 38 },
  { slot: 'center', label: 'Centro', xPercent: 50 },
  { slot: 'center-right', label: 'C-Der', xPercent: 62 },
  { slot: 'right', label: 'Der', xPercent: 75 },
  { slot: 'far-right', label: 'Ext-Der', xPercent: 88 }
];

const SLOTS_Y: { slot: VerticalSlot; label: string; yPercent: number }[] = [
  { slot: 'sky', label: 'Arriba / Aire', yPercent: 18 },
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
  const [activeHoverSlotX, setActiveHoverSlotX] = useState<MagneticSlot | null>(null);
  const [activeHoverSlotY, setActiveHoverSlotY] = useState<VerticalSlot | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const btnBgInputRef = useRef<HTMLInputElement>(null);

  const scenesList = (project as any).scenes || project.chapters?.flatMap((c: any) => c.scenes || []) || [];

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
      (type === 'start_menu'
        ? 'Menú Principal'
        : type === 'end_screen'
        ? 'Pantalla Final'
        : 'Nuevo Menú');

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
      action: {
        type: 'start_game'
      }
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
      action: type === 'button' ? { type: 'start_game' } : undefined
    };

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

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingElementId || !canvasRef.current || !currentScreen) return;

    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

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
      const dist = Math.abs(s.yPercent - touchYPercent);
      if (dist < minDistanceY) {
        minDistanceY = dist;
        closestSlotY = s;
      }
    });

    setActiveHoverSlotX(closestSlotX.slot);
    setActiveHoverSlotY(closestSlotY.slot);

    const element = currentScreen.elements?.find(el => el.id === draggingElementId);
    if (!element) return;

    updateElement(element, {
      slotX: closestSlotX.slot,
      verticalSlot: closestSlotY.slot
    });
  };

  const handlePointerUp = () => {
    setDraggingElementId(null);
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
        padding: '8px 18px',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        border: bgImage ? '1px solid rgba(255,255,255,0.4)' : 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    }

    if (el.type === 'card') {
      return {
        background:
          customBg ||
          (el.styleVariant === 'glass' ? 'rgba(15,23,42,0.75)' : '#1e293b'),
        color: customColor || '#fff',
        padding: '12px 18px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        minWidth: 100,
        textAlign: 'center',
        boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
      };
    }

    return {
      color:
        customColor ||
        (el.styleVariant === 'title' ? '#38bdf8' : '#e2e8f0'),
      fontSize: el.styleVariant === 'title' ? 18 : 13,
      fontWeight: el.styleVariant === 'title' ? 900 : 600,
      textShadow: '0 2px 8px rgba(0,0,0,0.8)',
      whiteSpace: 'nowrap'
    };
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,4,8,0.92)',
        backdropFilter: 'blur(8px)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        .menu-editor-root {
          width: 100%;
          max-width: 1180px;
          height: min(94vh, 900px);
          background: #0d0d16;
          border: 1px solid #232338;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: #fff;
          box-shadow: 0 25px 60px rgba(0,0,0,0.85);
        }
        .menu-editor-header { flex-shrink: 0; }
        .menu-editor-body { min-height: 0; flex: 1; display: flex; overflow: hidden; }
        .menu-screen-list { width: 260px; flex-shrink: 0; }
        .menu-editor-main { min-width: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .menu-screen-settings { flex-shrink: 0; }
        .menu-work-area { min-height: 0; flex: 1; display: flex; overflow: hidden; }
        .menu-preview-area {
          min-width: 0; flex: 1; overflow: auto; display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .menu-inspector { width: 320px; flex-shrink: 0; overflow-y: auto; }
        .menu-canvas { width: min(100%, 720px); aspect-ratio: 16 / 9; flex-shrink: 0; touch-action: none; }
        .menu-element { user-select: none; -webkit-user-select: none; touch-action: none; }
        @media (max-width: 900px) {
          .menu-editor-root { height: 100dvh; max-width: none; border-radius: 0; }
          .menu-screen-list { width: 210px; }
          .menu-inspector { width: 270px; }
        }
        @media (max-width: 700px) {
          .menu-editor-body { flex-direction: column; }
          .menu-screen-list { width: 100%; height: auto; max-height: 130px; border-right: none !important; border-bottom: 1px solid #1f1f2e; }
          .menu-screen-list-items { flex-direction: row !important; overflow-x: auto; }
          .menu-work-area { flex-direction: column; }
          .menu-inspector { width: 100%; max-height: 45%; border-left: none !important; border-top: 1px solid #1f1f2e; }
        }
      `}</style>

      <div className="menu-editor-root">
        {/* HEADER */}
        <div
          className="menu-editor-header"
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #1f1f2e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#12121e'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🖥️</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>
                Menús y Pantallas Finales
              </strong>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Diseña y estructura los menús con soporte magnético
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 20,
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        <div className="menu-editor-body">
          {/* LISTA DE PANTALLAS */}
          <div
            className="menu-screen-list"
            style={{
              borderRight: '1px solid #1f1f2e',
              background: '#0a0a12',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              overflowY: 'auto'
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8' }}>
              Pantallas del Proyecto
            </div>

            <div
              style={{
                background: '#141422',
                border: '1px solid #232338',
                borderRadius: 8,
                padding: 8
              }}
            >
              <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 4 }}>
                Inicio del Juego
              </label>
              <select
                value={
                  project.startScreenType === 'menu' && project.startMenuId
                    ? project.startMenuId
                    : 'first_scene'
                }
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'first_scene') {
                    setProject(prev => ({
                      ...prev,
                      startScreenType: 'scene',
                      startMenuId: undefined
                    }));
                  } else {
                    setProject(prev => ({
                      ...prev,
                      startScreenType: 'menu',
                      startMenuId: val
                    }));
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
                <option value="first_scene">🎬 Arrancar en Escena 1</option>
                {screensList.map(screen => (
                  <option key={screen.id} value={screen.id}>
                    🖥️ {screen.title}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="menu-screen-list-items"
              style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}
            >
              {screensList.map(screen => {
                const isSelected = currentScreen?.id === screen.id;
                const isStart = project.startMenuId === screen.id;

                return (
                  <div
                    key={screen.id}
                    onClick={() => {
                      setSelectedScreenId(screen.id);
                      setActiveEditingElemId(null);
                    }}
                    style={{
                      background: isSelected ? '#1e1e32' : '#12121c',
                      border: `1px solid ${isSelected ? '#38bdf8' : '#232336'}`,
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
                        {isStart
                          ? '★ Pantalla de Inicio'
                          : screen.type === 'end_screen'
                          ? 'Pantalla Final'
                          : 'Menú'}
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

            {/* CREAR PANTALLA */}
            <div
              style={{
                borderTop: '1px solid #1f1f2e',
                paddingTop: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
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
                  + Menú Inicio
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

          {/* EDITOR */}
          {currentScreen ? (
            <div className="menu-editor-main">
              {/* CONFIGURACIÓN DE PANTALLA */}
              <div
                className="menu-screen-settings"
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid #1f1f2e',
                  background: '#12121e',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: '#aaa' }}>Título:</label>
                  <input
                    type="text"
                    value={currentScreen.title}
                    onChange={e =>
                      addOrUpdateMenuScreen({
                        ...currentScreen,
                        title: e.target.value
                      })
                    }
                    style={{
                      background: '#161624',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: '#aaa' }}>Fondo:</label>
                  <select
                    value={currentScreen.backgroundUrl}
                    onChange={e =>
                      addOrUpdateMenuScreen({
                        ...currentScreen,
                        backgroundUrl: e.target.value
                      })
                    }
                    style={{
                      background: '#161624',
                      border: '1px solid #333',
                      color: '#38bdf8',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 11
                    }}
                  >
                    <option value="">(Sin Fondo / Negro)</option>
                    {project.backgroundGallery?.map(bg => (
                      <option key={bg.id} value={bg.url}>
                        {bg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleAddElement('text')}
                    style={{
                      padding: '5px 10px',
                      background: '#334155',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Texto
                  </button>
                  <button
                    onClick={() => handleAddElement('button')}
                    style={{
                      padding: '5px 10px',
                      background: '#2563eb',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    + Botón
                  </button>
                </div>
              </div>

              {/* LIENZO + INSPECTOR */}
              <div className="menu-work-area">
                {/* LIENZO */}
                <div
                  className="menu-preview-area"
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <div
                    ref={canvasRef}
                    className="menu-canvas"
                    style={{
                      position: 'relative',
                      backgroundImage: currentScreen.backgroundUrl
                        ? `url(${currentScreen.backgroundUrl})`
                        : undefined,
                      backgroundColor: '#0c0c16',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: 10,
                      border: '1.5px solid #2d2d42',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Guías Magnéticas en Arrastre */}
                    {draggingElementId && (
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
                              borderLeft:
                                activeHoverSlotX === s.slot
                                  ? '2px dashed #38bdf8'
                                  : '1px dashed rgba(255,255,255,0.15)',
                              backgroundColor:
                                activeHoverSlotX === s.slot ? 'rgba(56,189,248,0.1)' : 'transparent'
                            }}
                          />
                        ))}
                        {SLOTS_Y.map(s => (
                          <div
                            key={s.slot}
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: `${s.yPercent}%`,
                              height: 1,
                              borderTop:
                                activeHoverSlotY === s.slot
                                  ? '2px dashed #a855f7'
                                  : '1px dashed rgba(255,255,255,0.15)',
                              backgroundColor:
                                activeHoverSlotY === s.slot ? 'rgba(168,85,247,0.1)' : 'transparent'
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {currentScreen.elements?.map(el => {
                      const slotXDef = SLOTS_X.find(s => s.slot === (el.slotX || 'center')) || SLOTS_X[3];
                      const slotYDef = SLOTS_Y.find(s => s.slot === (el.verticalSlot || 'ground')) || SLOTS_Y[3];
                      const x = slotXDef.xPercent;
                      const y = slotYDef.yPercent;

                      const isSelected = activeEditingElemId === el.id;
                      const isDragging = draggingElementId === el.id;

                      return (
                        <div
                          key={el.id}
                          className="menu-element"
                          onPointerDown={e => handlePointerDown(e, el)}
                          style={{
                            position: 'absolute',
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: 'translate(-50%, -50%)',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            outline: isSelected ? '2px dashed #38bdf8' : 'none',
                            outlineOffset: 4,
                            zIndex: isSelected ? 40 : 20,
                            touchAction: 'none',
                            transition: isDragging ? 'none' : 'left 0.15s ease, top 0.15s ease'
                          }}
                        >
                          <div style={getElementStyle(el)}>{el.text}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* INSPECTOR */}
                <div
                  className="menu-inspector"
                  style={{
                    borderLeft: '1px solid #1f1f2e',
                    background: '#0d0d16',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  {activeEditingElemId ? (() => {
                    const el = currentScreen.elements?.find(e => e.id === activeEditingElemId);
                    if (!el) {
                      return (
                        <div style={{ fontSize: 11, color: '#888' }}>
                          Selecciona un elemento.
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: 13, color: '#38bdf8' }}>
                            {el.type === 'button'
                              ? '⚙️ Editar Botón'
                              : el.type === 'card'
                              ? '🗂️ Editar Tarjeta'
                              : '✍️ Editar Texto'}
                          </strong>

                          <button
                            onClick={() => {
                              deleteMenuElement(currentScreen.id, el.id);
                              setActiveEditingElemId(null);
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

                        {/* TEXTO */}
                        <div>
                          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>
                            Texto
                          </label>
                          <input
                            type="text"
                            value={el.text}
                            onChange={e => updateElement(el, { text: e.target.value })}
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

                        {/* COLORES Y APARIENCIA */}
                        <div style={{ background: '#131320', padding: 8, borderRadius: 8, border: '1px solid #232338', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 10, color: '#38bdf8', fontWeight: 800 }}>🎨 Color y Fondo</span>
                          
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <label style={{ fontSize: 10, color: '#aaa', flex: 1 }}>Color de Texto:</label>
                            <input
                              type="color"
                              value={el.customTextColor || '#ffffff'}
                              onChange={e => updateElement(el, { customTextColor: e.target.value })}
                              style={{ width: 28, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}
                            />
                            {el.customTextColor && (
                              <button
                                onClick={() => updateElement(el, { customTextColor: undefined })}
                                style={{ background: 'none', border: 'none', color: '#888', fontSize: 10, cursor: 'pointer' }}
                              >
                                Restablecer
                              </button>
                            )}
                          </div>

                          {(el.type === 'button' || el.type === 'card') && (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <label style={{ fontSize: 10, color: '#aaa', flex: 1 }}>Color Fondo:</label>
                              <input
                                type="color"
                                value={el.customBgColor || '#2563eb'}
                                onChange={e => updateElement(el, { customBgColor: e.target.value })}
                                style={{ width: 28, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}
                              />
                              {el.customBgColor && (
                                <button
                                  onClick={() => updateElement(el, { customBgColor: undefined })}
                                  style={{ background: 'none', border: 'none', color: '#888', fontSize: 10, cursor: 'pointer' }}
                                >
                                  Restablecer
                                </button>
                              )}
                            </div>
                          )}

                          {el.type === 'button' && (
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
                                  {el.customBgImage ? 'Cambiar Imagen' : '+ Subir Imagen'}
                                </button>
                                {el.customBgImage && (
                                  <button
                                    onClick={() => updateElement(el, { customBgImage: undefined })}
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
                                onChange={e => handleButtonBgUpload(e, el)}
                              />
                            </div>
                          )}
                        </div>

                        {/* ACCIÓN (BOTONES) */}
                        {el.type === 'button' && (
                          <div
                            style={{
                              background: '#131320',
                              border: '1px solid #232338',
                              borderRadius: 8,
                              padding: 8,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6
                            }}
                          >
                            <label style={{ fontSize: 10, color: '#38bdf8', fontWeight: 800 }}>
                              ⚡ Acción al hacer clic
                            </label>

                            <select
                              value={el.action?.type || 'start_game'}
                              onChange={e =>
                                updateElement(el, {
                                  action: {
                                    type: e.target.value as any,
                                    targetSceneId: scenesList[0]?.id || ''
                                  }
                                })
                              }
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
                              <option value="start_game">▶ Comenzar Juego</option>
                              <option value="jump_to_scene">🎬 Saltar a Escena</option>
                              <option value="jump_to_menu">🖥️ Saltar a Menú</option>
                              <option value="open_save_load">💾 Guardar / Cargar</option>
                              <option value="restart">🔄 Reiniciar Partida</option>
                            </select>

                            {el.action?.type === 'jump_to_scene' && (
                              <div>
                                <label style={{ fontSize: 9, color: '#aaa' }}>Escena Destino:</label>
                                <select
                                  value={el.action.targetSceneId || scenesList[0]?.id || ''}
                                  onChange={e =>
                                    updateElement(el, {
                                      action: {
                                        ...el.action!,
                                        targetSceneId: e.target.value
                                      }
                                    })
                                  }
                                  style={{
                                    width: '100%',
                                    background: '#161624',
                                    border: '1px solid #333',
                                    color: '#38bdf8',
                                    padding: 4,
                                    borderRadius: 6,
                                    fontSize: 11
                                  }}
                                >
                                  {scenesList.map((scene: any) => (
                                    <option key={scene.id} value={scene.id}>
                                      {scene.title || scene.name || `Escena ${scene.id}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {el.action?.type === 'jump_to_menu' && (
                              <div>
                                <label style={{ fontSize: 9, color: '#aaa' }}>Menú Destino:</label>
                                <select
                                  value={
                                    el.action.targetMenuId ||
                                    screensList.find(s => s.id !== currentScreen.id)?.id ||
                                    ''
                                  }
                                  onChange={e =>
                                    updateElement(el, {
                                      action: {
                                        ...el.action!,
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
                                        {s.title}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            )}

                            {/* Modificador de Variables de Memoria */}
                            <div style={{ borderTop: '1px solid #232338', paddingTop: 6, marginTop: 4 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 9, color: '#38bdf8', fontWeight: 700 }}>⚡ Memoria / Variables:</span>
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
                                    updateElement(el, {
                                      variableChanges: [...(el.variableChanges || []), newChange]
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

                              {el.variableChanges?.map((ch: VariableChange, cIdx: number) => (
                                <div key={cIdx} style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 3 }}>
                                  <select
                                    value={ch.variableName}
                                    onChange={e => {
                                      const copy = [...(el.variableChanges || [])];
                                      copy[cIdx].variableName = e.target.value;
                                      updateElement(el, { variableChanges: copy });
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
                                      const copy = [...(el.variableChanges || [])];
                                      copy[cIdx].operation = e.target.value as any;
                                      updateElement(el, { variableChanges: copy });
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
                                        const copy = [...(el.variableChanges || [])];
                                        copy[cIdx].value = e.target.value;
                                        updateElement(el, { variableChanges: copy });
                                      }}
                                      style={{ width: 35, background: '#0a0a0f', color: '#fff', border: '1px solid #333', fontSize: 9, textAlign: 'center', padding: 1 }}
                                    />
                                  )}

                                  <button
                                    onClick={() => {
                                      const copy = el.variableChanges!.filter((_: VariableChange, i: number) => i !== cIdx);
                                      updateElement(el, { variableChanges: copy });
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
                      </div>
                    );
                  })() : (
                    <div
                      style={{
                        fontSize: 11,
                        color: '#888',
                        textAlign: 'center',
                        padding: '30px 10px'
                      }}
                    >
                      Selecciona un elemento en el lienzo para ajustar su estilo, acciones o memorias asociadas.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: 13,
                textAlign: 'center',
                padding: 20
              }}
            >
              Crea o selecciona una pantalla para comenzar a diseñarla.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
