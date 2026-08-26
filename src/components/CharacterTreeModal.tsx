import React, { useState, useRef } from 'react';
import { useNovel } from '../context/NovelContext';
import { Character, CharacterRelation } from '../types';

interface CharacterTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isReadOnly?: boolean;
}

export default function CharacterTreeModal({ isOpen, onClose, isReadOnly = false }: CharacterTreeModalProps) {
  const { project, addOrUpdateCharacter, deleteCharacter } = useNovel();
  const [selectedCharId, setSelectedCharId] = useState<string>(Object.keys(project.characters)[0] || '');
  const [activeTab, setActiveTab] = useState<'profile' | 'expressions' | 'relations'>('profile');

  // Formulario para nueva relación
  const [relTargetId, setRelTargetId] = useState<string>('');
  const [relType, setRelType] = useState<string>('Amigo/a');

  // Input para importar sprites
  const spriteInputRef = useRef<HTMLInputElement>(null);
  const [newExprName, setNewExprName] = useState<string>('');

  if (!isOpen) return null;

  const charactersList = Object.values(project.characters);
  const selectedChar: Character | undefined = project.characters[selectedCharId] || charactersList[0];

  const handleUpdateField = (field: keyof Character, value: any) => {
    if (!selectedChar || isReadOnly) return;
    addOrUpdateCharacter({
      ...selectedChar,
      [field]: value
    });
  };

  // Subir / Importar imagen de expresión
  const handleUploadSprite = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChar || isReadOnly) return;

    const exprTag = (newExprName.trim() || file.name.replace(/\.[^/.]+$/, '')).toLowerCase();

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (typeof uploadEvent.target?.result === 'string') {
        const spriteUrl = uploadEvent.target.result;
        const updatedExpressions = {
          ...(selectedChar.expressions || {}),
          [exprTag]: spriteUrl
        };

        addOrUpdateCharacter({
          ...selectedChar,
          avatarUrl: selectedChar.avatarUrl || spriteUrl,
          expressions: updatedExpressions
        });

        setNewExprName('');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Borrar expresión
  const handleDeleteExpression = (exprKey: string) => {
    if (!selectedChar || isReadOnly) return;
    if (Object.keys(selectedChar.expressions || {}).length <= 1) {
      alert('El personaje debe tener al menos una expresión.');
      return;
    }

    const copy = { ...selectedChar.expressions };
    delete copy[exprKey];

    addOrUpdateCharacter({
      ...selectedChar,
      expressions: copy
    });
  };

  const handleAddRelation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChar || !relTargetId || isReadOnly) return;

    const newRel: CharacterRelation = {
      targetCharacterId: relTargetId,
      relationType: relType.trim() || 'Conocido',
      isPublic: true
    };

    const existingRels = selectedChar.relations || [];
    const updatedRels = [...existingRels.filter(r => r.targetCharacterId !== relTargetId), newRel];

    addOrUpdateCharacter({
      ...selectedChar,
      relations: updatedRels
    });

    setRelTargetId('');
    setRelType('Amigo/a');
  };

  const handleDeleteRelation = (targetId: string) => {
    if (!selectedChar || isReadOnly) return;
    const updatedRels = (selectedChar.relations || []).filter(r => r.targetCharacterId !== targetId);
    addOrUpdateCharacter({
      ...selectedChar,
      relations: updatedRels
    });
  };

  const handleCreateNewCharacter = () => {
    if (isReadOnly) return;
    const newId = `char_${Date.now()}`;
    const newChar: Character = {
      id: newId,
      name: 'Nuevo Personaje',
      color: '#38bdf8',
      bio: 'Descripción del personaje...',
      avatarUrl: './sprites/mio_normal.png',
      isPublic: true,
      hasAffinity: true,
      affinity: 0,
      minAffinity: -20,
      maxAffinity: 100,
      showAffinityBar: true,
      customStats: {},
      relations: [],
      expressions: {
        normal: './sprites/mio_normal.png'
      }
    };
    addOrUpdateCharacter(newChar);
    setSelectedCharId(newId);
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 150,
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
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
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
          background: '#0a0a10'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>👥</span>
            <strong style={{ fontSize: 14 }}>
              {isReadOnly ? 'Fichas y Vínculos de Personajes' : 'Taller y Árbol de Personajes'}
            </strong>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#999', fontSize: 18, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0, flexDirection: window.innerWidth < 640 ? 'column' : 'row' }}>
          
          {/* Columna Izquierda: Lista de Personajes */}
          <div style={{
            width: window.innerWidth < 640 ? '100%' : 220,
            borderRight: '1px solid #222233',
            background: '#0e0e16',
            display: 'flex',
            flexDirection: 'column',
            padding: 8,
            gap: 6
          }}>
            {!isReadOnly && (
              <button
                onClick={handleCreateNewCharacter}
                style={{
                  padding: '8px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginBottom: 4
                }}
              >
                + Crear Personaje
              </button>
            )}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {charactersList.map(char => {
                const isSelected = char.id === selectedChar?.id;
                return (
                  <div
                    key={char.id}
                    onClick={() => setSelectedCharId(char.id)}
                    style={{
                      padding: '6px 10px',
                      background: isSelected ? 'rgba(56,189,248,0.15)' : '#161622',
                      border: `1.5px solid ${isSelected ? char.color : 'transparent'}`,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: char.color }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#fff' : '#aaa' }}>
                        {char.name}
                      </span>
                    </div>

                    {!isReadOnly && charactersList.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCharacter(char.id);
                          if (selectedCharId === char.id) {
                            setSelectedCharId(charactersList.find(c => c.id !== char.id)?.id || '');
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Detalles del Personaje Seleccionado */}
          {selectedChar ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#12121c', minHeight: 0 }}>
              
              {/* Barra de Pestañas */}
              <div style={{ display: 'flex', borderBottom: '1px solid #222233', background: '#0a0a10' }}>
                <button
                  onClick={() => setActiveTab('profile')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: activeTab === 'profile' ? '#181826' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'profile' ? `2px solid ${selectedChar.color}` : 'none',
                    color: activeTab === 'profile' ? '#fff' : '#777',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Perfil e Identidad
                </button>
                <button
                  onClick={() => setActiveTab('expressions')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: activeTab === 'expressions' ? '#181826' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'expressions' ? `2px solid ${selectedChar.color}` : 'none',
                    color: activeTab === 'expressions' ? '#fff' : '#777',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Expresiones ({Object.keys(selectedChar.expressions || {}).length})
                </button>
                <button
                  onClick={() => setActiveTab('relations')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: activeTab === 'relations' ? '#181826' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'relations' ? `2px solid ${selectedChar.color}` : 'none',
                    color: activeTab === 'relations' ? '#fff' : '#777',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Vínculos ({selectedChar.relations?.length || 0})
                </button>
              </div>

              {/* Contenido de la Pestaña */}
              <div style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
                
                {/* 1. PERFIL */}
                {activeTab === 'profile' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: 10, color: '#aaa', fontWeight: 700, display: 'block', marginBottom: 2 }}>Nombre:</label>
                        <input 
                          type="text"
                          disabled={isReadOnly}
                          value={selectedChar.name}
                          onChange={(e) => handleUpdateField('name', e.target.value)}
                          style={{ width: '100%', background: '#0a0a10', border: '1px solid #333', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: '#aaa', fontWeight: 700, display: 'block', marginBottom: 2 }}>Color Temático:</label>
                        <input 
                          type="color"
                          disabled={isReadOnly}
                          value={selectedChar.color}
                          onChange={(e) => handleUpdateField('color', e.target.value)}
                          style={{ width: '100%', height: 32, background: '#0a0a10', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 10, color: '#aaa', fontWeight: 700, display: 'block', marginBottom: 2 }}>Biografía / Trasfondo:</label>
                      <textarea 
                        rows={3}
                        disabled={isReadOnly}
                        value={selectedChar.bio}
                        onChange={(e) => handleUpdateField('bio', e.target.value)}
                        style={{ width: '100%', background: '#0a0a10', border: '1px solid #333', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, resize: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ background: '#161622', padding: 10, borderRadius: 8, border: '1px solid #28283a', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <strong style={{ fontSize: 11, color: '#ec4899' }}>❤️ Ajustes de Afinidad</strong>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <input 
                            type="checkbox"
                            disabled={isReadOnly}
                            checked={selectedChar.showAffinityBar}
                            onChange={(e) => handleUpdateField('showAffinityBar', e.target.checked)}
                          />
                          Mostrar medidor en juego
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. EXPRESIONES CON IMPORTACIÓN Y GESTIÓN */}
                {activeTab === 'expressions' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    
                    {!isReadOnly && (
                      <div style={{ background: '#161622', padding: 10, borderRadius: 8, border: '1px solid #2d2d3f', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          placeholder="Nombre (ej. enojada, feliz, pensando)..."
                          value={newExprName}
                          onChange={(e) => setNewExprName(e.target.value)}
                          style={{ flex: 1, minWidth: 160, background: '#0a0a10', color: '#fff', border: '1px solid #333', padding: '6px 10px', borderRadius: 6, fontSize: 11 }}
                        />

                        <button
                          onClick={() => spriteInputRef.current?.click()}
                          style={{ padding: '6px 14px', background: '#38bdf8', color: '#000', border: 'none', borderRadius: 6, fontWeight: 800, fontSize: 11, cursor: 'pointer' }}
                        >
                          + Subir Sprite
                        </button>
                        
                        <input
                          type="file"
                          ref={spriteInputRef}
                          onChange={handleUploadSprite}
                          accept="image/*"
                          style={{ display: 'none' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                      {Object.entries(selectedChar.expressions || {}).map(([key, url]) => (
                        <div 
                          key={key} 
                          style={{ 
                            background: '#0a0a10', 
                            border: '1px solid #2d2d3f', 
                            borderRadius: 8, 
                            padding: 8, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: 6,
                            position: 'relative'
                          }}
                        >
                          <img src={url} alt={key} style={{ width: '100%', height: 90, objectFit: 'contain' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'capitalize' }}>
                            {key}
                          </span>

                          {!isReadOnly && Object.keys(selectedChar.expressions || {}).length > 1 && (
                            <button
                              onClick={() => handleDeleteExpression(key)}
                              title="Eliminar expresión"
                              style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                background: 'rgba(239, 68, 68, 0.8)',
                                border: 'none',
                                borderRadius: '50%',
                                color: '#fff',
                                width: 20,
                                height: 20,
                                fontSize: 10,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. VÍNCULOS Y RELACIONES */}
                {activeTab === 'relations' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    
                    {!isReadOnly && (
                      <form onSubmit={handleAddRelation} style={{ background: '#161622', padding: 10, borderRadius: 8, border: '1px solid #2d2d3f', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <strong style={{ fontSize: 11, color: '#38bdf8' }}>+ Crear Nuevo Vínculo</strong>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <select
                            value={relTargetId}
                            onChange={(e) => setRelTargetId(e.target.value)}
                            style={{ flex: 1, background: '#0a0a10', color: '#fff', border: '1px solid #333', padding: 6, borderRadius: 6, fontSize: 11 }}
                            required
                          >
                            <option value="">Seleccionar Personaje...</option>
                            {charactersList.filter(c => c.id !== selectedChar.id).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>

                          <input 
                            type="text"
                            placeholder="Tipo (Amigo, Rival, Hermana...)"
                            value={relType}
                            onChange={(e) => setRelType(e.target.value)}
                            style={{ flex: 1, background: '#0a0a10', color: '#fff', border: '1px solid #333', padding: 6, borderRadius: 6, fontSize: 11 }}
                            required
                          />

                          <button
                            type="submit"
                            style={{ padding: '6px 12px', background: '#38bdf8', color: '#000', border: 'none', borderRadius: 6, fontWeight: 800, fontSize: 11, cursor: 'pointer' }}
                          >
                            Vincular
                          </button>
                        </div>
                      </form>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(selectedChar.relations || []).length === 0 ? (
                        <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: 16 }}>
                          No hay vínculos registrados para {selectedChar.name}.
                        </div>
                      ) : (
                        selectedChar.relations.map(rel => {
                          const target = project.characters[rel.targetCharacterId];
                          if (!target) return null;
                          return (
                            <div
                              key={rel.targetCharacterId}
                              style={{
                                background: '#0e0e16',
                                border: '1px solid #242436',
                                borderRadius: 8,
                                padding: '8px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>🔗</span>
                                <div>
                                  <strong style={{ fontSize: 12, color: target.color }}>{target.name}</strong>
                                  <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>({rel.relationType})</span>
                                </div>
                              </div>

                              {!isReadOnly && (
                                <button
                                  onClick={() => handleDeleteRelation(rel.targetCharacterId)}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                )}

              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 13 }}>
              Selecciona o crea un personaje para ver su ficha.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
