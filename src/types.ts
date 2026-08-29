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
  bio?: string;
  followersCount?: number;
  followingCount?: number;
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
  jumpToMenuId?: string; // Salto hacia un Menú o Pantalla Final
  variableChanges?: VariableChange[];
  affinityChanges?: { characterId: string; amount: number }[];
}

export interface DialogueEvent {
  type: 'dialogue';
  id: string;
  speakerId: string; // ID de personaje, 'narrator' o 'none' (texto puro)
  text: string;
  backgroundUrl?: string;
  bgmUrl?: string;
  sfxUrl?: string;
  charactersOnStage: StageCharacterInstance[];
  effect?: ScreenEffect;
  jumpToBranchId?: string;
  jumpToEventIndex?: number;
  jumpToMenuId?: string; // Salto condicional hacia un Menú o Pantalla Final
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

// -------------------------------------------------------------
// Tipos para Menús Personalizados y Pantallas Finales
// -------------------------------------------------------------
export type MenuElementType = 'text' | 'button' | 'card';
export type MenuElementStyle = 'primary' | 'secondary' | 'danger' | 'glass' | 'title' | 'subtitle';

export interface MenuElementAction {
  type: 'jump_to_scene' | 'jump_to_menu' | 'open_save_load' | 'start_game' | 'restart';
  targetSceneId?: string;
  targetBranchId?: string;
  targetEventIndex?: number;
  targetMenuId?: string;
  variableChanges?: VariableChange[];
}

export interface MenuElement {
  id: string;
  type: MenuElementType;
  text: string;
  slotX?: MagneticSlot;
  verticalSlot?: VerticalSlot;
  x?: number;
  y?: number;
  styleVariant?: MenuElementStyle;
  customTextColor?: string;
  customBgColor?: string;
  customBgImage?: string;
  variableChanges?: VariableChange[];
  action?: {
    type: 'start_game' | 'jump_to_scene' | 'jump_to_menu' | 'open_save_load' | 'restart';
    targetSceneId?: string;
    targetMenuId?: string;
  };
}

export interface MenuScreen {
  id: string;
  title: string;
  type: 'start_menu' | 'end_screen' | 'custom_menu';
  backgroundUrl: string;
  bgmUrl?: string;
  elements: MenuElement[];
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
  startScreenType?: 'scene' | 'menu';
  startMenuId?: string;
  customScreens?: Record<string, MenuScreen>;
}

export interface PlayerGameState {
  currentChapterId: string;
  currentSceneId: string;
  currentBranchId: string;
  currentEventIndex: number;
  currentMenuId?: string | null; // ID del menú activo en ejecución
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
