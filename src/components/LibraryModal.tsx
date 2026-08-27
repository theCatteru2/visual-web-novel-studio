import { useState } from 'react';
import { useNovel } from '../context/NovelContext';
import { LibraryNovelEntry } from '../types';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEditor: () => void;
  onStartPlay: () => void;
}

export default function LibraryModal({
  isOpen,
  onClose,
  onOpenEditor,
  onStartPlay
}: LibraryModalProps) {
  const { library, loadProjectFromLibrary, deleteNovelFromLibrary, loadGameFromSlot } = useNovel();
  const [activeTab, setActiveTab] = useState<'my_novels' | 'community_novels'>('my_novels');
  const [selectedNovelId, setSelectedNovelId] = useState<string | null>(null);

  if (!isOpen) return null;

  const entries = Object.values(library);
  const myNovels = entries.filter(e => e.isOwner);
  const communityNovels = entries.filter(e => !e.isOwner);

  const displayedNovels = activeTab === 'my_novels' ? myNovels : communityNovels;
  const selectedNovel: LibraryNovelEntry | undefined = selectedNovelId ? library[selectedNovelId] : undefined;

  const handlePlayFresh = (novelId: string) => {
    loadProjectFromLibrary(novelId);
    onStartPlay();
    onClose();
  };

  const handleEdit = (novelId: string) => {
    loadProjectFromLibrary(novelId);
    onOpenEditor();
    onClose();
  };

  const handleLoadSlot = (novelId: string, slotId: string) => {
    const ok = loadGameFromSlot(novelId, slotId);
    if (ok) {
      onStartPlay();
      onClose();
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
          background: '#11111a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 640,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
          overflow: 'hidden',
          color: '#fff'
        }}
      >
        {/* Cabecera */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #222233',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#090910'
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setActiveTab('my_novels'); setSelectedNovelId(null); }}
              style={{
                padding: '6px 14px',
                background: activeTab === 'my_novels' ? '#2563eb' : 'transparent',
                color: activeTab === 'my_novels' ? '#fff' : '#888',
                border: 'none',
                borderRadius: 6,
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              📚 Mis Creaciones ({myNovels.length})
            </button>

            <button
              onClick={() => { setActiveTab('community_novels'); setSelectedNovelId(null); }}
              style={{
                padding: '6px 14px',
                background: activeTab === 'community_novels' ? '#7c3aed' : 'transparent',
                color: activeTab === 'community_novels' ? '#fff' : '#888',
                border: 'none',
                borderRadius: 6,
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              🌐 Guardadas de la Comunidad ({communityNovels.length})
            </button>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#999', fontSize: 18, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Lista de Novelas */}
        <div style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayedNovels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#64748b', fontSize: 12 }}>
              {activeTab === 'my_novels' 
                ? 'No tienes novelas guardadas en tu biblioteca local.' 
                : 'Aún no has guardado novelas de la comunidad para jugar.'}
            </div>
          ) : (
            displayedNovels.map(novel => {
              const isSelected = selectedNovelId === novel.id;
              const slotsCount = Object.keys(novel.saveSlots || {}).length;

              return (
                <div
                  key={novel.id}
                  style={{
                    background: isSelected ? '#1c1c2b' : '#14141e',
                    border: `1px solid ${isSelected ? '#38bdf8' : '#28283a'}`,
                    borderRadius: 10,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{novel.isOwner ? '📖' : '🌐'}</span>
                      <div>
                        <strong style={{ fontSize: 13, color: '#fff' }}>{novel.title}</strong>
                        {!novel.isOwner && novel.authorName && (
                          <span style={{ fontSize: 10, color: '#c084fc', marginLeft: 6 }}>
                            por {novel.authorName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#64748b' }}>
                        💾 {slotsCount} partida(s)
                      </span>
                      <button
                        onClick={() => deleteNovelFromLibrary(novel.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handlePlayFresh(novel.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#10b981',
                        color: '#052e16',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      ▶ Jugar desde el Inicio
                    </button>

                    {(novel.isOwner || novel.allowEdit) && (
                      <button
                        onClick={() => handleEdit(novel.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Editar Guion
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedNovelId(isSelected ? null : novel.id)}
                      style={{
                        padding: '6px 10px',
                        background: '#28283c',
                        color: '#ddd',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: 'pointer'
                      }}
                    >
                      {isSelected ? 'Ocultar Ranuras ▴' : 'Ver Partidas Guardadas ▾'}
                    </button>
                  </div>

                  {/* Ranuras */}
                  {isSelected && (
                    <div style={{ background: '#0a0a10', padding: 8, borderRadius: 8, marginTop: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 }}>
                      {slotsCount === 0 ? (
                        <div style={{ color: '#555', fontSize: 10, padding: 4 }}>No hay partidas guardadas en esta novela.</div>
                      ) : (
                        Object.values(novel.saveSlots).map(slot => (
                          <div
                            key={slot.id}
                            onClick={() => handleLoadSlot(novel.id, slot.id)}
                            style={{
                              background: '#161622',
                              border: '1px solid #38bdf8',
                              borderRadius: 6,
                              padding: 6,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2
                            }}
                          >
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8' }}>Ranura #{slot.slotNumber}</span>
                            <span style={{ fontSize: 8, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slot.sceneTitle}</span>
                            <span style={{ fontSize: 7, color: '#666' }}>{new Date(slot.timestamp).toLocaleDateString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}