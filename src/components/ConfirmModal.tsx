import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title = '¿Estás seguro?',
  message,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#13131f',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 14,
          padding: 20,
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
          textAlign: 'center',
          color: '#fff'
        }}
      >
        <span style={{ fontSize: 28 }}>⚠️</span>
        <strong style={{ fontSize: 16, color: '#f87171' }}>{title}</strong>
        <p style={{ color: '#cbd5e1', fontSize: 13, margin: 0, lineHeight: 1.4 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#1e1e2d',
              border: '1px solid #333',
              borderRadius: 8,
              color: '#ddd',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#ef4444',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(239, 68, 68, 0.4)'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
