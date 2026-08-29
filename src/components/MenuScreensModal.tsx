import { useEffect, useRef, useState } from 'react';
import { useNovel } from '../context/NovelContext';
import {
  MenuScreen,
  MenuElement,
  MenuElementType,
  MenuElementStyle,
  MagneticSlot,
  VerticalSlot
} from '../types';

interface MenuScreensModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_X: Record<MagneticSlot, number> = {
  'far-left': 12,
  'left': 25,
  'center-left': 38,
  'center': 50,
  'center-right': 62,
  'right': 75,
  'far-right': 88
};

const DEFAULT_Y: Record<VerticalSlot, number> = {
  'sky': 12,
  'floating': 28,
  'elevated': 40,
  'ground': 58,
  'floor': 72,
  'sink': 86,
  'deep_sink': 96
};

const getElementX = (el: MenuElement) => {
  if (typeof el.x === 'number') return el.x;
  return DEFAULT_X[el.slotX] ?? 50;
};

const getElementY = (el: MenuElement) => {
  if (typeof el.y === 'number') return el.y;
  return DEFAULT_Y[el.verticalSlot] ?? 50;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function MenuScreensModal({
  isOpen,
  onClose
}: MenuScreensModalProps) {
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

  const [selectedScreenId, setSelectedScreenId] = useState<string>(
    screensList[0]?.id || ''
  );

  const [activeEditingElemId, setActiveEditingElemId] =
    useState<string | null>(null);

  const [newScreenTitle, setNewScreenTitle] = useState('');

  const [draggingElementId, setDraggingElementId] =
    useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  /*
   * Cuando se abre el modal y todavía no existe una pantalla seleccionada,
   * seleccionamos la primera disponible.
   */
  useEffect(() => {
    if (!selectedScreenId && screensList.length > 0) {
      setSelectedScreenId(screensList[0].id);
    }
  }, [selectedScreenId, screensList]);

  if (!isOpen) return null;

  const currentScreen =
    customScreens[selectedScreenId] || screensList[0];

  const scenesList =
    (project as any).scenes ||
    project.chapters?.[0]?.scenes ||
    [];

  const updateElement = (
    element: MenuElement,
    changes: Partial<MenuElement>
  ) => {
    if (!currentScreen) return;

    addOrUpdateMenuElement(currentScreen.id, {
      ...element,
      ...changes
    });
  };

  const normalizeElementPosition = (
    element: MenuElement
  ): MenuElement => {
    return {
      ...element,
      x: getElementX(element),
      y: getElementY(element)
    };
  };

  const handleCreateScreen = (
    type: 'start_menu' | 'end_screen' | 'custom_menu'
  ) => {
    const title =
      newScreenTitle.trim() ||
      (
        type === 'start_menu'
          ? 'Menú Principal'
          : type === 'end_screen'
            ? 'Pantalla Final'
            : 'Nuevo Menú'
      );

    const timestamp = Date.now();
    const newId = `screen_${timestamp}`;
    const defaultBg =
      project.backgroundGallery?.[0]?.url || '';

    const titleElement: MenuElement = {
      id: `el_title_${timestamp}`,
      type: 'text',
      text: project.title || 'Título de la Novela',

      x: 50,
      y: 20,

      slotX: 'center',
      verticalSlot: 'sky',
      styleVariant: 'title'
    };

    const playButton: MenuElement = {
      id: `el_btn_play_${timestamp + 1}`,
      type: 'button',
      text: 'Comenzar Historia',

      x: 50,
      y: 58,

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
      elements: [
        titleElement,
        playButton
      ]
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

      text:
        type === 'button'
          ? 'Nuevo Botón'
          : type === 'card'
            ? 'Nueva Tarjeta'
            : 'Texto Personalizado',

      x: 50,
      y: 50,

      slotX: 'center',
      verticalSlot: 'ground',

      styleVariant:
        type === 'button'
          ? 'primary'
          : 'subtitle',

      action:
        type === 'button'
          ? { type: 'start_game' }
          : undefined
    };

    addOrUpdateMenuElement(
      currentScreen.id,
      newElem
    );

    setActiveEditingElemId(newElem.id);
  };

  /*
   * Movimiento libre.
   *
   * Pointer Events permite que esto funcione tanto con:
   * - mouse
   * - touch
   * - stylus
   */
  const handlePointerDown = (
    e: React.PointerEvent,
    element: MenuElement
  ) => {
    e.stopPropagation();

    if (!canvasRef.current || !currentScreen) return;

    setActiveEditingElemId(element.id);
    setDraggingElementId(element.id);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Algunos navegadores pueden no soportarlo.
    }
  };

  const handlePointerMove = (
    e: React.PointerEvent
  ) => {
    if (
      !draggingElementId ||
      !canvasRef.current ||
      !currentScreen
    ) {
      return;
    }

    const rect =
      canvasRef.current.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return;

    const x =
      ((e.clientX - rect.left) / rect.width) * 100;

    const y =
      ((e.clientY - rect.top) / rect.height) * 100;

    const nextX = clamp(x, 0, 100);
    const nextY = clamp(y, 0, 100);

    const element =
      currentScreen.elements?.find(
        el => el.id === draggingElementId
      );

    if (!element) return;

    updateElement(
      normalizeElementPosition(element),
      {
        x: nextX,
        y: nextY
      }
    );
  };

  const handlePointerUp = () => {
    setDraggingElementId(null);
  };

  const getElementStyle = (
    el: MenuElement
  ): React.CSSProperties => {
    if (el.type === 'button') {
      return {
        background:
          el.styleVariant === 'danger'
            ? '#dc2626'
            : el.styleVariant === 'glass'
              ? 'rgba(15,23,42,0.78)'
              : el.styleVariant === 'secondary'
                ? '#1e293b'
                : '#2563eb',

        color: '#fff',
        padding: '8px 18px',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      };
    }

    if (el.type === 'card') {
      return {
        background:
          el.styleVariant === 'glass'
            ? 'rgba(15,23,42,0.75)'
            : '#1e293b',
        color: '#fff',
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
        el.styleVariant === 'title'
          ? '#38bdf8'
          : '#e2e8f0',

      fontSize:
        el.styleVariant === 'title'
          ? 18
          : 13,

      fontWeight:
        el.styleVariant === 'title'
          ? 900
          : 600,

      textShadow:
        '0 2px 8px rgba(0,0,0,0.8)',

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

        * {
          box-sizing: border-box;
        }

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

        .menu-editor-header {
          flex-shrink: 0;
        }

        .menu-editor-body {
          min-height: 0;
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .menu-screen-list {
          width: 260px;
          flex-shrink: 0;
        }

        .menu-editor-main {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .menu-screen-settings {
          flex-shrink: 0;
        }

        .menu-work-area {
          min-height: 0;
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .menu-preview-area {
          min-width: 0;
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .menu-inspector {
          width: 300px;
          flex-shrink: 0;
          overflow-y: auto;
        }

        .menu-canvas {
          width: min(100%, 720px);
          aspect-ratio: 16 / 9;
          flex-shrink: 0;
          touch-action: none;
        }

        .menu-element {
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
        }

        @media (max-width: 900px) {

          .menu-editor-root {
            height: 100dvh;
            max-width: none;
            border-radius: 0;
          }

          .menu-screen-list {
            width: 210px;
          }

          .menu-inspector {
            width: 250px;
          }

        }

        @media (max-width: 700px) {

          .menu-editor-root {
            border-radius: 0;
          }

          .menu-editor-header {
            padding: 10px 12px !important;
          }

          .menu-editor-header-subtitle {
            display: none;
          }

          .menu-editor-body {
            display: flex;
            flex-direction: column;
          }

          .menu-screen-list {
            width: 100%;
            height: auto;
            max-height: 150px;
            border-right: none !important;
            border-bottom: 1px solid #1f1f2e;
            padding: 8px !important;
            overflow-x: auto;
            overflow-y: hidden;
            flex-shrink: 0;
          }

          .menu-screen-list-items {
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto;
          }

          .menu-screen-item {
            min-width: 145px;
          }

          .menu-create-section {
            display: none !important;
          }

          .menu-editor-main {
            min-height: 0;
          }

          .menu-screen-settings {
            overflow-x: auto;
            flex-wrap: nowrap !important;
            padding: 8px !important;
          }

          .menu-screen-settings > div {
            flex-shrink: 0;
          }

          .menu-screen-settings-buttons {
            margin-left: 0 !important;
          }

          .menu-work-area {
            flex-direction: column;
            overflow: hidden;
          }

          .menu-preview-area {
            min-height: 0;
            flex: 1;
            padding: 8px;
            overflow: auto;
          }

          .menu-canvas {
            width: 100%;
            max-width: none;
          }

          .menu-inspector {
            width: 100%;
            max-height: 42%;
            border-left: none !important;
            border-top: 1px solid #1f1f2e;
            padding: 10px !important;
          }

          .menu-mobile-position {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
          }

        }

        @media (max-width: 450px) {

          .menu-editor-header strong {
            font-size: 14px !important;
          }

          .menu-editor-header {
            padding: 8px 10px !important;
          }

          .menu-screen-list {
            max-height: 120px;
          }

          .menu-preview-area {
            padding: 5px;
          }

          .menu-inspector {
            max-height: 48%;
          }

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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            <span style={{ fontSize: 22 }}>🖥️</span>

            <div>
              <strong
                style={{
                  fontSize: 16,
                  color: '#f8fafc'
                }}
              >
                Menús y Pantallas Finales
              </strong>

              <div
                className="menu-editor-header-subtitle"
                style={{
                  fontSize: 11,
                  color: '#94a3b8'
                }}
              >
                Diseña libremente tus menús, finales y pantallas
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
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: '#38bdf8'
              }}
            >
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
              <label
                style={{
                  fontSize: 10,
                  color: '#aaa',
                  display: 'block',
                  marginBottom: 4
                }}
              >
                Inicio del Juego
              </label>

              <select
                value={
                  project.startScreenType === 'menu' &&
                  project.startMenuId
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
                <option value="first_scene">
                  🎬 Arrancar en Escena 1
                </option>

                {screensList.map(screen => (
                  <option
                    key={screen.id}
                    value={screen.id}
                  >
                    🖥️ {screen.title}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="menu-screen-list-items"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                flex: 1
              }}
            >
              {screensList.map(screen => {
                const isSelected =
                  currentScreen?.id === screen.id;

                const isStart =
                  project.startMenuId === screen.id;

                return (
                  <div
                    key={screen.id}
                    className="menu-screen-item"
                    onClick={() => {
                      setSelectedScreenId(screen.id);
                      setActiveEditingElemId(null);
                    }}
                    style={{
                      background: isSelected
                        ? '#1e1e32'
                        : '#12121c',

                      border:
                        `1px solid ${
                          isSelected
                            ? '#38bdf8'
                            : '#232336'
                        }`,

                      borderRadius: 8,
                      padding: '8px 10px',
                      cursor: 'pointer',

                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isSelected
                            ? '#fff'
                            : '#ddd'
                        }}
                      >
                        {screen.title}
                      </div>

                      <div
                        style={{
                          fontSize: 9,
                          color: isStart
                            ? '#10b981'
                            : '#888'
                        }}
                      >
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

                        if (
                          window.confirm(
                            `¿Eliminar la pantalla "${screen.title}"?`
                          )
                        ) {
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
              className="menu-create-section"
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
                onChange={e =>
                  setNewScreenTitle(e.target.value)
                }
                style={{
                  background: '#161624',
                  border: '1px solid #333',
                  color: '#fff',
                  padding: '6px 8px',
                  borderRadius: 6,
                  fontSize: 11
                }}
              />

              <div
                style={{
                  display: 'flex',
                  gap: 4
                }}
              >
                <button
                  onClick={() =>
                    handleCreateScreen('start_menu')
                  }
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
                  onClick={() =>
                    handleCreateScreen('end_screen')
                  }
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      color: '#aaa'
                    }}
                  >
                    Título:
                  </label>

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

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      color: '#aaa'
                    }}
                  >
                    Fondo:
                  </label>

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
                    <option value="">
                      (Sin Fondo / Negro)
                    </option>

                    {project.backgroundGallery?.map(bg => (
                      <option
                        key={bg.id}
                        value={bg.url}
                      >
                        {bg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className="menu-screen-settings-buttons"
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    gap: 6
                  }}
                >
                  <button
                    onClick={() =>
                      handleAddElement('text')
                    }
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
                    onClick={() =>
                      handleAddElement('button')
                    }
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
                      backgroundImage:
                        currentScreen.backgroundUrl
                          ? `url(${currentScreen.backgroundUrl})`
                          : undefined,
                      backgroundColor: '#0c0c16',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: 10,
                      border: '1.5px solid #2d2d42',
                      boxShadow:
                        '0 10px 40px rgba(0,0,0,0.8)',
                      overflow: 'hidden'
                    }}
                  >

                    {currentScreen.elements?.map(el => {
                      const x = getElementX(el);
                      const y = getElementY(el);

                      const isSelected =
                        activeEditingElemId === el.id;

                      const isDragging =
                        draggingElementId === el.id;

                      return (
                        <div
                          key={el.id}
                          className="menu-element"
                          onPointerDown={e =>
                            handlePointerDown(e, el)
                          }
                          style={{
                            position: 'absolute',

                            left: `${x}%`,
                            top: `${y}%`,

                            transform:
                              'translate(-50%, -50%)',

                            cursor:
                              isDragging
                                ? 'grabbing'
                                : 'grab',

                            outline:
                              isSelected
                                ? '2px dashed #38bdf8'
                                : 'none',

                            outlineOffset: 5,

                            zIndex:
                              isSelected
                                ? 40
                                : 20,

                            touchAction: 'none'
                          }}
                        >
                          <div
                            style={getElementStyle(el)}
                          >
                            {el.text}
                          </div>
                        </div>
                      );
                    })}

                    {/* INDICACIÓN DEL MODO DE EDICIÓN */}
                    {currentScreen.elements?.length === 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          fontSize: 12,
                          textAlign: 'center',
                          pointerEvents: 'none'
                        }}
                      >
                        Añade un texto o botón
                        <br />
                        y arrástralo libremente.
                      </div>
                    )}
                  </div>
                </div>

                {/* INSPECTOR */}
                <div
                  className="menu-inspector"
                  style={{
                    borderLeft: '1px solid #1f1f2e',
                    background: '#0d0d16',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  {activeEditingElemId ? (() => {
                    const el =
                      currentScreen.elements?.find(
                        e =>
                          e.id ===
                          activeEditingElemId
                      );

                    if (!el) {
                      return (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#888'
                          }}
                        >
                          Selecciona un elemento.
                        </div>
                      );
                    }

                    const x = getElementX(el);
                    const y = getElementY(el);

                    return (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
                        }}
                      >

                        <div
                          style={{
                            display: 'flex',
                            justifyContent:
                              'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <strong
                            style={{
                              fontSize: 13,
                              color: '#38bdf8'
                            }}
                          >
                            {el.type === 'button'
                              ? '⚙️ Editar Botón'
                              : el.type === 'card'
                                ? '🗂️ Editar Tarjeta'
                                : '✍️ Editar Texto'}
                          </strong>

                          <button
                            onClick={() => {
                              deleteMenuElement(
                                currentScreen.id,
                                el.id
                              );
                              setActiveEditingElemId(
                                null
                              );
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
                          <label
                            style={{
                              fontSize: 10,
                              color: '#aaa',
                              display: 'block',
                              marginBottom: 2
                            }}
                          >
                            Texto
                          </label>

                          <input
                            type="text"
                            value={el.text}
                            onChange={e =>
                              updateElement(
                                el,
                                {
                                  text:
                                    e.target.value
                                }
                              )
                            }
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

                        {/* POSICIÓN LIBRE */}
                        <div
                          className="menu-mobile-position"
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              '1fr 1fr',
                            gap: 8
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: 10,
                                color: '#aaa',
                                display: 'block',
                                marginBottom: 2
                              }}
                            >
                              X (%)
                            </label>

                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={
                                Number(
                                  x.toFixed(1)
                                )
                              }
                              onChange={e => {
                                const value =
                                  Number(
                                    e.target.value
                                  );

                                if (
                                  !Number.isFinite(
                                    value
                                  )
                                ) {
                                  return;
                                }

                                updateElement(
                                  normalizeElementPosition(
                                    el
                                  ),
                                  {
                                    x: clamp(
                                      value,
                                      0,
                                      100
                                    )
                                  }
                                );
                              }}
                              style={{
                                width: '100%',
                                background: '#161624',
                                border: '1px solid #333',
                                color: '#38bdf8',
                                padding: '6px 8px',
                                borderRadius: 6,
                                fontSize: 12
                              }}
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: 10,
                                color: '#aaa',
                                display: 'block',
                                marginBottom: 2
                              }}
                            >
                              Y (%)
                            </label>

                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={
                                Number(
                                  y.toFixed(1)
                                )
                              }
                              onChange={e => {
                                const value =
                                  Number(
                                    e.target.value
                                  );

                                if (
                                  !Number.isFinite(
                                    value
                                  )
                                ) {
                                  return;
                                }

                                updateElement(
                                  normalizeElementPosition(
                                    el
                                  ),
                                  {
                                    y: clamp(
                                      value,
                                      0,
                                      100
                                    )
                                  }
                                );
                              }}
                              style={{
                                width: '100%',
                                background: '#161624',
                                border: '1px solid #333',
                                color: '#38bdf8',
                                padding: '6px 8px',
                                borderRadius: 6,
                                fontSize: 12
                              }}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 9,
                            color: '#64748b'
                          }}
                        >
                          También puedes arrastrar
                          directamente el elemento
                          dentro del lienzo.
                        </div>

                        {/* ESTILO */}
                        <div>
                          <label
                            style={{
                              fontSize: 10,
                              color: '#aaa',
                              display: 'block',
                              marginBottom: 2
                            }}
                          >
                            Estilo Visual
                          </label>

                          <select
                            value={el.styleVariant}
                            onChange={e =>
                              updateElement(
                                el,
                                {
                                  styleVariant:
                                    e.target
                                      .value as MenuElementStyle
                                }
                              )
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
                            <option value="primary">
                              Primario (Azul)
                            </option>

                            <option value="secondary">
                              Secundario (Gris)
                            </option>

                            <option value="glass">
                              Cristal / Glass
                            </option>

                            <option value="danger">
                              Peligro / Salir
                            </option>

                            <option value="title">
                              Título Destacado
                            </option>

                            <option value="subtitle">
                              Subtítulo
                            </option>
                          </select>
                        </div>

                        {/* ACCIÓN */}
                        {el.type === 'button' && (
                          <div
                            style={{
                              background: '#131320',
                              border:
                                '1px solid #232338',
                              borderRadius: 8,
                              padding: 8,
                              display: 'flex',
                              flexDirection:
                                'column',
                              gap: 6
                            }}
                          >
                            <label
                              style={{
                                fontSize: 10,
                                color: '#38bdf8',
                                fontWeight: 800
                              }}
                            >
                              Acción al hacer clic
                            </label>

                            <select
                              value={
                                el.action?.type ||
                                'start_game'
                              }
                              onChange={e =>
                                updateElement(
                                  el,
                                  {
                                    action: {
                                      type:
                                        e.target
                                          .value as any,
                                      targetSceneId:
                                        scenesList[0]
                                          ?.id || ''
                                    }
                                  }
                                )
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
                              <option value="start_game">
                                ▶ Comenzar Juego
                              </option>

                              <option value="jump_to_scene">
                                🎬 Saltar a Escena
                              </option>

                              <option value="jump_to_menu">
                                🖥️ Saltar a Menú
                              </option>

                              <option value="open_save_load">
                                💾 Guardar / Cargar
                              </option>

                              <option value="restart">
                                🔄 Reiniciar Partida
                              </option>
                            </select>

                            {el.action?.type ===
                              'jump_to_scene' && (
                              <div>
                                <label
                                  style={{
                                    fontSize: 9,
                                    color: '#aaa'
                                  }}
                                >
                                  Escena Destino:
                                </label>

                                <select
                                  value={
                                    el.action
                                      .targetSceneId ||
                                    scenesList[0]?.id ||
                                    ''
                                  }
                                  onChange={e =>
                                    updateElement(
                                      el,
                                      {
                                        action: {
                                          ...el.action!,
                                          targetSceneId:
                                            e.target
                                              .value
                                        }
                                      }
                                    )
                                  }
                                  style={{
                                    width: '100%',
                                    background:
                                      '#161624',
                                    border:
                                      '1px solid #333',
                                    color:
                                      '#38bdf8',
                                    padding: 4,
                                    borderRadius: 6,
                                    fontSize: 11
                                  }}
                                >
                                  {scenesList.map(
                                    (
                                      scene: any
                                    ) => (
                                      <option
                                        key={
                                          scene.id
                                        }
                                        value={
                                          scene.id
                                        }
                                      >
                                        {scene.title}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            )}

                            {el.action?.type ===
                              'jump_to_menu' && (
                              <div>
                                <label
                                  style={{
                                    fontSize: 9,
                                    color: '#aaa'
                                  }}
                                >
                                  Menú Destino:
                                </label>

                                <select
                                  value={
                                    el.action
                                      .targetMenuId ||
                                    screensList.find(
                                      s =>
                                        s.id !==
                                        currentScreen.id
                                    )?.id ||
                                    ''
                                  }
                                  onChange={e =>
                                    updateElement(
                                      el,
                                      {
                                        action: {
                                          ...el.action!,
                                          targetMenuId:
                                            e.target
                                              .value
                                        }
                                      }
                                    )
                                  }
                                  style={{
                                    width: '100%',
                                    background:
                                      '#161624',
                                    border:
                                      '1px solid #333',
                                    color:
                                      '#a855f7',
                                    padding: 4,
                                    borderRadius: 6,
                                    fontSize: 11
                                  }}
                                >
                                  {screensList
                                    .filter(
                                      s =>
                                        s.id !==
                                        currentScreen.id
                                    )
                                    .map(
                                      s => (
                                        <option
                                          key={s.id}
                                          value={
                                            s.id
                                          }
                                        >
                                          {s.title}
                                        </option>
                                      )
                                    )}
                                </select>
                              </div>
                            )}
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
                      Selecciona un elemento del
                      lienzo.
                      <br />
                      <br />
                      Puedes moverlo libremente con
                      el mouse o con el dedo.
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
              Crea o selecciona una pantalla para
              comenzar a diseñarla.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
