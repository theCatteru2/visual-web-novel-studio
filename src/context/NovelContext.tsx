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
  SaveSlot, 
  Scene,
  PlaySessionInfo
} from '../types';
import { mockProject } from '../mockData';

interface NovelContextType {
  // Borrador de trabajo (Editor)
  editingProject: NovelProject;
  setEditingProject: React.Dispatch<React.SetStateAction<NovelProject>>;
  project: NovelProject;
  setProject: React.Dispatch<React.SetStateAction<NovelProject>>;

  // Proyecto en Reproducción y Metadatos de Sesión (Player)
  activePlayProject: NovelProject;
  playSessionInfo: PlaySessionInfo;
  launchPlayer: (
    novelToPlay: NovelProject,
    options?: {
      isEditorPlaytest?: boolean;
      canEdit?: boolean;
      novelId?: string;
      fromStart?: boolean;
      customInitialState?: PlayerGameState;
    }
  ) => void;
  loadProjectToEditor: (projectToEdit: NovelProject, novelId?: string | null) => void;

  // Persistencia y Portabilidad del Borrador
  saveProjectToLocal: () => void;
  exportProjectJson: () => void;
  importProjectJson: (jsonString: string) => boolean;
  resetProjectToDefault: () => void;

  // Navegación en el Editor
  currentSceneId: string;
  setCurrentSceneId: (id: string) => void;
  currentBranchId: string;
  setCurrentBranchId: (id: string) => void;
  activeLibraryNovelId: string | null;
  setActiveLibraryNovelId: (id: string | null) => void;

  // Mutaciones del Borrador
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
  deleteBackgroundFromGallery: (bgId: string) => void;

  // Runtime del Reproductor
  gameState: PlayerGameState;
  setPlayerName: (name: string) => void;
  startPlaytest: (customInitialState?: PlayerGameState, fromStart?: boolean) => void;
  advancePlayerEvent: () => void;
  selectChoiceOption: (optionId: string) => void;
  jumpToScene: (sceneId: string) => void;
  jumpToBranch: (branchId: string) => void;
  parseTextTokens: (text: string) => string;

  // Biblioteca y Guardado de Partidas
  library: Record<string, LibraryNovelEntry>;
  saveCurrentProjectToLibrary: () => void;
  loadProjectFromLibrary: (novelId: string) => boolean;
  deleteNovelFromLibrary: (novelId: string) => void;
  saveGameToSlot: (slotNumber: number) => void;
  loadGameFromSlot: (novelId: string, slotId: string) => boolean;
  deleteSaveSlot: (novelId: string, slotId: string) => void;
  importCommunityNovelToLibrary: (novel: NovelProject, authorName?: string, authorId?: string, allowEdit?: boolean) => string;
}

const LOCAL_STORAGE_KEY = 'vwn_studio_project_v105_scenes_fixed';
const LIBRARY_STORAGE_KEY = 'vwn_studio_library_v100';

const NovelContext = createContext<NovelContextType | undefined>(undefined);

const getProjectScenes = (proj: any): Scene[] => {
  if (proj?.scenes && Array.isArray(proj.scenes)) return proj.scenes;
  if (proj?.chapters?.[0]?.scenes && Array.isArray(proj.chapters[0].scenes)) return proj.chapters[0].scenes;
  return [];
};

