import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  NovelProject, 
  Character, 
  TimelineEvent, 
  PlayerGameState,
  CustomVariable,
  Branch,
  VariableChange,
  BranchJumpCondition
} from '../types';
import { mockProject } from '../mockData';

interface NovelContextType {
  project: NovelProject;
  setProject: React.Dispatch<React.SetStateAction<NovelProject>>;
  saveProjectToLocal: () => void;
  exportProjectJson: () => void;
  importProjectJson: (jsonString: string) => boolean;
  resetProjectToDefault: () => void;

  currentChapterId: string;
  setCurrentChapterId: (id: string) => void;
  currentSceneId: string;
  setCurrentSceneId: (id: string) => void;
  currentBranchId: string;
  setCurrentBranchId: (id: string) => void;

  addOrUpdateCharacter: (character: Character) => void;
  deleteCharacter: (characterId: string) => void;

  createBranch: (name: string) => string;
  deleteBranch: (branchId: string) => void;

  addTimelineEvent: (event: TimelineEvent) => void;
  updateTimelineEvent: (index: number, event: TimelineEvent) => void;
  deleteTimelineEvent: (index: number) => void;
  reorderTimelineEvents: (sourceIndex: number, destinationIndex: number) => void;
  duplicateTimelineEventBase: (index: number) => void;

  addOrUpdateVariable: (variable: CustomVariable) => void;
  deleteVariable: (varName: string) => void;

  gameState: PlayerGameState;
  startPlaytest: () => void;
  advancePlayerEvent: () => void;
  selectChoiceOption: (optionId: string) => void;
  jumpToScene: (sceneId: string) => void;
  jumpToBranch: (branchId: string) => void;
}

const LOCAL_STORAGE_KEY = 'vwn_studio_project_v104_local_bg_and_sprites';
const NovelContext = createContext<NovelContextType | undefined>(undefined);

