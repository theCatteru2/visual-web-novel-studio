import React, { useState } from 'react';
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

  const [selectedScreenId, setSelectedScreenId] = useState<string>(() => {
    return screensList[0]?.id || '';
  });

  const [activeEditingElemId, setActiveEditingElemId] = useState<string | null>(null);
  const [newScreenTitle, setNewScreenTitle] = useState('');

  if (!isOpen) return null;

  const currentScreen = customScreens[selectedScreenId] || screensList[0];

  const handleCreateScreen = (type: 'start_menu' | 'end_screen' | 'custom_menu') => {
    const title = newScreenTitle.trim() || (type === 'start_menu' ? 'Menú Principal' : (type === 'end_screen' ? 'Pantalla Final' : 'Nuevo Menú'));
    const newId = `screen_${Date.now()}`;
    const defaultBg = project.backgroundGallery?.[0]?.url || '';

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
          slotX: 'center',
          verticalSlot: 'sky',
          styleVariant: 'title'
        },
        {
          id: `el_btn_play_${Date.now() + 1}`,
          type: 'button',
          text: 'Comenzar Historia',
          slotX: 'center',
          verticalSlot: 'ground',
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
  };

  const handleAddElement = (type: MenuElementType) => {
    if (!currentScreen) return;
    const newElem: MenuElement = {
      id: `elem_${Date.now()}`,
      type,
      text: type === 'button' ? 'Nuevo Botón' : 'Texto Personalizado',
      slotX: 'center',
      verticalSlot: 'floor',
      styleVariant: type === 'button' ? 'primary' : 'subtitle',
      action: type === 'button' ? { type: 'start_game' } : undefined
    };

    addOrUpdateMenuElement(currentScreen.id, newElem);
    setActiveEditingElemId(newElem.id);
  };

  const scenesList = (project as any).scenes || project.chapters?.[0]?.scenes || [];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 4, 8, 0.88)',
      backdropFilter: 'blur(8px)',
      zIndex: 120,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12
    }}>
      <div style={{
        background: '#0d0d16',
        border: '1px solid #232338',
        borderRadius: 16,
        width: '100%',
        maxWidth: 1080,
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
        color: '#fff',
        overflow: 'hidden'
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #1f1f2e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#12121e'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🖥️</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>Menús y Pantallas Finales</strong>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Diseña pantallas de inicio, finales alternativos, créditos o menús interactivos
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        {/* Cuerpo Principal */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Panel Izquierdo: Lista de Pantallas */}
          <div style={{
            width: 260,
            borderRight: '1px solid #1f1f2e',
            background: '#0a0a12',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8' }}>Pantallas del Proyecto</div>

            {/* Selector de Pantalla de Inicio del Juego */}
            <div style={{ background: '#141422', border: '1px solid #232338', borderRadius: 8, padding: 8 }}>
              <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 4 }}>Inicio del Juego</label>
              <select
                value={project.startScreenType === 'menu' && project.startMenuId ? project.startMenuId : 'first_scene'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'first_scene') {
                    setProject(prev => ({ ...prev, startScreenType: 'scene', startMenuId: undefined }));
                  } else {
                    setProject(prev => ({ ...prev, startScreenType: 'menu', startMenuId: val }));
                  }
                }}
                style={{ width: '100%', background: '#0a0a12', border: '1px solid #333', color: '#38bdf8', padding: '5px', borderRadius: 6, fontSize: 11 }}
              >
                <option value="first_scene">🎬 Arrancar en Escena 1</option>
                {screensList.map(s => (
                  <option key={s.id} value={s.id}>🖥️ {s.title}</option>
                ))}
              </select>
            </div>

            {/* Lista de Menús Creados */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {screensList.length === 0 && (
                <div style={{ fontSize: 11, color: '#666', textAlign: 'center', padding: '20px 0' }}>
                  No hay pantallas de menú creadas aún.
                </div>
              )}

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
                        {isStart ? '★ Pantalla de Inicio' : (screen.type === 'end_screen' ? 'Pantalla Final' : 'Menú')}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Eliminar la pantalla "${screen.title}"?`)) {
                          deleteMenuScreen(screen.id);
                        }
                      }}
                      title="Eliminar pantalla"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Crear Nueva Pantalla */}
            <div style={{ borderTop: '1px solid #1f1f2e', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                type="text"
                placeholder="Nombre de la pantalla..."
                value={newScreenTitle}
                onChange={e => setNewScreenTitle(e.target.value)}
                style={{ background: '#161624', border: '1px solid #333', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 11 }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => handleCreateScreen('start_menu')}
                  style={{ flex: 1, padding: '6px', background: '#2563eb', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                >
                  + Menú Inicio
                </button>
                <button
                  onClick={() => handleCreateScreen('end_screen')}
                  style={{ flex: 1, padding: '6px', background: '#7c3aed', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                >
                  + Final / Crits
                </button>
              </div>
            </div>
          </div>

          {/* Panel Central y Derecho: Editor del Menú Seleccionado */}
          {currentScreen ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Barra de Propiedades de la Pantalla */}
              <div style={{
                padding: '10px 16px',
                borderBottom: '1px solid #1f1f2e',
                background: '#12121e',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: '#aaa' }}>Título:</label>
                  <input
                    type="text"
                    value={currentScreen.title}
                    onChange={(e) => addOrUpdateMenuScreen({ ...currentScreen, title: e.target.value })}
                    style={{ background: '#161624', border: '1px solid #333', color: '#fff', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: '#aaa' }}>Fondo:</label>
                  <select
                    value={currentScreen.backgroundUrl}
                    onChange={(e) => addOrUpdateMenuScreen({ ...currentScreen, backgroundUrl: e.target.value })}
                    style={{ background: '#161624', border: '1px solid #333', color: '#38bdf8', padding: '4px 8px', borderRadius: 6, fontSize: 11 }}
                  >
                    <option value="">(Sin Fondo / Negro)</option>
                    {project.backgroundGallery?.map(bg => (
                      <option key={bg.id} value={bg.url}>{bg.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: '#aaa' }}>Música BGM:</label>
                  <select
                    value={currentScreen.bgmUrl || ''}
                    onChange={(e) => addOrUpdateMenuScreen({ ...currentScreen, bgmUrl: e.target.value || undefined })}
                    style={{ background: '#161624', border: '1px solid #333', color: '#a855f7', padding: '4px 8px', borderRadius: 6, fontSize: 11 }}
                  >
                    <option value="">(Sin música)</option>
                    <option value="stop">🛑 Detener música anterior</option>
                    {project.audioGallery?.filter(a => a.type === 'bgm').map(bgm => (
                      <option key={bgm.id} value={bgm.url}>🎵 {bgm.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleAddElement('text')}
                    style={{ padding: '5px 10px', background: '#334155', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Añadir Texto
                  </button>
                  <button
                    onClick={() => handleAddElement('button')}
                    style={{ padding: '5px 10px', background: '#2563eb', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                  >
                    + Añadir Botón
                  </button>
                </div>
              </div>

              {/* Área de Trabajo: Previsualización + Inspector de Elemento */}
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Previsualización del Lienzo */}
                <div style={{
                  flex: 1,
                  background: '#06060a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 640,
                    aspectRatio: '16 / 9',
                    backgroundImage: currentScreen.backgroundUrl ? `url(${currentScreen.backgroundUrl})` : undefined,
                    backgroundColor: '#0c0c16',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: 10,
                    border: '1.5px solid #2d2d42',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                    overflow: 'hidden'
                  }}>
                    {currentScreen.elements?.map(el => {
                      const slotXPercent = el.slotX === 'far-left' ? '12%' : el.slotX === 'left' ? '25%' : el.slotX === 'center-left' ? '38%' : el.slotX === 'center' ? '50%' : el.slotX === 'center-right' ? '62%' : el.slotX === 'right' ? '75%' : '88%';
                      const slotYPercent = el.verticalSlot === 'sky' ? '48%' : el.verticalSlot === 'floating' ? '36%' : el.verticalSlot === 'elevated' ? '24%' : el.verticalSlot === 'ground' ? '12%' : el.verticalSlot === 'floor' ? '0%' : el.verticalSlot === 'sink' ? '-12%' : '-25%';

                      const isSelected = activeEditingElemId === el.id;

                      return (
                        <div
                          key={el.id}
                          onClick={() => setActiveEditingElemId(el.id)}
                          style={{
                            position: 'absolute',
                            bottom: slotYPercent,
                            left: slotXPercent,
                            transform: 'translate(-50%, 50%)',
                            cursor: 'pointer',
                            outline: isSelected ? '2px dashed #38bdf8' : 'none',
                            outlineOffset: 4,
                            zIndex: isSelected ? 40 : 20
                          }}
                        >
                          {el.type === 'button' ? (
                            <div style={{
                              background: el.styleVariant === 'danger' ? '#dc2626' : el.styleVariant === 'glass' ? 'rgba(15,23,42,0.75)' : el.styleVariant === 'secondary' ? '#1e293b' : '#2563eb',
                              color: '#fff',
                              padding: '6px 14px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}>
                              {el.text}
                            </div>
                          ) : (
                            <div style={{
                              color: el.styleVariant === 'title' ? '#38bdf8' : '#e2e8f0',
                              fontSize: el.styleVariant === 'title' ? 18 : 13,
                              fontWeight: el.styleVariant === 'title' ? 900 : 600,
                              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                              whiteSpace: 'nowrap'
                            }}>
                              {el.text}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Inspector Lateral de Elemento Seleccionado */}
                <div style={{
                  width: 300,
                  borderLeft: '1px solid #1f1f2e',
                  background: '#0d0d16',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  overflowY: 'auto'
                }}>
                  {activeEditingElemId ? (() => {
                    const el = currentScreen.elements?.find(e => e.id === activeEditingElemId);
                    if (!el) return <div style={{ fontSize: 11, color: '#888' }}>Selecciona un elemento para editarlo.</div>;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: 13, color: '#38bdf8' }}>
                            {el.type === 'button' ? '⚙️ Editar Botón' : '✍️ Editar Texto'}
                          </strong>
                          <button
                            onClick={() => deleteMenuElement(currentScreen.id, el.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                          >
                            Eliminar
                          </button>
                        </div>

                        <div>
                          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Texto</label>
                          <input
                            type="text"
                            value={el.text}
                            onChange={(e) => addOrUpdateMenuElement(currentScreen.id, { ...el, text: e.target.value })}
                            style={{ width: '100%', background: '#161624', border: '1px solid #333', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12 }}
                          />
                        </div>

                        {/* Posicionamiento en 2 ejes */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Posición X</label>
                            <select
                              value={el.slotX}
                              onChange={(e) => addOrUpdateMenuElement(currentScreen.id, { ...el, slotX: e.target.value as MagneticSlot })}
                              style={{ width: '100%', background: '#161624', border: '1px solid #333', color: '#fff', padding: '5px', borderRadius: 6, fontSize: 11 }}
                            >
                              {SLOTS_X.map(s => (
                                <option key={s.slot} value={s.slot}>{s.label}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Posición Y</label>
                            <select
                              value={el.verticalSlot}
                              onChange={(e) => addOrUpdateMenuElement(currentScreen.id, { ...el, verticalSlot: e.target.value as VerticalSlot })}
                              style={{ width: '100%', background: '#161624', border: '1px solid #333', color: '#fff', padding: '5px', borderRadius: 6, fontSize: 11 }}
                            >
                              {SLOTS_Y.map(s => (
                                <option key={s.slot} value={s.slot}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Estilo Visual</label>
                          <select
                            value={el.styleVariant}
                            onChange={(e) => addOrUpdateMenuElement(currentScreen.id, { ...el, styleVariant: e.target.value as MenuElementStyle })}
                            style={{ width: '100%', background: '#161624', border: '1px solid #333', color: '#fff', padding: '5px', borderRadius: 6, fontSize: 11 }}
                          >
                            <option value="primary">Primario (Azul)</option>
                            <option value="secondary">Secundario (Gris)</option>
                            <option value="glass">Cristal / Glass</option>
                            <option value="danger">Peligro / Salir (Rojo)</option>
                            <option value="title">Título Destacado</option>
                            <option value="subtitle">Subtítulo</option>
                          </select>
                        </div>

                        {/* Acción al presionar el Botón */}
                        {el.type === 'button' && (
                          <div style={{ background: '#131320', border: '1px solid #232338', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 10, color: '#38bdf8', fontWeight: 800 }}>Acción al hacer clic</label>
                            <select
                              value={el.action?.type || 'start_game'}
                              onChange={(e) => addOrUpdateMenuElement(currentScreen.id, {
                                ...el,
                                action: {
                                  type: e.target.value as any,
                                  targetSceneId: scenesList[0]?.id || ''
                                }
                              })}
                              style={{ width: '100%', background: '#161624', border: '1px solid #333', color: '#fff', padding: '5px', borderRadius: 6, fontSize: 11 }}
                            >
                              <option value="start_game">▶ Comenzar Juego (Desde el inicio)</option>
                              <option value="jump_to_scene">🎬 Saltar a Escena Específica</option>
                              <option value="jump_to_menu">🖥️ Saltar a otro Menú / Final</option>
                              <option value="open_save_load">💾 Abrir Guardar / Cargar</option>
                              <option value="restart">🔄 Reiniciar Partida</option>
                            </select>

                            {el.action?.type === 'jump_to_scene' && (
                              <div>
                                <label style={{ fontSize: 9, color: '#aaa' }}>Escena Destino:</label>
                                <select
                                  value={el.action.targetSceneId || scenesList[0]?.id || ''}
                                  onChange={(e) => addOrUpdateMenuElement(currentScreen.id, {
                                    ...el,
                                    action: {
                                      ...el.action!,
                                      targetSceneId: e.target.value
                                    }
                                  })}
                                  style={{ width: '100%', background: '#161624', border: '1px solid #333', color: '#38bdf8', padding: '4px', borderRadius: 6, fontSize: 11 }}
                                >
                                  {scenesList.map((sc: any) => (
                                    <option key={sc.id} value={sc.id}>{sc.title}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {el.action?.type === 'jump_to_menu' && (
                              <div>
                                <label style={{ fontSize: 9, color: '#aaa' }}>Menú Destino:</label>
                                <select
                                  value={el.action.targetMenuId || screensList[0]?.id || ''}
                                  onChange={(e) => addOrUpdateMenuElement(currentScreen.id, {
                                    ...el,
                                    action: {
                                      ...el.action!,
                                      targetMenuId: e.target.value
                                    }
                                  })}
                                  style={{ width: '100%', background: '#161624', border: '1px solid #333', color: '#a855f7', padding: '4px', borderRadius: 6, fontSize: 11 }}
                                >
                                  {screensList.filter(s => s.id !== currentScreen.id).map(s => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div style={{ fontSize: 11, color: '#888', textAlign: 'center', padding: '30px 0' }}>
                      Haz clic en un elemento del lienzo o añade uno nuevo para configurar su posición, estilo y acción.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 13 }}>
              Crea o selecciona una pantalla en el panel izquierdo para comenzar a diseñarla.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
