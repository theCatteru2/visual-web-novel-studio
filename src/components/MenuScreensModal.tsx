import { useState } from 'react';
import { useNovel } from '../context/NovelContext';
import {
  MenuScreen,
  MenuElement,
  MagneticSlot,
  VerticalSlot,
  MenuElementType,
  MenuElementStyle
} from '../types';

interface MenuScreensModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SLOTS_X: { slot: MagneticSlot; label: string }[] = [
  { slot: 'far-left', label: 'Ext-Izq' },
  { slot: 'left', label: 'Izq' },
  { slot: 'center-left', label: 'C-Izq' },
  { slot: 'center', label: 'Centro' },
  { slot: 'center-right', label: 'C-Der' },
  { slot: 'right', label: 'Der' },
  { slot: 'far-right', label: 'Ext-Der' }
];

const SLOTS_Y: { slot: VerticalSlot; label: string }[] = [
  { slot: 'sky', label: 'Cielo (Arriba)' },
  { slot: 'floating', label: 'Flotando' },
  { slot: 'elevated', label: 'Elevado' },
  { slot: 'ground', label: 'Centro/Normal' },
  { slot: 'floor', label: 'Suelo' },
  { slot: 'sink', label: 'Hundido' },
  { slot: 'deep_sink', label: 'Abajo' }
];

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

  const [selectedScreenId, setSelectedScreenId] = useState<string>(() => {
    return screensList[0]?.id || '';
  });

  const [activeEditingElemId, setActiveEditingElemId] =
    useState<string | null>(null);

  const [newScreenTitle, setNewScreenTitle] = useState('');

  if (!isOpen) return null;

  const currentScreen =
    customScreens[selectedScreenId] || screensList[0];

  const scenesList =
    (project as any).scenes ||
    project.chapters?.[0]?.scenes ||
    [];

  /*
   * Convierte los antiguos slots a posiciones libres.
   *
   * Los elementos antiguos no tienen x/y.
   * Por eso se usa esta conversión solamente como fallback.
   */
  const getElementPosition = (el: MenuElement) => {
    if (
      typeof el.x === 'number' &&
      typeof el.y === 'number'
    ) {
      return {
        x: el.x,
        y: el.y
      };
    }

    const xMap: Record<string, number> = {
      'far-left': 12,
      'left': 25,
      'center-left': 38,
      'center': 50,
      'center-right': 62,
      'right': 75,
      'far-right': 88
    };

    /*
     * Los valores antiguos estaban expresados desde bottom.
     * Los convertimos a coordenadas desde top.
     */
    const oldBottomMap: Record<string, number> = {
      'sky': 48,
      'floating': 36,
      'elevated': 24,
      'ground': 12,
      'floor': 8,
      'sink': 4,
      'deep_sink': 2
    };

    const oldBottom =
      oldBottomMap[el.verticalSlot] ?? 8;

    return {
      x: xMap[el.slotX] ?? 50,
      y: 100 - oldBottom
    };
  };

  /*
   * Crea una nueva pantalla.
   */
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

    const newId = `screen_${Date.now()}`;

    const defaultBg =
      project.backgroundGallery?.[0]?.url || '';

    const newScreen: MenuScreen = {
      id: newId,
      title,
      type,
      backgroundUrl: defaultBg,

      elements: [
        {
          id: `el_title_${Date.now()}`,
          type: 'text',
          text: project.title || 'Título de la Novela',

          // Compatibilidad con el sistema anterior
          slotX: 'center',
          verticalSlot: 'sky',

          // Nueva posición libre
          x: 50,
          y: 20,

          styleVariant: 'title'
        },

        {
          id: `el_btn_play_${Date.now() + 1}`,
          type: 'button',
          text: 'Comenzar Historia',

          // Compatibilidad
          slotX: 'center',
          verticalSlot: 'ground',

          // Nueva posición libre
          x: 50,
          y: 55,

          styleVariant: 'primary',

          action: {
            type: 'start_game'
          }
        }
      ]
    };

    addOrUpdateMenuScreen(newScreen);

    setSelectedScreenId(newId);
    setNewScreenTitle('');
    setActiveEditingElemId(null);
  };

  /*
   * Añade un elemento nuevo.
   */
  const handleAddElement = (
    type: MenuElementType
  ) => {
    if (!currentScreen) return;

    const newElem: MenuElement = {
      id: `elem_${Date.now()}`,

      type,

      text:
        type === 'button'
          ? 'Nuevo Botón'
          : 'Texto Personalizado',

      // Compatibilidad con menús anteriores
      slotX: 'center',
      verticalSlot: 'floor',

      // Posición libre inicial
      x: 50,
      y: 70,

      styleVariant:
        type === 'button'
          ? 'primary'
          : 'subtitle',

      action:
        type === 'button'
          ? {
              type: 'start_game'
            }
          : undefined
    };

    addOrUpdateMenuElement(
      currentScreen.id,
      newElem
    );

    setActiveEditingElemId(newElem.id);
  };

  /*
   * Movimiento libre del elemento.
   *
   * Funciona tanto con:
   * - mouse
   * - touch
   * - stylus
   */
  const handleElementPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    el: MenuElement
  ) => {
    if (!currentScreen) return;

    e.stopPropagation();

    const canvas =
      e.currentTarget.parentElement;

    if (!canvas) return;

    const rect =
      canvas.getBoundingClientRect();

    setActiveEditingElemId(el.id);

    /*
     * Calculamos el punto exacto donde agarramos
     * el elemento para que no "salte" al centro
     * cuando comienza el arrastre.
     */
    const currentPosition =
      getElementPosition(el);

    const pointerStartX = e.clientX;
    const pointerStartY = e.clientY;

    const startX = currentPosition.x;
    const startY = currentPosition.y;

    let hasMoved = false;

    const handlePointerMove = (
      moveEvent: PointerEvent
    ) => {
      const deltaX =
        moveEvent.clientX - pointerStartX;

      const deltaY =
        moveEvent.clientY - pointerStartY;

      if (
        Math.abs(deltaX) > 2 ||
        Math.abs(deltaY) > 2
      ) {
        hasMoved = true;
      }

      /*
       * Convertimos píxeles del movimiento
       * a porcentajes del lienzo.
       */
      const deltaPercentX =
        (deltaX / rect.width) * 100;

      const deltaPercentY =
        (deltaY / rect.height) * 100;

      const newX = Math.max(
        0,
        Math.min(
          100,
          startX + deltaPercentX
        )
      );

      const newY = Math.max(
        0,
        Math.min(
          100,
          startY + deltaPercentY
        )
      );

      /*
       * Guardamos inmediatamente la posición.
       */
      addOrUpdateMenuElement(
        currentScreen.id,
        {
          ...el,
          x: newX,
          y: newY
        }
      );
    };

    const handlePointerUp = () => {
      window.removeEventListener(
        'pointermove',
        handlePointerMove
      );

      window.removeEventListener(
        'pointerup',
        handlePointerUp
      );

      /*
       * No necesitamos hacer nada especial
       * al terminar el movimiento.
       *
       * La posición ya quedó guardada.
       */
      void hasMoved;
    };

    window.addEventListener(
      'pointermove',
      handlePointerMove
    );

    window.addEventListener(
      'pointerup',
      handlePointerUp
    );
  };

  return (
    <div
      className="menu-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 4, 8, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12
      }}
    >

      {/* =====================================================
          ESTILOS RESPONSIVOS
          ===================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .menu-modal {
          width: 100%;
          max-width: 1080px;
          height: 90vh;
          background: #0d0d16;
          border: 1px solid #232338;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0,0,0,0.85);
          color: #fff;
        }

        .menu-header {
          padding: 12px 20px;
          border-bottom: 1px solid #1f1f2e;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #12121e;
          flex-shrink: 0;
        }

        .menu-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .menu-header-text {
          min-width: 0;
        }

        .menu-header-main {
          font-size: 16px;
          color: #f8fafc;
        }

        .menu-header-description {
          font-size: 11px;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .menu-body {
          flex: 1;
          min-height: 0;
          display: flex;
          overflow: hidden;
        }

        .menu-screen-list {
          width: 260px;
          flex-shrink: 0;
          border-right: 1px solid #1f1f2e;
          background: #0a0a12;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
        }

        .menu-editor {
          flex: 1;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .menu-toolbar {
          padding: 10px 16px;
          border-bottom: 1px solid #1f1f2e;
          background: #12121e;
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        .menu-toolbar-field {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .menu-toolbar-input {
          min-width: 100px;
        }

        .menu-workspace {
          flex: 1;
          min-height: 0;
          display: flex;
          overflow: hidden;
        }

        .menu-canvas-area {
          flex: 1;
          min-width: 0;
          min-height: 0;
          background: #06060a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow: hidden;
        }

        .menu-canvas {
          position: relative;
          width: 100%;
          max-width: 640px;
          aspect-ratio: 16 / 9;
          background-color: #0c0c16;
          background-size: cover;
          background-position: center;
          border-radius: 10px;
          border: 1.5px solid #2d2d42;
          box-shadow: 0 10px 40px rgba(0,0,0,0.8);
          overflow: hidden;
          flex-shrink: 0;
        }

        .menu-element {
          position: absolute;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }

        .menu-inspector {
          width: 300px;
          flex-shrink: 0;
          border-left: 1px solid #1f1f2e;
          background: #0d0d16;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        .menu-mobile-section-title {
          display: none;
        }

        /*
         * TABLET
         */
        @media (max-width: 850px) {

          .menu-screen-list {
            width: 210px;
          }

          .menu-inspector {
            width: 260px;
            padding: 12px;
          }

          .menu-toolbar {
            padding: 8px 10px;
            gap: 8px;
          }

          .menu-canvas-area {
            padding: 10px;
          }
        }

        /*
         * MÓVIL
         */
        @media (max-width: 700px) {

          .menu-modal-overlay {
            padding: 0 !important;
          }

          .menu-modal {
            width: 100%;
            height: 100dvh;
            max-width: none;
            border-radius: 0;
            border: none;
          }

          .menu-header {
            padding: 9px 12px;
          }

          .menu-header-title {
            gap: 7px;
          }

          .menu-header-title > span {
            font-size: 18px !important;
          }

          .menu-header-main {
            font-size: 13px;
          }

          .menu-header-description {
            display: none;
          }

          .menu-body {
            flex-direction: column;
            overflow-y: auto;
            overflow-x: hidden;
          }

          /*
           * LISTA DE PANTALLAS
           */
          .menu-screen-list {
            width: 100%;
            height: auto;
            max-height: 145px;
            min-height: 0;
            border-right: none;
            border-bottom: 1px solid #1f1f2e;
            padding: 8px;
            gap: 7px;
            flex-shrink: 0;
          }

          .menu-screen-list > div:first-child {
            font-size: 11px !important;
          }

          /*
           * Editor
           */
          .menu-editor {
            width: 100%;
            flex: 1;
            min-height: 0;
            overflow: visible;
          }

          /*
           * Barra de propiedades
           */
          .menu-toolbar {
            padding: 8px;
            gap: 7px;
            max-height: 125px;
            overflow-y: auto;
            flex-shrink: 0;
          }

          .menu-toolbar-field {
            flex: 1 1 100%;
          }

          .menu-toolbar-field label {
            min-width: 45px;
          }

          .menu-toolbar-input,
          .menu-toolbar select {
            flex: 1;
            min-width: 0;
            width: 100%;
          }

          .menu-toolbar-buttons {
            width: 100% !important;
            margin-left: 0 !important;
            display: flex !important;
          }

          .menu-toolbar-buttons button {
            flex: 1;
          }

          /*
           * Workspace móvil:
           * lienzo arriba + inspector abajo
           */
          .menu-workspace {
            flex-direction: column;
            overflow-y: auto;
            overflow-x: hidden;
          }

          .menu-canvas-area {
            width: 100%;
            flex: none;
            padding: 8px;
            min-height: 0;
            height: auto;
          }

          .menu-canvas {
            width: 100%;
            max-width: none;
          }

          /*
           * Inspector abajo
           */
          .menu-inspector {
            width: 100%;
            height: auto;
            max-height: 48dvh;
            min-height: 180px;
            border-left: none;
            border-top: 1px solid #1f1f2e;
            padding: 10px;
            flex-shrink: 0;
          }

          .menu-mobile-section-title {
            display: block;
            font-size: 10px;
            font-weight: 800;
            color: #38bdf8;
            margin-bottom: 2px;
          }
        }

        /*
         * TELÉFONOS PEQUEÑOS
         */
        @media (max-width: 480px) {

          .menu-header {
            padding: 7px 9px;
          }

          .menu-header-main {
            font-size: 12px;
          }

          .menu-screen-list {
            max-height: 125px;
            padding: 6px;
          }

          .menu-toolbar {
            max-height: 135px;
          }

          .menu-canvas-area {
            padding: 5px;
          }

          .menu-inspector {
            max-height: 52dvh;
            padding: 9px;
          }
        }

      `}</style>

      {/* =====================================================
          MODAL
          ===================================================== */}

      <div className="menu-modal">

        {/* ===================================================
            CABECERA
            =================================================== */}

        <div className="menu-header">

          <div className="menu-header-title">

            <span style={{ fontSize: 22 }}>
              🖥️
            </span>

            <div className="menu-header-text">

              <strong className="menu-header-main">
                Menús y Pantallas Finales
              </strong>

              <div className="menu-header-description">
                Diseña pantallas de inicio, finales alternativos,
                créditos o menús interactivos
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

        {/* ===================================================
            CUERPO
            =================================================== */}

        <div className="menu-body">

          {/* =================================================
              PANEL DE PANTALLAS
              ================================================= */}

          <div className="menu-screen-list">

            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: '#38bdf8'
              }}
            >
              Pantallas del Proyecto
            </div>

            {/* Inicio del juego */}

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
                onChange={(e) => {

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
                  padding: '5px',
                  borderRadius: 6,
                  fontSize: 11
                }}
              >

                <option value="first_scene">
                  🎬 Arrancar en Escena 1
                </option>

                {screensList.map(s => (
                  <option
                    key={s.id}
                    value={s.id}
                  >
                    🖥️ {s.title}
                  </option>
                ))}

              </select>

            </div>

            {/* Lista */}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                flex: 1,
                overflowY: 'auto'
              }}
            >

              {screensList.length === 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: '#666',
                    textAlign: 'center',
                    padding: '20px 0'
                  }}
                >
                  No hay pantallas de menú creadas aún.
                </div>
              )}

              {screensList.map(screen => {

                const isSelected =
                  currentScreen?.id === screen.id;

                const isStart =
                  project.startMenuId === screen.id;

                return (
                  <div
                    key={screen.id}
                    onClick={() => {

                      setSelectedScreenId(screen.id);

                      setActiveEditingElemId(null);

                    }}
                    style={{
                      background:
                        isSelected
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
                      alignItems: 'center',

                      flexShrink: 0
                    }}
                  >

                    <div
                      style={{
                        minWidth: 0
                      }}
                    >

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color:
                            isSelected
                              ? '#fff'
                              : '#ddd',

                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {screen.title}
                      </div>

                      <div
                        style={{
                          fontSize: 9,
                          color:
                            isStart
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
                      onClick={(e) => {

                        e.stopPropagation();

                        if (
                          window.confirm(
                            `¿Eliminar la pantalla "${screen.title}"?`
                          )
                        ) {
                          deleteMenuScreen(screen.id);
                        }

                      }}
                      title="Eliminar pantalla"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: 12,
                        flexShrink: 0
                      }}
                    >
                      🗑️
                    </button>

                  </div>
                );
              })}

            </div>

            {/* Crear pantalla */}

            <div
              style={{
                borderTop: '1px solid #1f1f2e',
                paddingTop: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                flexShrink: 0
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
                  fontSize: 11,
                  width: '100%'
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
                    padding: '6px',
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
                    padding: '6px',
                    background: '#7c3aed',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Final / Créditos
                </button>

              </div>

            </div>

          </div>

          {/* =================================================
              EDITOR
              ================================================= */}

          {currentScreen ? (

            <div className="menu-editor">

              {/* =============================================
                  BARRA DE PROPIEDADES
                  ============================================= */}

              <div className="menu-toolbar">

                <div className="menu-toolbar-field">

                  <label
                    style={{
                      fontSize: 11,
                      color: '#aaa'
                    }}
                  >
                    Título:
                  </label>

                  <input
                    className="menu-toolbar-input"
                    type="text"
                    value={currentScreen.title}
                    onChange={(e) =>
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

                <div className="menu-toolbar-field">

                  <label
                    style={{
                      fontSize: 11,
                      color: '#aaa'
                    }}
                  >
                    Fondo:
                  </label>

                  <select
                    value={
                      currentScreen.backgroundUrl
                    }
                    onChange={(e) =>
                      addOrUpdateMenuScreen({
                        ...currentScreen,
                        backgroundUrl:
                          e.target.value
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

                <div className="menu-toolbar-field">

                  <label
                    style={{
                      fontSize: 11,
                      color: '#aaa'
                    }}
                  >
                    Música BGM:
                  </label>

                  <select
                    value={
                      currentScreen.bgmUrl || ''
                    }
                    onChange={(e) =>
                      addOrUpdateMenuScreen({
                        ...currentScreen,
                        bgmUrl:
                          e.target.value ||
                          undefined
                      })
                    }
                    style={{
                      background: '#161624',
                      border: '1px solid #333',
                      color: '#a855f7',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 11
                    }}
                  >

                    <option value="">
                      (Sin música)
                    </option>

                    <option value="stop">
                      🛑 Detener música anterior
                    </option>

                    {project.audioGallery
                      ?.filter(a => a.type === 'bgm')
                      .map(bgm => (
                        <option
                          key={bgm.id}
                          value={bgm.url}
                        >
                          🎵 {bgm.name}
                        </option>
                      ))}

                  </select>

                </div>

                <div
                  className="menu-toolbar-buttons"
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
                    + Añadir Texto
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
                    + Añadir Botón
                  </button>

                </div>

              </div>

              {/* =============================================
                  WORKSPACE
                  ============================================= */}

              <div className="menu-workspace">

                {/* ===========================================
                    LIENZO
                    =========================================== */}

                <div className="menu-canvas-area">

                  <div
                    className="menu-canvas"
                    style={{
                      backgroundImage:
                        currentScreen.backgroundUrl
                          ? `url(${currentScreen.backgroundUrl})`
                          : undefined
                    }}
                  >

                    {currentScreen.elements?.map(el => {

                      const position =
                        getElementPosition(el);

                      const isSelected =
                        activeEditingElemId === el.id;

                      return (

                        <div
                          key={el.id}
                          className="menu-element"

                          onPointerDown={(e) =>
                            handleElementPointerDown(
                              e,
                              el
                            )
                          }

                          onClick={(e) => {

                            e.stopPropagation();

                            setActiveEditingElemId(
                              el.id
                            );

                          }}

                          style={{
                            left: `${position.x}%`,
                            top: `${position.y}%`,

                            transform:
                              'translate(-50%, -50%)',

                            cursor: 'grab',

                            outline:
                              isSelected
                                ? '2px dashed #38bdf8'
                                : 'none',

                            outlineOffset: 5,

                            zIndex:
                              isSelected
                                ? 40
                                : 20
                          }}
                        >

                          {el.type === 'button' ? (

                            <div
                              style={{
                                background:
                                  el.styleVariant ===
                                  'danger'
                                    ? '#dc2626'
                                    : el.styleVariant ===
                                      'glass'
                                      ? 'rgba(15,23,42,0.75)'
                                      : el.styleVariant ===
                                        'secondary'
                                        ? '#1e293b'
                                        : '#2563eb',

                                color: '#fff',

                                padding:
                                  '6px 14px',

                                borderRadius: 6,

                                fontSize: 12,

                                fontWeight: 800,

                                whiteSpace:
                                  'nowrap',

                                boxShadow:
                                  '0 4px 12px rgba(0,0,0,0.5)'
                              }}
                            >
                              {el.text}
                            </div>

                          ) : (

                            <div
                              style={{
                                color:
                                  el.styleVariant ===
                                  'title'
                                    ? '#38bdf8'
                                    : '#e2e8f0',

                                fontSize:
                                  el.styleVariant ===
                                  'title'
                                    ? 18
                                    : 13,

                                fontWeight:
                                  el.styleVariant ===
                                  'title'
                                    ? 900
                                    : 600,

                                textShadow:
                                  '0 2px 8px rgba(0,0,0,0.8)',

                                whiteSpace:
                                  'nowrap'
                              }}
                            >
                              {el.text}
                            </div>

                          )}

                        </div>

                      );

                    })}

                  </div>

                </div>

                {/* ===========================================
                    INSPECTOR
                    =========================================== */}

                <div className="menu-inspector">

                  <div className="menu-mobile-section-title">
                    INSPECTOR
                  </div>

                  {activeEditingElemId ? (

                    (() => {

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
                            Selecciona un elemento
                            para editarlo.
                          </div>
                        );

                      }

                      const position =
                        getElementPosition(el);

                      return (

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                          }}
                        >

                          {/* Título inspector */}

                          <div
                            style={{
                              display: 'flex',
                              justifyContent:
                                'space-between',
                              alignItems:
                                'center'
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

                          {/* Texto */}

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
                              onChange={(e) =>
                                addOrUpdateMenuElement(
                                  currentScreen.id,
                                  {
                                    ...el,
                                    text:
                                      e.target.value
                                  }
                                )
                              }
                              style={{
                                width: '100%',
                                background: '#161624',
                                border:
                                  '1px solid #333',
                                color: '#fff',
                                padding:
                                  '6px 8px',
                                borderRadius: 6,
                                fontSize: 12
                              }}
                            />

                          </div>

                          {/* =================================
                              POSICIÓN LIBRE
                              ================================= */}

                          <div
                            style={{
                              background:
                                '#131320',

                              border:
                                '1px solid #232338',

                              borderRadius: 8,

                              padding: 8,

                              display: 'flex',

                              flexDirection:
                                'column',

                              gap: 7
                            }}
                          >

                            <div
                              style={{
                                fontSize: 10,
                                color: '#38bdf8',
                                fontWeight: 800
                              }}
                            >
                              Posición libre
                            </div>

                            <div
                              style={{
                                fontSize: 9,
                                color: '#777'
                              }}
                            >
                              También podés
                              arrastrar el elemento
                              directamente en el
                              lienzo.
                            </div>

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns:
                                  '1fr 1fr',
                                gap: 8
                              }}
                            >

                              {/* X */}

                              <div>

                                <label
                                  style={{
                                    fontSize: 9,
                                    color: '#aaa',
                                    display:
                                      'block',
                                    marginBottom:
                                      2
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
                                    position.x
                                  }
                                  onChange={(e) => {

                                    const value =
                                      Number(
                                        e.target
                                          .value
                                      );

                                    addOrUpdateMenuElement(
                                      currentScreen.id,
                                      {
                                        ...el,
                                        x: Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            value
                                          )
                                        ),
                                        y: position.y
                                      }
                                    );

                                  }}
                                  style={{
                                    width: '100%',
                                    background:
                                      '#161624',
                                    border:
                                      '1px solid #333',
                                    color: '#fff',
                                    padding: '5px',
                                    borderRadius:
                                      6,
                                    fontSize: 11
                                  }}
                                />

                              </div>

                              {/* Y */}

                              <div>

                                <label
                                  style={{
                                    fontSize: 9,
                                    color: '#aaa',
                                    display:
                                      'block',
                                    marginBottom:
                                      2
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
                                    position.y
                                  }
                                  onChange={(e) => {

                                    const value =
                                      Number(
                                        e.target
                                          .value
                                      );

                                    addOrUpdateMenuElement(
                                      currentScreen.id,
                                      {
                                        ...el,
                                        x: position.x,
                                        y: Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            value
                                          )
                                        )
                                      }
                                    );

                                  }}
                                  style={{
                                    width: '100%',
                                    background:
                                      '#161624',
                                    border:
                                      '1px solid #333',
                                    color: '#fff',
                                    padding: '5px',
                                    borderRadius:
                                      6,
                                    fontSize: 11
                                  }}
                                />

                              </div>

                            </div>

                          </div>

                          {/* Estilo */}

                          <div>

                            <label
                              style={{
                                fontSize: 10,
                                color: '#aaa',
                                display:
                                  'block',
                                marginBottom: 2
                              }}
                            >
                              Estilo Visual
                            </label>

                            <select
                              value={
                                el.styleVariant
                              }
                              onChange={(e) =>
                                addOrUpdateMenuElement(
                                  currentScreen.id,
                                  {
                                    ...el,
                                    styleVariant:
                                      e.target
                                        .value as MenuElementStyle
                                  }
                                )
                              }
                              style={{
                                width: '100%',
                                background:
                                  '#161624',
                                border:
                                  '1px solid #333',
                                color: '#fff',
                                padding: '5px',
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
                                Peligro / Salir (Rojo)
                              </option>

                              <option value="title">
                                Título Destacado
                              </option>

                              <option value="subtitle">
                                Subtítulo
                              </option>

                            </select>

                          </div>

                          {/* =================================
                              ACCIÓN DEL BOTÓN
                              ================================= */}

                          {el.type === 'button' && (

                            <div
                              style={{
                                background:
                                  '#131320',

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
                                onChange={(e) =>
                                  addOrUpdateMenuElement(
                                    currentScreen.id,
                                    {
                                      ...el,
                                      action: {
                                        type:
                                          e.target
                                            .value as any,

                                        targetSceneId:
                                          scenesList[0]
                                            ?.id ||
                                          ''
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
                                  color: '#fff',
                                  padding: '5px',
                                  borderRadius: 6,
                                  fontSize: 11
                                }}
                              >

                                <option value="start_game">
                                  ▶ Comenzar Juego
                                </option>

                                <option value="jump_to_scene">
                                  🎬 Saltar a Escena Específica
                                </option>

                                <option value="jump_to_menu">
                                  🖥️ Saltar a otro Menú / Final
                                </option>

                                <option value="open_save_load">
                                  💾 Abrir Guardar / Cargar
                                </option>

                                <option value="restart">
                                  🔄 Reiniciar Partida
                                </option>

                              </select>

                              {/* Escena destino */}

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
                                      scenesList[0]
                                        ?.id ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      addOrUpdateMenuElement(
                                        currentScreen.id,
                                        {
                                          ...el,

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
                                      padding:
                                        '4px',
                                      borderRadius:
                                        6,
                                      fontSize:
                                        11
                                    }}
                                  >

                                    {scenesList.map(
                                      (sc: any) => (
                                        <option
                                          key={sc.id}
                                          value={sc.id}
                                        >
                                          {sc.title}
                                        </option>
                                      )
                                    )}

                                  </select>

                                </div>

                              )}

                              {/* Menú destino */}

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
                                      screensList[0]
                                        ?.id ||
                                      ''
                                    }
                                    onChange={(e) =>
                                      addOrUpdateMenuElement(
                                        currentScreen.id,
                                        {
                                          ...el,

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
                                      padding:
                                        '4px',
                                      borderRadius:
                                        6,
                                      fontSize:
                                        11
                                    }}
                                  >

                                    {screensList
                                      .filter(
                                        s =>
                                          s.id !==
                                          currentScreen.id
                                      )
                                      .map(s => (
                                        <option
                                          key={s.id}
                                          value={s.id}
                                        >
                                          {s.title}
                                        </option>
                                      ))}

                                  </select>

                                </div>

                              )}

                            </div>

                          )}

                        </div>

                      );

                    })()

                  ) : (

                    <div
                      style={{
                        fontSize: 11,
                        color: '#888',
                        textAlign: 'center',
                        padding: '30px 0'
                      }}
                    >
                      Haz clic en un elemento
                      del lienzo o añade uno nuevo
                      para configurarlo.
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
              Crea o selecciona una pantalla
              en el panel izquierdo para
              comenzar a diseñarla.
            </div>

          )}

        </div>

      </div>

    </div>
  );
}
