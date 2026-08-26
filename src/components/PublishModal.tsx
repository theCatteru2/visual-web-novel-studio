import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNovel } from '../context/NovelContext';

export default function PublishModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, profile } = useAuth();
  const { project } = useNovel();
  const [allowDownload, setAllowDownload] = useState(false);
  const [description, setDescription] = useState(project.description || '');
  const [publishing, setPublishing] = useState(false);

  if (!isOpen) return null;

  const handlePublish = async () => {
    if (!user || !profile) {
      alert('Debes iniciar sesión para publicar tu novela.');
      return;
    }
    setPublishing(true);

    try {
      await addDoc(collection(db, 'novels'), {
        title: project.title || 'Novela sin título',
        description,
        authorId: user.uid,
        authorName: profile.displayName,
        authorAvatar: profile.avatarUrl,
        allowDownload,
        projectData: JSON.stringify(project),
        createdAt: Date.now()
      });

      alert('¡Novela publicada en la comunidad exitosamente!');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al publicar la novela en Firestore.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#12121c', border: '1px solid #2d2d42', borderRadius: 12, padding: 20, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 14, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 16 }}>🚀 Publicar en la Comunidad</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#aaa' }}>Descripción / Sinopsis:</label>
          <textarea 
            rows={3} 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            style={{ width: '100%', background: '#0a0a0f', border: '1px solid #333', borderRadius: 6, color: '#fff', padding: 8, marginTop: 4, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ background: '#1a1a27', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid #29293d' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
            <input 
              type="checkbox" 
              checked={allowDownload} 
              onChange={e => setAllowDownload(e.target.checked)} 
            />
            Permitir Descarga de Archivo (.JSON)
          </label>
          <span style={{ fontSize: 11, color: allowDownload ? '#4ade80' : '#f87171' }}>
            {allowDownload 
              ? '✓ Los lectores podrán descargar y editar este proyecto.' 
              : '🔒 Bloqueado: Los lectores solo podrán jugarlo en línea.'}
          </span>
        </div>

        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{ padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}
        >
          {publishing ? 'Publicando...' : 'Publicar Ahora'}
        </button>
      </div>
    </div>
  );
}