export const NovelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<NovelProject>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error cargando guardado local', e);
      }
    }
    return mockProject;
  });

  const [currentChapterId, setCurrentChapterId] = useState<string>(project.chapters[0]?.id || '');
  const [currentSceneId, setCurrentSceneId] = useState<string>(project.chapters[0]?.scenes[0]?.id || '');
  const [currentBranchId, setCurrentBranchId] = useState<string>('main');

  const [gameState, setGameState] = useState<PlayerGameState>({
    currentChapterId: '',
    currentSceneId: '',
    currentBranchId: 'main',
    currentEventIndex: 0,
    runtimeVariables: {},
    runtimeCharacters: {},
    history: []
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  const resetProjectToDefault = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.clear();
    setProject(mockProject);
    setCurrentChapterId(mockProject.chapters[0]?.id || '');
    setCurrentSceneId(mockProject.chapters[0]?.scenes[0]?.id || '');
    setCurrentBranchId('main');
  };

  const saveProjectToLocal = () => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(project));

  const exportProjectJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${project.title || 'novela'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importProjectJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.chapters && parsed.characters) {
        setProject(parsed);
        setCurrentChapterId(parsed.chapters[0]?.id || '');
        setCurrentSceneId(parsed.chapters[0]?.scenes[0]?.id || '');
        setCurrentBranchId('main');
        return true;
      }
    } catch (e) {
      console.error('Error al importar', e);
    }
    return false;
  };

  const addOrUpdateCharacter = (character: Character) => {
    setProject(prev => ({
      ...prev,
      characters: { ...prev.characters, [character.id]: character },
      updatedAt: Date.now()
    }));
  };

  const deleteCharacter = (characterId: string) => {
    setProject(prev => {
      const copy = { ...prev.characters };
      delete copy[characterId];
      return { ...prev, characters: copy, updatedAt: Date.now() };
    });
  };

  const createBranch = (name: string): string => {
    const newId = `br_${Date.now()}`;
    const newBranch: Branch = {
      id: newId,
      name: name || 'Nueva Rama',
      timeline: []
    };

    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(chap => ({
        ...chap,
        scenes: chap.scenes.map(sc => {
          if (sc.id === currentSceneId) {
            return {
              ...sc,
              branches: { ...(sc.branches || {}), [newId]: newBranch }
            };
          }
          return sc;
        })
      })),
      updatedAt: Date.now()
    }));
    return newId;
  };

  const deleteBranch = (branchId: string) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(chap => ({
        ...chap,
        scenes: chap.scenes.map(sc => {
          if (sc.id === currentSceneId && sc.branches) {
            const copy = { ...sc.branches };
            delete copy[branchId];
            return { ...sc, branches: copy };
          }
          return sc;
        })
      })),
      updatedAt: Date.now()
    }));
    if (currentBranchId === branchId) setCurrentBranchId('main');
  };

  const addTimelineEvent = (event: TimelineEvent) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(chap => ({
        ...chap,
        scenes: chap.scenes.map(sc => {
          if (sc.id === currentSceneId) {
            if (currentBranchId === 'main') {
              return { ...sc, timeline: [...sc.timeline, event] };
            } else if (sc.branches && sc.branches[currentBranchId]) {
              const br = sc.branches[currentBranchId];
              return {
                ...sc,
                branches: {
                  ...sc.branches,
                  [currentBranchId]: { ...br, timeline: [...br.timeline, event] }
                }
              };
            }
          }
          return sc;
        })
      })),
      updatedAt: Date.now()
    }));
  };

  const updateTimelineEvent = (index: number, event: TimelineEvent) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(chap => ({
        ...chap,
        scenes: chap.scenes.map(sc => {
          if (sc.id === currentSceneId) {
            if (currentBranchId === 'main') {
              const copy = [...sc.timeline];
              copy[index] = event;
              return { ...sc, timeline: copy };
            } else if (sc.branches && sc.branches[currentBranchId]) {
              const br = sc.branches[currentBranchId];
              const copy = [...br.timeline];
              copy[index] = event;
              return {
                ...sc,
                branches: {
                  ...sc.branches,
                  [currentBranchId]: { ...br, timeline: copy }
                }
              };
            }
          }
          return sc;
        })
      })),
      updatedAt: Date.now()
    }));
  };

  const deleteTimelineEvent = (index: number) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(chap => ({
        ...chap,
        scenes: chap.scenes.map(sc => {
          if (sc.id === currentSceneId) {
            if (currentBranchId === 'main') {
              const copy = [...sc.timeline];
              copy.splice(index, 1);
              return { ...sc, timeline: copy };
            } else if (sc.branches && sc.branches[currentBranchId]) {
              const br = sc.branches[currentBranchId];
              const copy = [...br.timeline];
              copy.splice(index, 1);
              return {
                ...sc,
                branches: {
                  ...sc.branches,
                  [currentBranchId]: { ...br, timeline: copy }
                }
              };
            }
          }
          return sc;
        })
      })),
      updatedAt: Date.now()
    }));
  };

  const reorderTimelineEvents = (sourceIndex: number, destinationIndex: number) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(chap => ({
        ...chap,
        scenes: chap.scenes.map(sc => {
          if (sc.id === currentSceneId) {
            if (currentBranchId === 'main') {
              const copy = [...sc.timeline];
              const [moved] = copy.splice(sourceIndex, 1);
              copy.splice(destinationIndex, 0, moved);
              return { ...sc, timeline: copy };
            } else if (sc.branches && sc.branches[currentBranchId]) {
              const br = sc.branches[currentBranchId];
              const copy = [...br.timeline];
              const [moved] = copy.splice(sourceIndex, 1);
              copy.splice(destinationIndex, 0, moved);
              return {
                ...sc,
                branches: {
                  ...sc.branches,
                  [currentBranchId]: { ...br, timeline: copy }
                }
              };
            }
          }
          return sc;
        })
      })),
      updatedAt: Date.now()
    }));
  };

  const duplicateTimelineEventBase = (index: number) => {
    let currentScene: any = null;
    for (const chap of project.chapters) {
      const s = chap.scenes.find(sc => sc.id === currentSceneId);
      if (s) { currentScene = s; break; }
    }
    if (!currentScene) return;

    const timeline: TimelineEvent[] = currentBranchId === 'main'
      ? currentScene.timeline
      : (currentScene.branches?.[currentBranchId]?.timeline || []);

    const targetEvent = timeline[index];
    if (!targetEvent || targetEvent.type !== 'dialogue') return;

    const duplicated: TimelineEvent = {
      ...JSON.parse(JSON.stringify(targetEvent)),
      id: `dlg_${Date.now()}`,
      text: '',
      effect: 'none'
    };

    const newIndex = index + 1;
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(chap => ({
        ...chap,
        scenes: chap.scenes.map(sc => {
          if (sc.id === currentSceneId) {
            if (currentBranchId === 'main') {
              const copy = [...sc.timeline];
              copy.splice(newIndex, 0, duplicated);
              return { ...sc, timeline: copy };
            } else if (sc.branches && sc.branches[currentBranchId]) {
              const br = sc.branches[currentBranchId];
              const copy = [...br.timeline];
              copy.splice(newIndex, 0, duplicated);
              return {
                ...sc,
                branches: {
                  ...sc.branches,
                  [currentBranchId]: { ...br, timeline: copy }
                }
              };
            }
          }
          return sc;
        })
      })),
      updatedAt: Date.now()
    }));
  };

  const addOrUpdateVariable = (variable: CustomVariable) => {
    setProject(prev => ({
      ...prev,
      variables: { ...(prev.variables || {}), [variable.name]: variable },
      updatedAt: Date.now()
    }));
  };

  const deleteVariable = (varName: string) => {
    setProject(prev => {
      const copy = { ...(prev.variables || {}) };
      delete copy[varName];
      return { ...prev, variables: copy, updatedAt: Date.now() };
    });
  };

  const startPlaytest = () => {
    const initialVars: Record<string, boolean | number | string> = {};
    Object.values(project.variables || {}).forEach(v => {
      initialVars[v.name] = v.defaultValue;
    });

    setGameState({
      currentChapterId: project.chapters[0]?.id || '',
      currentSceneId: project.chapters[0]?.scenes[0]?.id || '',
      currentBranchId: 'main',
      currentEventIndex: 0,
      runtimeVariables: initialVars,
      runtimeCharacters: JSON.parse(JSON.stringify(project.characters)),
      history: []
    });
  };

  const jumpToScene = (sceneId: string) => {
    for (const chap of project.chapters) {
      const found = chap.scenes.find(s => s.id === sceneId);
      if (found) {
        setGameState(prev => ({
          ...prev,
          currentChapterId: chap.id,
          currentSceneId: sceneId,
          currentBranchId: 'main',
          currentEventIndex: 0
        }));
        return;
      }
    }
  };

  const jumpToBranch = (branchId: string) => {
    setGameState(prev => ({
      ...prev,
      currentBranchId: branchId,
      currentEventIndex: 0
    }));
  };

  const checkCondition = (
    cond: BranchJumpCondition | undefined, 
    runtimeVars: Record<string, any>
  ): boolean => {
    if (!cond || !cond.variableName) return true;
    
    const currentVal = runtimeVars[cond.variableName];
    const targetVal = cond.value;

    switch (cond.operator) {
      case 'equals':
        return String(currentVal) === String(targetVal);
      case 'not_equals':
        return String(currentVal) !== String(targetVal);
      case 'greater':
        return Number(currentVal) > Number(targetVal);
      case 'less':
        return Number(currentVal) < Number(targetVal);
      default:
        return true;
    }
  };

  const advancePlayerEvent = () => {
    let currentScene: any = null;
    for (const chap of project.chapters) {
      const s = chap.scenes.find(sc => sc.id === gameState.currentSceneId);
      if (s) { currentScene = s; break; }
    }
    if (!currentScene) return;

    const timeline: TimelineEvent[] = gameState.currentBranchId === 'main'
      ? currentScene.timeline
      : (currentScene.branches?.[gameState.currentBranchId]?.timeline || []);

    const currentEvent = timeline[gameState.currentEventIndex];
    if (!currentEvent) return;

    if (currentEvent.type === 'dialogue') {
      const charName = currentEvent.speakerId === 'narrator'
        ? 'Narrador'
        : (project.characters[currentEvent.speakerId]?.name || 'Personaje');
      
      if (currentEvent.jumpToBranchId) {
        const shouldJump = checkCondition(currentEvent.jumpCondition, gameState.runtimeVariables);
        if (shouldJump) {
          setGameState(prev => ({
            ...prev,
            history: [...prev.history, `${charName}: ${currentEvent.text}`],
            currentBranchId: currentEvent.jumpToBranchId!,
            currentEventIndex: currentEvent.jumpToEventIndex ?? 0,
            activeEffect: currentEvent.effect || 'none'
          }));
          return;
        }
      }

      setGameState(prev => ({
        ...prev,
        history: [...prev.history, `${charName}: ${currentEvent.text}`],
        activeEffect: currentEvent.effect || 'none'
      }));
    }

    if (gameState.currentEventIndex < timeline.length - 1) {
      setGameState(prev => ({ ...prev, currentEventIndex: prev.currentEventIndex + 1 }));
    }
  };

  const applyVariableChanges = (changes: VariableChange[], runtimeVars: Record<string, any>) => {
    const updated = { ...runtimeVars };
    changes.forEach(ch => {
      const currentVal = updated[ch.variableName];
      let operand = ch.value;

      if (ch.valueType === 'variable') {
        operand = updated[String(ch.value)];
      }

      switch (ch.operation) {
        case 'set':
          updated[ch.variableName] = operand;
          break;
        case 'toggle':
          updated[ch.variableName] = !currentVal;
          break;
        case 'add':
          updated[ch.variableName] = (Number(currentVal) || 0) + Number(operand);
          break;
        case 'subtract':
          updated[ch.variableName] = (Number(currentVal) || 0) - Number(operand);
          break;
        case 'multiply':
          updated[ch.variableName] = (Number(currentVal) || 0) * Number(operand);
          break;
        case 'divide':
          updated[ch.variableName] = Number(operand) !== 0 ? (Number(currentVal) || 0) / Number(operand) : currentVal;
          break;
      }
    });
    return updated;
  };

  const selectChoiceOption = (optionId: string) => {
    let currentScene: any = null;
    for (const chap of project.chapters) {
      const s = chap.scenes.find(sc => sc.id === gameState.currentSceneId);
      if (s) { currentScene = s; break; }
    }
    if (!currentScene) return;

    const timeline: TimelineEvent[] = gameState.currentBranchId === 'main'
      ? currentScene.timeline
      : (currentScene.branches?.[gameState.currentBranchId]?.timeline || []);

    const currentEvent = timeline[gameState.currentEventIndex];
    if (currentEvent?.type !== 'choice') return;

    const opt = currentEvent.options.find((o: any) => o.id === optionId);
    if (!opt) return;

    if (opt.affinityChanges) {
      setGameState(prev => {
        const copy = { ...prev.runtimeCharacters };
        opt.affinityChanges?.forEach((ch: any) => {
          if (copy[ch.characterId]) {
            copy[ch.characterId].affinity = (copy[ch.characterId].affinity || 0) + ch.amount;
          }
        });
        return { ...prev, runtimeCharacters: copy };
      });
    }

    if (opt.variableChanges && opt.variableChanges.length > 0) {
      setGameState(prev => ({
        ...prev,
        runtimeVariables: applyVariableChanges(opt.variableChanges!, prev.runtimeVariables)
      }));
    }

    if (opt.jumpToSceneId) {
      jumpToScene(opt.jumpToSceneId);
    } else if (opt.jumpToBranchId) {
      setGameState(prev => ({
        ...prev,
        currentBranchId: opt.jumpToBranchId!,
        currentEventIndex: opt.jumpToEventIndex ?? 0
      }));
    } else {
      setGameState(prev => ({ ...prev, currentEventIndex: prev.currentEventIndex + 1 }));
    }
  };

  return (
    <NovelContext.Provider
      value={{
        project,
        setProject,
        saveProjectToLocal,
        exportProjectJson,
        importProjectJson,
        resetProjectToDefault,
        currentChapterId,
        setCurrentChapterId,
        currentSceneId,
        setCurrentSceneId,
        currentBranchId,
        setCurrentBranchId,
        addOrUpdateCharacter,
        deleteCharacter,
        createBranch,
        deleteBranch,
        addTimelineEvent,
        updateTimelineEvent,
        deleteTimelineEvent,
        reorderTimelineEvents,
        duplicateTimelineEventBase,
        addOrUpdateVariable,
        deleteVariable,
        gameState,
        startPlaytest,
        advancePlayerEvent,
        selectChoiceOption,
        jumpToScene,
        jumpToBranch
      }}
    >
      {children}
    </NovelContext.Provider>
  );
};

export const useNovel = () => {
  const context = useContext(NovelContext);
  if (!context) throw new Error('useNovel debe usarse dentro de NovelProvider');
  return context;
};
