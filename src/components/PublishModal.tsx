import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNovel } from '../context/NovelContext';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PublishModal({ isOpen, onClose }: PublishModalProps) {
  const { user, profile, loginWithGoogle } = useAuth();
  const { project, setProject } = useNovel();

  const [title, setTitle] = useState(project.title || '');
  const [description, setDescription] = useState(project.description || '');
  const [tagsInput, setTagsInput] = useState('');
  const [isNsfw, setIsNsfw] = useState(false);
  const [allowCommunityEdit, setAllowCommunityEdit] = useState(project.allowCommunityEdit ?? true);
  const [isPublishing, setIsPublishing] = useState(false);

  if (!isOpen) return null;

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Debes iniciar sesión para publicar tu novela.');
    if (!title.trim()) return alert('La novela debe tener un título.');

    const cover = project.backgroundGallery?.[0]?.url || project.chapters[0]?.scenes[0]?.backgroundUrl || '';

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const projectToPublish = {
      ...project,
      title: title.trim(),
      description: description.trim(),
      allowCommunityEdit
    };

    setIsPublishing(true);
    try {
      await addDoc(collection(db, 'community_novels'), {
        title: title.trim(),
        description: description.trim(),
        coverUrl: cover,
        tags: parsedTags,
        isNsfw,
        authorName: profile?.displayName || user.displayName || 'Creador',
        authorId: user.uid,
        createdAt: Date.now(),
        allowCommunityEdit,
        projectData: projectToPublish
      });

      setProject(projectToPublish);
      alert('¡Novela publicada en la comunidad con éxito!');
      onClose();
    } catch (err: any) {
      console.error('Error al publicar novela:', err);
      alert(`Error al publicar: ${err.message || 'Verifica el tamaño de tu proyecto.'}`);
    } finally {
      setIsPublishing(false);
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
        zIndex: 250,
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
          border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
          overflow: 'hidden',
          color: '#fff'
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #222233', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090910' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🚀</span>
            <strong style={{ fontSize: 14 }}>Publicar Novela en la Comunidad</strong>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handlePublish} style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 3 }}>Título de la historia:</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Mi Novela Visual..."
              style={{ width: '100%', padding: 8, background: '#0a0a10', border: '1px solid #333', color: '#fff', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 3 }}>Sinopsis / Resumen:</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="¿De qué trata tu aventura?..."
              rows={3}
              style={{ width: '100%', padding: 8, background: '#0a0a10', border: '1px solid #333', color: '#fff', borderRadius: 6, fontSize: 11, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 3 }}>Etiquetas (separadas por coma):</label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="Romance, Misterio, Fantasía, Anime..."
              style={{ width: '100%', padding: 8, background: '#0a0a10', border: '1px solid #333', color: '#fff', borderRadius: 6, fontSize: 11, boxSizing: 'border-box' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fda4af', cursor: 'pointer', background: 'rgba(244,63,94,0.1)', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(244,63,94,0.3)' }}>
            <input
              type="checkbox"
              checked={isNsfw}
              onChange={e => setIsNsfw(e.target.checked)}
              style={{ accentColor: '#f43f5e' }}
            />
            Marcar como Novela para Adultos (+18 / NSFW)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allowCommunityEdit}
              onChange={e => setAllowCommunityEdit(e.target.checked)}
              style={{ accentColor: '#38bdf8' }}
            />
            Permitir que otros usuarios descarguen y editen mi proyecto
          </label>

          {!user ? (
            <button
              type="button"
              onClick={loginWithGoogle}
              style={{ padding: 10, background: '#ea4335', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', marginTop: 6 }}
            >
              Inicia sesión con Google para Publicar
            </button>
          ) : (
            <button
              type="submit"
              disabled={isPublishing}
              style={{ padding: 10, background: '#10b981', color: '#042f1f', border: 'none', borderRadius: 6, fontWeight: 800, fontSize: 13, cursor: 'pointer', marginTop: 6 }}
            >
              {isPublishing ? 'Publicando...' : 'Publicar Novela'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
