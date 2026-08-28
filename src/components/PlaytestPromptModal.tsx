interface PlaytestPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartFromCurrent: () => void;
  onStartFromBeginning: () => void;
}

export default function PlaytestPromptModal({
  isOpen,
  onClose,
  onStartFromCurrent,
  onStartFromBeginning
}: PlaytestPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 10, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 350,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#12121c',
          border: '1px solid #2d2d42',
          borderRadius: 16,
          width: '100%',
          maxWidth: 380,
          padding: 20,
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>▶</span> Probar Novela
          </strong>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
          ¿Desde dónde deseas iniciar la prueba rápida en el editor?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => {
              onStartFromCurrent();
              onClose();
            }}
            style={{
              padding: '10px 14px',
              background: '#2563eb',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>📍 Escena actual abierta</span>
            <span>→</span>
          </button>

          <button
            onClick={() => {
              onStartFromBeginning();
              onClose();
            }}
            style={{
              padding: '10px 14px',
              background: '#10b981',
              border: 'none',
              borderRadius: 8,
              color: '#042f1f',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>🏁 Desde el inicio de la novela</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