export const NovelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editingProject, setEditingProject] = useState<NovelProject>(() => {
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

  const [activePlayProject, setActivePlayProject] = useState<NovelProject>(editingProject);

  const [playSessionInfo, setPlaySessionInfo] = useState<PlaySessionInfo>({
    isEditorPlaytest: true,
    canEdit: true,
    novelId: undefined,
    novelTitle: editingProject.title
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

  const initialScenes = getProjectScenes(editingProject);
  const firstSceneId = initialScenes[0]?.id || '';

  const [currentSceneId, setCurrentSceneId] = useState<string>(firstSceneId);
  const [currentBranchId, setCurrentBranchId] = useState<string>('main');
  const [activeLibraryNovelId, setActiveLibraryNovelId] = useState<string | null>(null);

  const [gameState, setGameState] = useState<PlayerGameState>(() => {
    const initialVars: Record<string, boolean | number | string> = {};
    Object.values(editingProject.variables || {}).forEach(v => {
      initialVars[v.name] = v.defaultValue;
    });

    return {
      currentChapterId: '',
      currentSceneId: firstSceneId,
      currentBranchId: 'main',
      currentEventIndex: 0,
      playerName: editingProject.defaultPlayerName || 'Protagonista',
      runtimeVariables: initialVars,
      runtimeCharacters: JSON.parse(JSON.stringify(editingProject.characters || {})),
      history: []
    };
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(editingProject));
  }, [editingProject]);

  useEffect(() => {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
  }, [library]);

  const launchPlayer = (
    novelToPlay: NovelProject,
    options?: {
      isEditorPlaytest?: boolean;
      canEdit?: boolean;
      novelId?: string;
      fromStart?: boolean;
      customInitialState?: PlayerGameState;
    }
  ) => {
    const isEditorPlaytest = options?.isEditorPlaytest ?? false;
    const canEdit = options?.canEdit ?? false;
    const novelId = options?.novelId || novelToPlay.id;
    const fromStart = options?.fromStart ?? false;
    const customInitialState = options?.customInitialState;

    setActivePlayProject(novelToPlay);
    setPlaySessionInfo({
      isEditorPlaytest,
      canEdit,
      novelId,
      novelTitle: novelToPlay.title
    });

    if (customInitialState) {
      setGameState(customInitialState);
      return;
    }

    const scenes = getProjectScenes(novelToPlay);
    const targetSceneId = fromStart
      ? (scenes[0]?.id || '')
      : (isEditorPlaytest ? (currentSceneId || scenes[0]?.id || '') : (scenes[0]?.id || ''));
    const targetBranchId = fromStart
      ? 'main'
      : (isEditorPlaytest ? (currentBranchId || 'main') : 'main');

    const initialVars: Record<string, boolean | number | string> = {};
    Object.values(novelToPlay.variables || {}).forEach(v => {
      initialVars[v.name] = v.defaultValue;
    });

    setGameState({
      currentChapterId: '',
      currentSceneId: targetSceneId,
      currentBranchId: targetBranchId,
      currentEventIndex: 0,
      playerName: novelToPlay.defaultPlayerName || 'Protagonista',
      runtimeVariables: initialVars,
      runtimeCharacters: JSON.parse(JSON.stringify(novelToPlay.characters || {})),
      history: []
    });
  };

  const loadProjectToEditor = (projectToEdit: NovelProject, novelId?: string | null) => {
    setEditingProject(projectToEdit);
    const scenes = getProjectScenes(projectToEdit);
    setCurrentSceneId(scenes[0]?.id || '');
    setCurrentBranchId('main');
    setActiveLibraryNovelId(novelId ?? null);
  };

  const startPlaytest = (customInitialState?: PlayerGameState, fromStart = false) => {
    launchPlayer(editingProject, {
      isEditorPlaytest: true,
      canEdit: true,
      novelId: activeLibraryNovelId || editingProject.id,
      fromStart,
      customInitialState
    });
  };

  const parseTextTokens = (text: string): string => {
    if (!text) return '';
    const currentName = gameState.playerName || activePlayProject.defaultPlayerName || 'Protagonista';
    let parsed = text
      .replace(/\{player\}/gi, currentName)
      .replace(/\[player\]/gi, currentName)
      .replace(/\(player\)/gi, currentName);

    if (gameState.runtimeVariables) {
      Object.entries(gameState.runtimeVariables).forEach(([varKey, varVal]) => {
        const regex = new RegExp(`\\{${varKey}\\}`, 'gi');
        parsed = parsed.replace(regex, String(varVal));
      });
    }

    return parsed;
  };

  const setPlayerName = (name: string) => {
    setGameState(prev => ({ ...prev, playerName: name.trim() || 'Protagonista' }));
  };

  const resetProjectToDefault = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setEditingProject(mockProject);
    const defScenes = getProjectScenes(mockProject);
    const defSceneId = defScenes[0]?.id || '';
    setCurrentSceneId(defSceneId);
    setCurrentBranchId('main');
    setActiveLibraryNovelId(null);
  };

  const saveProjectToLocal = () => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(editingProject));

  const exportProjectJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(editingProject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${editingProject.title || 'novela'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importProjectJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      const parsedScenes = getProjectScenes(parsed);
      if (parsedScenes.length > 0 && parsed.characters) {
        loadProjectToEditor(parsed, null);
        return true;
      }
    } catch (e) {
      console.error('Error al importar', e);
    }
    return false;
  };

  const saveCurrentProjectToLibrary = () => {
    const novelId = activeLibraryNovelId || editingProject.id || `novel_${Date.now()}`;
    const scenes = getProjectScenes(editingProject);
    const entry: LibraryNovelEntry = {
      id: novelId,
      title: editingProject.title || 'Novela sin título',
      description: editingProject.description || '',
      coverUrl: editingProject.backgroundGallery?.[0]?.url || scenes[0]?.backgroundUrl,
      lastPlayedAt: Date.now(),
      isOwner: true,
      allowEdit: true,
      project: { ...editingProject, id: novelId },
      saveSlots: library[novelId]?.saveSlots || {}
    };

    setLibrary(prev => ({ ...prev, [novelId]: entry }));
    setActiveLibraryNovelId(novelId);
  };

  const loadProjectFromLibrary = (novelId: string): boolean => {
    const entry = library[novelId];
    if (!entry) return false;
    loadProjectToEditor(entry.project, novelId);
    return true;
  };

  const deleteNovelFromLibrary = (novelId: string) => {
    setLibrary(prev => {
      const copy = { ...prev };
      delete copy[novelId];
      return copy;
    });
    if (activeLibraryNovelId === novelId) setActiveLibraryNovelId(null);
  };

  const importCommunityNovelToLibrary = (
    novel: NovelProject, 
    authorName = 'Comunidad', 
    authorId = '', 
    allowEdit = false
  ): string => {
    const novelId = novel.id || `comm_${Date.now()}`;
    const scenes = getProjectScenes(novel);
    const entry: LibraryNovelEntry = {
      id: novelId,
      title: novel.title || 'Novela Comunitaria',
      description: novel.description || '',
      coverUrl: novel.backgroundGallery?.[0]?.url || scenes[0]?.backgroundUrl,
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

  const updateScenes = (updater: (scenes: Scene[]) => Scene[]) => {
    setEditingProject((prev: any) => {
      if (prev.scenes && Array.isArray(prev.scenes)) {
        return { ...prev, scenes: updater(prev.scenes), updatedAt: Date.now() };
      }
      if (prev.chapters && Array.isArray(prev.chapters)) {
        return {
          ...prev,
          chapters: prev.chapters.map((chap: any) => ({
            ...chap,
            scenes: updater(chap.scenes || [])
          })),
          updatedAt: Date.now()
        };
      }
      return { ...prev, scenes: updater([]), updatedAt: Date.now() };
    });
  };

  const updateActiveTimeline = (updater: (timeline: TimelineEvent[]) => TimelineEvent[]) => {
    updateScenes(scenes => scenes.map(sc => {
      if (sc.id !== currentSceneId) return sc;
      if (currentBranchId === 'main') {
        return { ...sc, timeline: updater(sc.timeline || []) };
      }
      if (sc.branches && sc.branches[currentBranchId]) {
        const br = sc.branches[currentBranchId];
        return {
          ...sc,
          branches: {
            ...sc.branches,
            [currentBranchId]: { ...br, timeline: updater(br.timeline || []) }
          }
        };
      }
      return sc;
    }));
  };

  const addTimelineEvent = (event: TimelineEvent) => {
    updateActiveTimeline(tl => [...tl, event]);
  };

  const updateTimelineEvent = (index: number, event: TimelineEvent) => {
    updateActiveTimeline(tl => {
      const copy = [...tl];
      copy[index] = event;
      return copy;
    });
  };

  const deleteTimelineEvent = (index: number) => {
    updateActiveTimeline(tl => tl.filter((_, i) => i !== index));
  };

  const reorderTimelineEvents = (sourceIndex: number, destinationIndex: number) => {
    updateActiveTimeline(tl => {
      const copy = [...tl];
      const [moved] = copy.splice(sourceIndex, 1);
      copy.splice(destinationIndex, 0, moved);
      return copy;
    });
  };

  const duplicateTimelineEventBase = (index: number) => {
    updateActiveTimeline(tl => {
      const srcEvt = tl[index];
      if (!srcEvt) return tl;
      const cloned: TimelineEvent = JSON.parse(JSON.stringify(srcEvt));
      cloned.id = `evt_${Date.now()}`;
      const copy = [...tl];
      copy.splice(index + 1, 0, cloned);
      return copy;
    });
  };

  const saveGameToSlot = (slotNumber: number) => {
    const novelId = playSessionInfo.novelId || activePlayProject.id || 'current_project';
    const scenes = getProjectScenes(activePlayProject);
    const currentScene = scenes.find(sc => sc.id === gameState.currentSceneId);

    const timeline: TimelineEvent[] = gameState.currentBranchId === 'main'
      ? (currentScene?.timeline || [])
      : (currentScene?.branches?.[gameState.currentBranchId]?.timeline || []);

    const curEvt = timeline?.[gameState.currentEventIndex];
    const previewBg = curEvt?.backgroundUrl || currentScene?.backgroundUrl;
    const previewTxt = curEvt?.type === 'dialogue' ? parseTextTokens(curEvt.text) : 'Decisión en curso...';

    const slotId = `slot_${slotNumber}`;
    const newSlot: SaveSlot = {
      id: slotId,
      slotNumber,
      timestamp: Date.now(),
      previewBgUrl: previewBg,
      previewText: previewTxt,
      sceneTitle: currentScene?.title || 'Escena',
      state: JSON.parse(JSON.stringify(gameState))
    };

    setLibrary(prev => {
      const existingEntry = prev[novelId] || {
        id: novelId,
        title: activePlayProject.title || 'Novela sin título',
        description: activePlayProject.description || '',
        coverUrl: previewBg,
        lastPlayedAt: Date.now(),
        isOwner: playSessionInfo.canEdit,
        allowEdit: playSessionInfo.canEdit,
        project: activePlayProject,
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

    launchPlayer(entry.project, {
      isEditorPlaytest: false,
      canEdit: entry.isOwner || entry.allowEdit,
      novelId,
      customInitialState: slot.state
    });
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

  const addOrUpdateCharacter = (character: Character) => {
    setEditingProject(prev => ({
      ...prev,
      characters: { ...prev.characters, [character.id]: character },
      updatedAt: Date.now()
    }));
  };

  const deleteCharacter = (characterId: string) => {
    setEditingProject(prev => {
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

    updateScenes(scenes => scenes.map(sc => {
      if (sc.id === currentSceneId) {
        return {
          ...sc,
          branches: { ...(sc.branches || {}), [newId]: newBranch }
        };
      }
      return sc;
    }));
    return newId;
  };

  const deleteBranch = (branchId: string) => {
    updateScenes(scenes => scenes.map(sc => {
      if (sc.id === currentSceneId && sc.branches) {
        const copy = { ...sc.branches };
        delete copy[branchId];
        return { ...sc, branches: copy };
      }
      return sc;
    }));
    if (currentBranchId === branchId) setCurrentBranchId('main');
  };

  const addOrUpdateVariable = (variable: CustomVariable) => {
    setEditingProject(prev => ({
      ...prev,
      variables: { ...prev.variables, [variable.name]: variable },
      updatedAt: Date.now()
    }));
  };

  const deleteVariable = (varName: string) => {
    setEditingProject(prev => {
      const copy = { ...prev.variables };
      delete copy[varName];
      return { ...prev, variables: copy, updatedAt: Date.now() };
    });
  };

  const deleteBackgroundFromGallery = (bgId: string) => {
    setEditingProject(prev => ({
      ...prev,
      backgroundGallery: prev.backgroundGallery.filter(b => b.id !== bgId),
      updatedAt: Date.now()
    }));
  };

  const jumpToScene = (sceneId: string) => {
    const scenes = getProjectScenes(activePlayProject);
    const found = scenes.find(s => s.id === sceneId);
    if (found) {
      setGameState(prev => ({
        ...prev,
        currentSceneId: sceneId,
        currentBranchId: 'main',
        currentEventIndex: 0
      }));
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
    setGameState(prev => {
      const scenes = getProjectScenes(activePlayProject);
      let currentScene = scenes.find(sc => sc.id === prev.currentSceneId) || scenes[0];
      if (!currentScene) return prev;

      const timeline: TimelineEvent[] = prev.currentBranchId === 'main'
        ? (currentScene.timeline || [])
        : (currentScene.branches?.[prev.currentBranchId]?.timeline || []);

      const currentEvent = timeline[prev.currentEventIndex];
      if (!currentEvent) return prev;

      const rawSpeakerName = currentEvent.type === 'dialogue'
        ? (currentEvent.speakerId === 'narrator' ? 'Narrador' : (activePlayProject.characters[currentEvent.speakerId]?.name || 'Personaje'))
        : 'Decisión';

      const parsedText = currentEvent.type === 'dialogue' ? parseTextTokens(currentEvent.text) : '';
      const newHistoryEntry = currentEvent.type === 'dialogue' ? `${rawSpeakerName}: ${parsedText}` : null;
      const nextHistory = newHistoryEntry ? [...prev.history, newHistoryEntry] : prev.history;

      if (currentEvent.type === 'dialogue' && currentEvent.jumpToBranchId) {
        const shouldJump = checkCondition(currentEvent.jumpCondition, prev.runtimeVariables);
        if (shouldJump) {
          return {
            ...prev,
            history: nextHistory,
            currentBranchId: currentEvent.jumpToBranchId,
            currentEventIndex: currentEvent.jumpToEventIndex ?? 0,
            activeEffect: currentEvent.effect || 'none'
          };
        }
      }

      if (prev.currentEventIndex < timeline.length - 1) {
        return {
          ...prev,
          currentEventIndex: prev.currentEventIndex + 1,
          history: nextHistory,
          activeEffect: currentEvent.type === 'dialogue' ? (currentEvent.effect || 'none') : prev.activeEffect
        };
      }

      const currentIdx = scenes.findIndex(item => item.id === currentScene.id);
      if (currentIdx !== -1 && currentIdx < scenes.length - 1) {
        const nextScene = scenes[currentIdx + 1];
        return {
          ...prev,
          currentSceneId: nextScene.id,
          currentBranchId: 'main',
          currentEventIndex: 0,
          history: nextHistory,
          activeEffect: 'none'
        };
      }

      return {
        ...prev,
        history: nextHistory
      };
    });
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
    const scenes = getProjectScenes(activePlayProject);
    const currentScene = scenes.find(sc => sc.id === gameState.currentSceneId) || scenes[0];
    if (!currentScene) return;

    const timeline: TimelineEvent[] = gameState.currentBranchId === 'main'
      ? (currentScene.timeline || [])
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
        editingProject,
        setEditingProject,
        project: editingProject,
        setProject: setEditingProject,
        activePlayProject,
        playSessionInfo,
        launchPlayer,
        loadProjectToEditor,
        saveProjectToLocal,
        exportProjectJson,
        importProjectJson,
        resetProjectToDefault,
        currentSceneId,
        setCurrentSceneId,
        currentBranchId,
        setCurrentBranchId,
        activeLibraryNovelId,
        setActiveLibraryNovelId,
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
        deleteBackgroundFromGallery,
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
  if (!context) throw new Error('useNovel debe ser usado dentro de un NovelProvider');
  return context;
};
