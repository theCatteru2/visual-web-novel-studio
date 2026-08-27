import { useState } from 'react';
import { useNovel } from '../context/NovelContext';

interface SaveLoadModalProps {
  isOpen: boolean;
  mode: 'save' | 'load';
  onClose: () => void;
  onLoaded?: () => void;
}

export default function SaveLoadModal({ isOpen, mode, onClose, onLoaded }: SaveLoadModalProps) {
  const { project, library, saveGameToSlot, loadGameFromSlot, deleteSaveSlot } = useNovel();
  const [activeTab, setActiveTab] = useState<'save' | 'load'>(mode);

  if (!isOpen) return null;

  const novelId = project.id || 'current_project';
  const currentSlots = library[novelId]?.saveSlots || {};
  const totalSlots = 6;

  const handleSlotClick = (slotNumber: number) => {
    const slotId = `slot_${slotNumber}`;
    if (activeTab === 'save') {
      saveGameToSlot(slotNumber);
    } else {
      const ok = loadGameFromSlot(novelId, slotId);
      if (ok) {
        onClose();
        if (onLoaded) onLoaded();
      }
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#13131f',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 600,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
          overflow: 'hidden',
          color: '#fff'
        }}
      >
        {/* Cabecera y Selector */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #222233',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0a0a12'
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setActiveTab('save')}
              style={{
                padding: '6px 14px',
                background: activeTab === 'save' ? '#10b981' : 'transparent',
                color: activeTab === 'save' ? '#042f1f' : '#aaa',
                border: 'none',
                borderRadius: 6,
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              💾 Guardar Partida
            </button>

            <button
              onClick={() => setActiveTab('load')}
              style={{
                padding: '6px 14px',
                background: activeTab === 'load' ? '#38bdf8' : 'transparent',
                color: activeTab === 'load' ? '#082f49' : '#aaa',
                border: 'none',
                borderRadius: 6,
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              📂 Cargar Partida
            </button>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#999', fontSize: 18, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Cuadrícula de Ranuras */}
        <div style={{ padding: 14, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {Array.from({ length: totalSlots }).map((_, i) => {
            const slotNumber = i + 1;
            const slotId = `slot_${slotNumber}`;
            const slotData = currentSlots[slotId];

            return (
              <div
                key={slotNumber}
                onClick={() => {
                  if (activeTab === 'save' || slotData) {
                    handleSlotClick(slotNumber);
                  }
                }}
                style={{
                  background: slotData ? '#181826' : '#0c0c14',
                  border: `1.5px dashed ${slotData ? '#38bdf8' : '#28283a'}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  cursor: (activeTab === 'save' || slotData) ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 115,
                  position: 'relative'
                }}
              >
                {slotData ? (
                  <>
                    <div style={{ position: 'relative', width: '100%', height: 65, backgroundImage: `url(${slotData.previewBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      <span style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.7)', padding: '2px 5px', borderRadius: 4, fontSize: 9, fontWeight: 800, color: '#38bdf8' }}>
                        Ranura #{slotNumber}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSaveSlot(novelId, slotId);
                        }}
                        style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', border: 'none', borderRadius: 4, color: '#fff', fontSize: 9, padding: '2px 5px', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 9, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {slotData.chapterTitle} • {slotData.sceneTitle}
                      </span>
                      <span style={{ fontSize: 8, color: '#64748b' }}>
                        {new Date(slotData.timestamp).toLocaleDateString()} {new Date(slotData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 10 }}>
                    <span style={{ fontSize: 18, color: '#444' }}>{activeTab === 'save' ? '💾' : '📁'}</span>
                    <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>
                      Ranura #{slotNumber}
                    </span>
                    <span style={{ fontSize: 9, color: '#444' }}>
                      {activeTab === 'save' ? 'Guardar aquí' : 'Vacía'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}