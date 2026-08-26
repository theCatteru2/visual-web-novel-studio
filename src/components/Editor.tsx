import React, { useState } from 'react';
import { NovelProject, Scene, DialogueEvent } from '../types';

interface EditorProps {
  project: NovelProject;
  setProject: React.Dispatch<React.SetStateAction<NovelProject>>;
}

export default function Editor({ project, setProject }: EditorProps) {
  const [selectedChapterIdx] = useState(0);
  const [selectedSceneIdx] = useState(0);

  const currentScene: Scene = project.chapters[selectedChapterIdx]?.scenes[selectedSceneIdx] || project.chapters[0].scenes[0];

  const [newText, setNewText] = useState('');
  const [selectedCharId, setSelectedCharId] = useState(Object.keys(project.characters)[0] || '');
  const [selectedExpr, setSelectedExpr] = useState('normal');

  const handleAddDialogue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const newEvent: DialogueEvent = {
      type: 'dialogue',
      id: `dlg_${Date.now()}`,
      speakerId: selectedCharId,
      text: newText,
      charactersOnStage: [
        {
          characterId: selectedCharId,
          expression: selectedExpr,
          slot: 'center',
          verticalSlot: 'floor',
          scale: 'medium',
          brightness: 100,
          animation: 'none'
        }
      ]
    };

    const updatedChapters = [...project.chapters];
    updatedChapters[selectedChapterIdx].scenes[selectedSceneIdx].timeline.push(newEvent);

    setProject(prev => ({
      ...prev,
      chapters: updatedChapters
    }));

    setNewText('');
  };

  const handleDeleteEvent = (index: number) => {
    const updatedChapters = [...project.chapters];
    updatedChapters[selectedChapterIdx].scenes[selectedSceneIdx].timeline.splice(index, 1);
    setProject(prev => ({ ...prev, chapters: updatedChapters }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e24', color: '#fff', padding: 16, boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #333' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Escena: {currentScene.title}</h2>
        <span style={{ fontSize: 12, color: '#aaa' }}>{currentScene.timeline.length} acontecimientos en cola</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {currentScene.timeline.map((event, idx) => {
          if (event.type === 'dialogue') {
            const char = project.characters[event.speakerId];
            return (
              <div 
                key={event.id || idx} 
                style={{ 
                  background: '#2b2b36', 
                  borderLeft: `4px solid ${char?.color || '#888'}`, 
                  padding: 12, 
                  borderRadius: 6,
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 14, color: char?.color }}>
                    {char?.name || 'Narrador'}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4, color: '#ddd' }}>
                    {event.text}
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteEvent(idx)}
                  style={{ background: '#ff4d4d', border: 'none', color: '#fff', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            );
          }
          if (event.type === 'choice') {
            return (
              <div key={event.id || idx} style={{ background: '#382b47', borderLeft: '4px solid #a855f7', padding: 12, borderRadius: 6 }}>
                <div style={{ fontWeight: 'bold', fontSize: 14, color: '#c084fc' }}>🔀 Decisión: {event.prompt}</div>
                <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: 13 }}>
                  {event.options.map((opt, oIdx) => (
                    <li key={oIdx}>{opt.text}</li>
                  ))}
                </ul>
              </div>
            );
          }
          return null;
        })}
      </div>

      <form onSubmit={handleAddDialogue} style={{ background: '#252530', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select 
            value={selectedCharId} 
            onChange={e => setSelectedCharId(e.target.value)}
            style={{ flex: 1, padding: 8, background: '#18181f', color: '#fff', border: '1px solid #444', borderRadius: 4 }}
          >
            {Object.values(project.characters).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select 
            value={selectedExpr} 
            onChange={e => setSelectedExpr(e.target.value)}
            style={{ flex: 1, padding: 8, background: '#18181f', color: '#fff', border: '1px solid #444', borderRadius: 4 }}
          >
            <option value="normal">Normal</option>
            <option value="feliz">Feliz</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input 
            type="text" 
            placeholder="Escribe el diálogo aquí..." 
            value={newText}
            onChange={e => setNewText(e.target.value)}
            style={{ flex: 1, padding: 8, background: '#18181f', color: '#fff', border: '1px solid #444', borderRadius: 4 }}
          />
          <button 
            type="submit"
            style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
          >
            + Añadir
          </button>
        </div>
      </form>
    </div>
  );
}