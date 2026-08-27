import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  NovelProject, 
  Character, 
  TimelineEvent, 
  PlayerGameState,
  CustomVariable,
  Branch,
  VariableChange,
  BranchJumpCondition,
  LibraryNovelEntry,
  SaveSlot
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
  setPlayerName: (name: string) => void;
  startPlaytest: (customInitialState?: PlayerGameState) => void;
  advancePlayerEvent: () => void;
  selectChoiceOption: (optionId: string) => void;
  jumpToScene: (sceneId: string) => void;
  jumpToBranch: (branchId: string) => void;
  parseTextTokens: (text: string) => string;

  // 👈 Sistema de Biblioteca y Guardados
  library: Record<string, LibraryNovelEntry>;
  saveCurrentProjectToLibrary: () => void;
  loadProjectFromLibrary: (novelId: string) => boolean;
  deleteNovelFromLibrary: (novelId: string) => void;
  saveGameToSlot: (slotNumber: number) => void;
  loadGameFromSlot: (novelId: string, slotId: string) => boolean;
  deleteSaveSlot: (novelId: string, slotId: string) => void;
  importCommunityNovelToLibrary: (novel: NovelProject, authorName?: string, authorId?: string, allowEdit?: boolean) => string;
}

const LOCAL_STORAGE_KEY = 'vwn_studio_project_v104_local_bg_and_sprites';
const LIBRARY_STORAGE_KEY = 'vwn_studio_library_v100';

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

  const [library, setLibrary] = useState<Record<string, LibraryNovelEntry>>(() => {
    const savedLib = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (savedLib) {
      try {
        return JSON.parse(savedLib);
      } catch (e) {
        console.error('Error cargando biblioteca', e);
      }
    }
    return {};
  });

  const [currentChapterId, setCurrentChapterId] = useState<string>(project.chapters[0]?.id || '');
  const [currentSceneId, setCurrentSceneId] = useState<string>(project.chapters[0]?.scenes[0]?.id || '');
  const [currentBranchId, setCurrentBranchId] = useState<string>('main');

  const [gameState, setGameState] = useState<PlayerGameState>({
    currentChapterId: '',
    currentSceneId: '',
    currentBranchId: 'main',
    currentEventIndex: 0,
    playerName: project.defaultPlayerName || 'Protagonista',
    runtimeVariables: {},
    runtimeCharacters: {},
    history: []
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  useEffect(() => {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
  }, [library]);

  const parseTextTokens = (text: string): string => {
    if (!text) return '';
    const currentName = gameState.playerName || project.defaultPlayerName || 'Protagonista';
    return text
      .replace(/\{player\}/gi, currentName)
      .replace(/\[player\]/gi, currentName)
      .replace(/\(player\)/gi, currentName);
  };

  const setPlayerName = (name: string) => {
    setGameState(prev => ({ ...prev, playerName: name.trim() || 'Protagonista' }));
  };

  const resetProjectToDefault = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
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

  // -------------------------------------------------------------
  // BIBLIOTECA & SLOTS DE GUARDADO
  // -------------------------------------------------------------
  const saveCurrentProjectToLibrary = () => {
    const novelId = project.id || `novel_${Date.now()}`;
    const entry: LibraryNovelEntry = {
      id: novelId,
      title: project.title || 'Novela sin título',
      description: project.description || '',
      coverUrl: project.backgroundGallery?.[0]?.url || project.chapters[0]?.scenes[0]?.backgroundUrl,
      lastPlayedAt: Date.now(),
      isOwner: true,
      allowEdit: true,
      project: { ...project, id: novelId },
      saveSlots: library[novelId]?.saveSlots || {}
    };

    setLibrary(prev => ({ ...prev, [novelId]: entry }));
  };

  const loadProjectFromLibrary = (novelId: string): boolean => {
    const entry = library[novelId];
    if (!entry) return false;
    setProject(entry.project);
    setCurrentChapterId(entry.project.chapters[0]?.id || '');
    setCurrentSceneId(entry.project.chapters[0]?.scenes[0]?.id || '');
    setCurrentBranchId('main');
    return true;
  };

  const deleteNovelFromLibrary = (novelId: string) => {
    setLibrary(prev => {
      const copy = { ...prev };
      delete copy[novelId];
      return copy;
    });
  };

  const importCommunityNovelToLibrary = (
    novel: NovelProject, 
    authorName = 'Comunidad', 
    authorId = '', 
    allowEdit = false
  ): string => {
    const novelId = novel.id || `comm_${Date.now()}`;
    const entry: LibraryNovelEntry = {
      id: novelId,
      title: novel.title || 'Novela Comunitaria',
      description: novel.description || '',
      coverUrl: novel.backgroundGallery?.[0]?.url || novel.chapters[0]?.scenes[0]?.backgroundUrl,
      authorName,
      authorId,
      lastPlayedAt: Date.now(),
      isOwner: false,
      allowEdit: Boolean(allowEdit || novel.allowCommunityEdit),
      project: { ...novel, id: novelId },
      saveSlots: library[novelId]?.saveSlots || {}
    };

    setLibrary(prev => ({ ...prev, [novelId]: entry }));
    return novelId;
  };

  const saveGameToSlot = (slotNumber: number) => {
    const novelId = project.id || 'current_project';
    let currentScene: any = null;
    let currentChapter: any = null;

    for (const chap of project.chapters) {
      const s = chap.scenes.find(sc => sc.id === gameState.currentSceneId);
      if (s) {
        currentChapter = chap;
        currentScene = s;
        break;
      }
    }

    const timeline: TimelineEvent[] = gameState.currentBranchId === 'main'
      ? currentScene?.timeline
      : (currentScene?.branches?.[gameState.currentBranchId]?.timeline || []);

    const curEvt = timeline?.[gameState.currentEventIndex];
    const previewBg = curEvt?.backgroundUrl || currentScene?.backgroundUrl;
    const previewTxt = curEvt?.type === 'dialogue' ? curEvt.text : 'Decisión en curso...';

    const slotId = `slot_${slotNumber}`;
    const newSlot: SaveSlot = {
      id: slotId,
      slotNumber,
      timestamp: Date.now(),
      previewBgUrl: previewBg,
      previewText: previewTxt,
      sceneTitle: currentScene?.title || 'Escena',
      chapterTitle: currentChapter?.title || 'Capítulo',
      state: JSON.parse(JSON.stringify(gameState))
    };

    setLibrary(prev => {
      const existingEntry = prev[novelId] || {
        id: novelId,
        title: project.title || 'Novela sin título',
        description: project.description || '',
        coverUrl: previewBg,
        lastPlayedAt: Date.now(),
        isOwner: true,
        allowEdit: true,
        project,
        saveSlots: {}
      };

      return {
        ...prev,
        [novelId]: {
          ...existingEntry,
          lastPlayedAt: Date.now(),
          saveSlots: {
            ...existingEntry.saveSlots,
            [slotId]: newSlot
          }
        }
      };
    });
  };

  const loadGameFromSlot = (novelId: string, slotId: string): boolean => {
    const entry = library[novelId];
    if (!entry) return false;
    const slot = entry.saveSlots[slotId];
    if (!slot) return false;

    setProject(entry.project);
    startPlaytest(slot.state);
    return true;
  };

  const deleteSaveSlot = (novelId: string, slotId: string) => {
    setLibrary(prev => {
      const entry = prev[novelId];
      if (!entry) return prev;
      const copySlots = { ...entry.saveSlots };
      delete copySlots[slotId];

      return {
        ...prev,
        [novelId]: {
          ...entry,
          saveSlots: copySlots
        }
      };
    });
  };

  // -------------------------------------------------------------
  // FUNCIONES DE EDICIÓN & HISTORIA
  // -------------------------------------------------------------
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

  const startPlaytest = (customInitialState?: PlayerGameState) => {
    if (customInitialState) {
      setGameState(customInitialState);
      return;
    }

    const initialVars: Record<string, boolean | number | string> = {};
    Object.values(project.variables || {}).forEach(v => {
      initialVars[v.name] = v.defaultValue;
    });

    setGameState({
      currentChapterId: project.chapters[0]?.id || '',
      currentSceneId: project.chapters[0]?.scenes[0]?.id || '',
      currentBranchId: 'main',
      currentEventIndex: 0,
      playerName: project.defaultPlayerName || 'Protagonista',
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
      const rawSpeakerName = currentEvent.speakerId === 'narrator'
        ? 'Narrador'
        : (project.characters[currentEvent.speakerId]?.name || 'Personaje');
      
      const parsedText = parseTextTokens(currentEvent.text);

      if (currentEvent.jumpToBranchId) {
        const shouldJump = checkCondition(currentEvent.jumpCondition, gameState.runtimeVariables);
        if (shouldJump) {
          setGameState(prev => ({
            ...prev,
            history: [...prev.history, `${rawSpeakerName}: ${parsedText}`],
            currentBranchId: currentEvent.jumpToBranchId!,
            currentEventIndex: currentEvent.jumpToEventIndex ?? 0,
            activeEffect: currentEvent.effect || 'none'
          }));
          return;
        }
      }

      setGameState(prev => ({
        ...prev,
        history: [...prev.history, `${rawSpeakerName}: ${parsedText}`],
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
        setPlayerName,
        startPlaytest,
        advancePlayerEvent,
        selectChoiceOption,
        jumpToScene,
        jumpToBranch,
        parseTextTokens,
        library,
        saveCurrentProjectToLibrary,
        loadProjectFromLibrary,
        deleteNovelFromLibrary,
        saveGameToSlot,
        loadGameFromSlot,
        deleteSaveSlot,
        importCommunityNovelToLibrary
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