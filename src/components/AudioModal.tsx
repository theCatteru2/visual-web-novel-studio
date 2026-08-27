import React, { useRef } from 'react';
import { useNovel } from '../context/NovelContext';
import { ProjectAudioItem } from '../types';

interface AudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBgmUrl?: string;
  currentSfxUrl?: string;
  onSelectBgm: (url: string | undefined) => void;
  onSelectSfx: (url: string | undefined) => void;
  onOpenStore?: () => void;
}

export default function AudioModal({
  isOpen,
  onClose,
  currentBgmUrl,
  currentSfxUrl,
  onSelectBgm,
  onSelectSfx,
  onOpenStore
}: AudioModalProps) {
  const { project, setProject } = useNovel();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const audioList: ProjectAudioItem[] = project.audioGallery || [];
  const bgmList = audioList.filter(a => a.type === 'bgm');
  const sfxList = audioList.filter(a => a.type === 'sfx');

  const handleImportAudio = (e: React.ChangeEvent<HTMLInputElement>, type: 'bgm' | 'sfx') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (typeof uploadEvent.target?.result === 'string') {
        const audioItem: ProjectAudioItem = {
          id: `audio_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: uploadEvent.target.result,
          type
        };

        setProject(prev => ({
          ...prev,
          audioGallery: [...(prev.audioGallery || []), audioItem]
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#12121c',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 14,
          width: '100%',
          maxWidth: 520,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
          overflow: 'hidden',
          color: '#fff'
        }}
      >
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #222233',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0a0a10'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🎵</span>
            <strong style={{ fontSize: 13 }}>Configuración de Audio (Viñeta)</strong>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {onOpenStore && (
              <button
                onClick={() => { onClose(); onOpenStore(); }}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                🛒 Bazar Comunitario
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* SECCIÓN MÚSICA DE FONDO (BGM) */}
          <div style={{ background: '#171724', padding: 10, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid #262638' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8' }}>🎼 Música de Fondo (BGM)</span>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'audio/*';
                  input.onchange = (evt: any) => handleImportAudio(evt, 'bgm');
                  input.click();
                }}
                style={{ background: 'rgba(56,189,248,0.15)', border: '1px dashed #38bdf8', color: '#38bdf8', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                + Importar BGM
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => onSelectBgm(undefined)}
                style={{
                  padding: '4px 8px',
                  background: !currentBgmUrl ? '#38bdf8' : '#222232',
                  color: !currentBgmUrl ? '#000' : '#aaa',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                (Mantener previa)
              </button>

              <button
                onClick={() => onSelectBgm('stop')}
                style={{
                  padding: '4px 8px',
                  background: currentBgmUrl === 'stop' ? '#ef4444' : '#222232',
                  color: currentBgmUrl === 'stop' ? '#fff' : '#ef4444',
                  border: '1px solid #ef444444',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🔇 Silenciar / Detener
              </button>

              {bgmList.map(item => (
                <button
                  key={item.id}
                  onClick={() => onSelectBgm(item.url)}
                  style={{
                    padding: '4px 8px',
                    background: currentBgmUrl === item.url ? '#2563eb' : '#222232',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    fontSize: 10,
                    cursor: 'pointer'
                  }}
                >
                  ▶ {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* SECCIÓN EFECTO DE SONIDO (SFX) */}
          <div style={{ background: '#171724', padding: 10, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid #262638' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#c084fc' }}>🔔 Efecto de Sonido (SFX al entrar)</span>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'audio/*';
                  input.onchange = (evt: any) => handleImportAudio(evt, 'sfx');
                  input.click();
                }}
                style={{ background: 'rgba(192,132,252,0.15)', border: '1px dashed #c084fc', color: '#c084fc', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                + Importar SFX
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => onSelectSfx(undefined)}
                style={{
                  padding: '4px 8px',
                  background: !currentSfxUrl ? '#c084fc' : '#222232',
                  color: !currentSfxUrl ? '#000' : '#aaa',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                (Sin efecto)
              </button>

              {sfxList.map(item => (
                <button
                  key={item.id}
                  onClick={() => onSelectSfx(item.url)}
                  style={{
                    padding: '4px 8px',
                    background: currentSfxUrl === item.url ? '#7c3aed' : '#222232',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    fontSize: 10,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}