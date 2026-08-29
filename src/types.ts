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
  bgmUrl?: string; // URL/Base64 del BGM o 'stop' para apagar
  sfxUrl?: string; // Disparo único al entrar a la viñeta
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

// Metadatos de la sesión de juego activa en el reproductor
export interface PlaySessionInfo {
  isEditorPlaytest: boolean;
  canEdit: boolean;
  novelId?: string;
  novelTitle?: string;
}
