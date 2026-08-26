import React, { useState, useRef } from 'react';
import { useNovel } from '../context/NovelContext';
import { Character, CharacterRelation } from '../types';
import ImageCropModal from './ImageCropModal';

interface CharacterTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isReadOnly?: boolean;
}

export default function CharacterTreeModal({ isOpen, onClose, isReadOnly = false }: CharacterTreeModalProps) {
  const { project, addOrUpdateCharacter, deleteCharacter } = useNovel();
  const charactersList = Object.values(project.characters);

  const [selectedCharId, setSelectedCharId] = useState<string>(charactersList[0]?.id || '');
  const activeCharacter: Character | undefined = project.characters[selectedCharId] || charactersList[0];

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Character | null>(null);

  const [newExprName, setNewExprName] = useState('');
  const [relTargetId, setRelTargetId] = useState('');
  const [relType, setRelType] = useState('');

  // Estado para el modal de recorte
  const [cropTarget, setCropTarget] = useState<{ key: string; url: string; isAvatar?: boolean } | null>(null);

  const spriteInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const readFileAsDataUrl = (file: File, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') callback(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleStartCreate = () => {
    const newId = `char_${Date.now()}`;
    const newChar: Character = {
      id: newId,
      name: 'Nuevo Personaje',
      color: '#38bdf8',
      bio: '',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${newId}`,
      isPublic: true,
      expressions: {
        normal: `https://api.dicebear.com/7.x/bottts/svg?seed=${newId}`
      },
      hasAffinity: true,
      affinity: 0,
      minAffinity: -50,
      maxAffinity: 100,
      showAffinityBar: true,
      customStats: {},
      relations: []
    };
    setEditForm(newChar);
    setIsEditing(true);
  };

  const handleStartEdit = (char: Character) => {
    setEditForm(JSON.parse(JSON.stringify(char)));
    setIsEditing(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm) {
      if (Object.keys(editForm.expressions).length === 0) {
        editForm.expressions.normal = editForm.avatarUrl;
      }
      addOrUpdateCharacter(editForm);
      setSelectedCharId(editForm.id);
      setIsEditing(false);
      setEditForm(null);
    }
  };

  const handleUploadSpriteFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editForm) return;

    const label = newExprName.trim().toLowerCase() || `expresion_${Object.keys(editForm.expressions).length + 1}`;
    readFileAsDataUrl(file, (dataUrl) => {
      setEditForm(prev => prev ? {
        ...prev,
        expressions: { ...prev.expressions, [label]: dataUrl }
      } : prev);
      setNewExprName('');
      // Abrir inmediatamente el editor de recorte al subir
      setCropTarget({ key: label, url: dataUrl });
    });
    e.target.value = '';
  };

  const handleUploadAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editForm) return;
    readFileAsDataUrl(file, (dataUrl) => {
      setEditForm(prev => prev ? { ...prev, avatarUrl: dataUrl } : prev);
      setCropTarget({ key: 'avatar', url: dataUrl, isAvatar: true });
    });
    e.target.value = '';
  };

  const handleSaveCroppedImage = (croppedUrl: string) => {
    if (!cropTarget || !editForm) return;
    if (cropTarget.isAvatar) {
      setEditForm(prev => prev ? { ...prev, avatarUrl: croppedUrl } : prev);
    } else {
      setEditForm(prev => prev ? {
        ...prev,
        expressions: { ...prev.expressions, [cropTarget.key]: croppedUrl }
      } : prev);
    }
    setCropTarget(null);
  };

  const handleRemoveExpression = (exprKey: string) => {
    if (!editForm) return;
    const copy = { ...editForm.expressions };
    delete copy[exprKey];
    setEditForm({ ...editForm, expressions: copy });
  };

  const handleAddRelation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCharacter || !relTargetId || !relType.trim()) return;

    const newRel: CharacterRelation = {
      targetCharacterId: relTargetId,
      relationType: relType.trim(),
      isPublic: true
    };

    addOrUpdateCharacter({
      ...activeCharacter,
      relations: [...(activeCharacter.relations || []), newRel]
    });
    setRelType('');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 5, 10, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #13131c, #0c0c12)',
        color: '#f8fafc',
        width: '100%',
        maxWidth: 920,
        height: '86vh',
        borderRadius: 20,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.75)',
        overflow: 'hidden'
      }}>
        {/* Barra Superior */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>👥</span>
            <span style={{ fontWeight: 700, fontSize: 17 }}>Taller de Personajes y Lore</span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: '#94a3b8',
              borderRadius: '50%',
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Lista Lateral */}
          <div style={{ width: 230, borderRight: '1px solid rgba(255,255,255,0.06)', padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!isReadOnly && (
              <button 
                onClick={handleStartCreate}
                style={{
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                }}
              >
                + Nuevo Personaje
              </button>
            )}

            {charactersList.map(char => (
              <div
                key={char.id}
                onClick={() => {
                  setSelectedCharId(char.id);
                  setIsEditing(false);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: activeCharacter?.id === char.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${activeCharacter?.id === char.id ? char.color : 'transparent'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <img src={char.avatarUrl} alt={char.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#1e293b' }} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{char.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{Object.keys(char.expressions || {}).length} caras</div>
                </div>
              </div>
            ))}
          </div>

          {/* Panel Principal */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            {isEditing && editForm ? (
              <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ flex: 3 }}>
                    <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginBottom: 4, display: 'block' }}>Nombre</label>
                    <input 
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginBottom: 4, display: 'block' }}>Color</label>
                    <input 
                      type="color"
                      value={editForm.color}
                      onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                      style={{ width: '100%', height: 42, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* Avatar */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <img src={editForm.avatarUrl} alt="Avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', background: '#0f172a' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="file" ref={avatarInputRef} accept="image/*" onChange={handleUploadAvatarFile} style={{ display: 'none' }} />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
                    >
                      📁 Cambiar Avatar
                    </button>
                    {editForm.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setCropTarget({ key: 'avatar', url: editForm.avatarUrl, isAvatar: true })}
                        style={{ padding: '8px 12px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✂️ Recortar
                      </button>
                    )}
                  </div>
                </div>

                {/* Galería de Sprites */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8', display: 'block', marginBottom: 12 }}>
                    🎭 Galería de Sprites (Usa el botón ✂️ para recortar y ajustar el centro)
                  </label>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                    {Object.entries(editForm.expressions || {}).map(([key, url]) => (
                      <div key={key} style={{ position: 'relative', width: 90, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 6, textAlign: 'center' }}>
                        <img src={url} alt={key} style={{ width: '100%', height: 75, objectFit: 'contain' }} />
                        <span style={{ fontSize: 11, color: '#cbd5e1', display: 'block', textTransform: 'capitalize', marginTop: 4 }}>{key}</span>
                        
                        {/* Botón de Recorte / Ajustar Centro */}
                        <button
                          type="button"
                          onClick={() => setCropTarget({ key, url })}
                          title="Ajustar centro y recorte"
                          style={{ position: 'absolute', top: -6, left: -6, background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                        >
                          ✂️
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveExpression(key)}
                          style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input 
                      type="text"
                      placeholder="Nombre (ej. sorprendido)"
                      value={newExprName}
                      onChange={e => setNewExprName(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    />
                    <input type="file" ref={spriteInputRef} accept="image/*" onChange={handleUploadSpriteFile} style={{ display: 'none' }} />
                    <button
                      type="button"
                      onClick={() => spriteInputRef.current?.click()}
                      style={{ padding: '8px 16px', background: '#38bdf8', color: '#0f172a', fontWeight: 600, border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                    >
                      + Subir Sprite
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button 
                    type="button" 
                    onClick={() => { setIsEditing(false); setEditForm(null); }}
                    style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Guardar
                  </button>
                </div>
              </form>
            ) : activeCharacter ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <img 
                      src={activeCharacter.avatarUrl} 
                      alt={activeCharacter.name} 
                      style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${activeCharacter.color}` }}
                    />
                    <div>
                      <h3 style={{ margin: 0, color: activeCharacter.color, fontSize: 22, fontWeight: 700 }}>{activeCharacter.name}</h3>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>{activeCharacter.bio || 'Sin biografía.'}</p>
                    </div>
                  </div>

                  {!isReadOnly && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => handleStartEdit(activeCharacter)}
                        style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${activeCharacter.name}?`)) deleteCharacter(activeCharacter.id);
                        }}
                        style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 18, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>
                    Sprites Disponibles ({Object.keys(activeCharacter.expressions || {}).length}):
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {Object.entries(activeCharacter.expressions || {}).map(([key, url]) => (
                      <div key={key} style={{ background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 12, textAlign: 'center', width: 90, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <img src={url} alt={key} style={{ width: '100%', height: 80, objectFit: 'contain' }} />
                        <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, display: 'block', marginTop: 4, textTransform: 'capitalize' }}>
                          {key}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 18, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>🔗 Relaciones:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(!activeCharacter.relations || activeCharacter.relations.length === 0) ? (
                      <span style={{ fontSize: 12, color: '#64748b' }}>Sin relaciones añadidas.</span>
                    ) : (
                      activeCharacter.relations.map((rel, idx) => {
                        const target = project.characters[rel.targetCharacterId];
                        if (!target) return null;
                        return (
                          <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 14px', borderRadius: 8, fontSize: 13 }}>
                            Es <strong>{rel.relationType}</strong> de <span style={{ color: target.color }}>{target.name}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {!isReadOnly && charactersList.length > 1 && (
                    <form onSubmit={handleAddRelation} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <input 
                        type="text"
                        placeholder="Vínculo (ej. Rival)"
                        value={relType}
                        onChange={e => setRelType(e.target.value)}
                        style={{ flex: 2, padding: '8px 12px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                        required
                      />
                      <select 
                        value={relTargetId}
                        onChange={e => setRelTargetId(e.target.value)}
                        style={{ flex: 2, padding: '8px 12px', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                        required
                      >
                        <option value="">Elegir personaje...</option>
                        {charactersList.filter(c => c.id !== activeCharacter.id).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button type="submit" style={{ padding: '8px 16px', background: '#38bdf8', color: '#0f172a', fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
                        +
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* MODAL DE RECORTE Y CENTRADO DE SPRITE */}
      {cropTarget && (
        <ImageCropModal 
          isOpen={!!cropTarget}
          imageUrl={cropTarget.url}
          onClose={() => setCropTarget(null)}
          onSave={handleSaveCroppedImage}
        />
      )}
    </div>
  );
}