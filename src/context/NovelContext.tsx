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
  // Proyecto de Edición (Borrador del usuario)
  editingProject: NovelProject;
  setEditingProject: React.Dispatch<React.SetStateAction<NovelProject>>;
  project: NovelProject; // Alias de editingProject para retrocompatibilidad con componentes del editor
  setProject: React.Dispatch<React.SetStateAction<NovelProject>>; // Alias de setEditingProject

  // Proyecto de Reproducción y Sesión
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

  // Modificación del Borrador
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

  // Estado y Control del Reproductor
  gameState: PlayerGameState;
  setPlayerName: (name: string) => void;
  startPlaytest: (customInitialState?: PlayerGameState, fromStart?: boolean) => void;
  advancePlayerEvent: () => void;
  selectChoiceOption: (optionId: string) => void;
  jumpToScene: (sceneId: string) => void;
  jumpToBranch: (branchId: string) => void;
  parseTextTokens: (text: string) => string;

  // Biblioteca y Guardados
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

// Helper para obtener lista plana de escenas
const getProjectScenes = (proj: any): Scene[] => {
  if (proj?.scenes && Array.isArray(proj.scenes)) return proj.scenes;
  if (proj?.chapters?.[0]?.scenes && Array.isArray(proj.chapters[0].scenes)) return proj.chapters[0].scenes;
  return [];
};

export const NovelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Borrador de trabajo del creador (Editor)
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

  // 2. Proyecto actualmente cargado en el reproductor (Player)
  const [activePlayProject, setActivePlayProject] = useState<NovelProject>(editingProject);

  // 3. Metadatos de la sesión de juego
  const [playSessionInfo, setPlaySessionInfo] = useState<PlaySessionInfo>({
    isEditorPlaytest: true,
    canEdit: true,
    novelId: undefined,
    novelTitle: editingProject.title
  });

  // 4. Biblioteca local
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

  // Estado del juego en ejecución
  const [gameState, setGameState] = useState<PlayerGameState>(() => {
    const initialVars: Record<string, boolean | number | string> = {};
    Object.values(editingProject.variables || {}).forEach(v => {
      initialVars[v.name] = v.defaultValue;
    });

    return {
      currentChapterId: '',
      currentSceneId: firstSceneId,
      currentBranchId: 'main',\n      currentEventIndex: 0,
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

  // Lanzador unificado del reproductor
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

  // Cargar explícitamente un proyecto en el Editor de trabajo
  const loadProjectToEditor = (projectToEdit: NovelProject, novelId?: string | null) => {
    setEditingProject(projectToEdit);
    const scenes = getProjectScenes(projectToEdit);
    setCurrentSceneId(scenes[0]?.id || '');
    setCurrentBranchId('main');
    setActiveLibraryNovelId(novelId ?? null);
  };

  // Playtest del borrador del editor
  const startPlaytest = (customInitialState?: PlayerGameState, fromStart = false) => {
    launchPlayer(editingProject, {
      isEditorPlaytest: true,
      canEdit: true,
      novelId: activeLibraryNovelId || editingProject.id,
      fromStart,
      customInitialState
    });
  };

  // Parseo dinámico de tokens: {player}, [player], (player) y {nombre_variable}
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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(editingProject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${editingProject.title || 'novela'}.json`);
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

  // Actualizador universal de escenas en el borrador
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

  const addTimelineEvent = (event: TimelineEvent) => {
    updateScenes(scenes => scenes.map(sc => {
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
    }));
  };

  const updateTimelineEvent = (index: number, event: TimelineEvent) => {
    updateScenes(scenes => scenes.map(sc => {
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
    }));
  };

  const deleteTimelineEvent = (index: number) => {
    updateScenes(scenes => scenes.map(sc => {
      if (sc.id === currentSceneId) {
        if (currentBranchId === 'main') {
          return { ...sc, timeline: sc.timeline.filter((_, i) => i !== index) };
        } else if (sc.branches && sc.branches[currentBranchId]) {
          const br = sc.branches[currentBranchId];
          return {
            ...sc,
            branches: {
              ...sc.branches,
              [currentBranchId]: {
                ...br,
                timeline: br.timeline.filter((_, i) => i !== index)
              }
            }
          };
        }
      }
      return sc;
    }));
  };

  const reorderTimelineEvents = (sourceIndex: number, destinationIndex: number) => {
    updateScenes(scenes => scenes.map(sc => {
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
    }));
  };

  const duplicateTimelineEventBase = (index: number) => {
    updateAquí tienes la refactorización integral y limpia de cada archivo afectado para resolver el problema de desacoplamiento entre el **Editor** y el **Reproductor (Player)**, implementando además el efecto *Typewriter* y el reemplazo dinámico de variables.

---

### 1. `src/types.ts`
Añadimos la interfaz `PlaySessionInfo` para controlar los permisos y el origen de la sesión de juego.

```typescript
export type MagneticSlot = 'far-left' | 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'far-right';
export type VerticalSlot = 'deep_sink' | 'sink' | 'floor' | 'ground' | 'elevated' | 'floating' | 'sky';
export type CharacterScale = 'small' | 'medium' | 'large' | 'closeup';
export type CharacterAnimation = 'none' | 'bounce' | 'shake' | 'slide_in' | 'fade_in';
export type ScreenEffect = 'none' | 'shake' | 'flash' | 'fade_black';

export type VariableOperation = 'set' | 'add' | 'subtract' | 'multiply' | 'divide' | 'toggle';

export interface BranchJumpCondition {
  variableName: string;
  operator: 'equals' | 'greater' | 'less' | 'not_equals';
  value: boolean | number | string;
}

export interface VariableCondition {
  variableName: string;
  operator: 'equals' | 'greater' | 'less' | 'not_equals';
  value: boolean | number | string;
}

export interface VariableChange {
  variableName: string;
  operation: VariableOperation;
  valueType: 'literal' | 'variable';
  value: boolean | number | string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  role?: 'admin' | 'moderator' | 'user' | string;
  createdAt?: number;
}

export interface StageCharacterInstance {
  characterId: string;
  expression: string;
  slot: MagneticSlot;
  verticalSlot: VerticalSlot;
  scale: CharacterScale;
  brightness: number;
  animation?: CharacterAnimation;
}

export interface ChoiceOption {
  id: string;
  text: string;
  jumpToBranchId?: string;
  jumpToEventIndex?: number;
  jumpToSceneId?: string;
  variableChanges?: VariableChange[];
  affinityChanges?: { characterId: string; amount: number }[];
}

export interface DialogueEvent {
  type: 'dialogue';
  id: string;
  speakerId: string;
  text: string;
  backgroundUrl?: string;
  bgmUrl?: string;
  sfxUrl?: string;
  charactersOnStage: StageCharacterInstance[];
  effect?: ScreenEffect;
  jumpToBranchId?: string;
  jumpToEventIndex?: number;
  jumpCondition?: BranchJumpCondition;
  condition?: VariableCondition;
}

export interface ChoiceEvent {
  type: 'choice';
  id: string;
  prompt: string;
  backgroundUrl?: string;
  bgmUrl?: string;
  sfxUrl?: string;
  options: ChoiceOption[];
  condition?: VariableCondition;
}

export type TimelineEvent = DialogueEvent | ChoiceEvent;

export interface Branch {
  id: string;
  name: string;
  timeline: TimelineEvent[];
}

export interface Scene {
  id: string;
  title: string;
  backgroundUrl: string;
  bgmUrl?: string;
  timeline: TimelineEvent[];
  branches?: Record<string, Branch>;
}

export interface Chapter {
  id: string;
  title: string;
  scenes: Scene[];
}

export interface CharacterRelation {
  targetCharacterId: string;
  relationType: string;
  isPublic?: boolean;
}

export interface Character {
  id: string;
  name: string;
  color: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
  hasAffinity: boolean;
  affinity: number;
  minAffinity: number;
  maxAffinity: number;
  showAffinityBar: boolean;
  customStats: Record<string, number>;
  relations: CharacterRelation[];
  expressions: Record<string, string>;
}

export interface CustomVariable {
  name: string;
  type: 'boolean' | 'number' | 'string';
  defaultValue: boolean | number | string;
  description?: string;
  isVisibleInHUD?: boolean;
}

export interface ProjectAudioItem {
  id: string;
  name: string;
  url: string;
  type: 'bgm' | 'sfx';
}

export interface NovelProject {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  allowCommunityEdit?: boolean;
  createdAt: number;
  updatedAt: number;
  askPlayerName?: boolean;
  defaultPlayerName?: string;
  backgroundGallery: { id: string; name: string; url: string }[];
  audioGallery?: ProjectAudioItem[];
  variables: Record<string, CustomVariable>;
  characters: Record<string, Character>;
  chapters: Chapter[];
}

export interface PlayerGameState {
  currentChapterId: string;
  currentSceneId: string;
  currentBranchId: string;
  currentEventIndex: number;
  playerName: string;
  runtimeVariables: Record<string, boolean | number | string>;
  runtimeCharacters: Record<string, Character>;
  history: string[];
  activeEffect?: ScreenEffect;
  currentBgmUrl?: string;
}

export interface SaveSlot {
  id: string;
  slotNumber: number;
  timestamp: number;
  previewBgUrl?: string;
  previewText?: string;
  sceneTitle?: string;
  chapterTitle?: string;
  state: PlayerGameState;
}

export interface LibraryNovelEntry {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  authorName?: string;
  authorId?: string;
  lastPlayedAt?: number;
  isOwner: boolean;
  allowEdit: boolean;
  project: NovelProject;
  saveSlots: Record<string, SaveSlot>;
}

export interface CommunityAsset {
  id: string;
  title: string;
  category: 'background' | 'character' | 'bgm' | 'sfx';
  tags?: string[];
  url: string;
  authorName: string;
  authorId: string;
  createdAt: number;
  isNsfw?: boolean;
}

export interface CommunityNovel {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  tags?: string[];
  isNsfw?: boolean;
  authorName: string;
  authorId: string;
  createdAt: number;
  projectData: NovelProject;
  allowCommunityEdit?: boolean;
}

export interface PlaySessionInfo {
  isEditorPlaytest: boolean;
  canEdit: boolean;
  novelId?: string;
  novelTitle?: string;
}
