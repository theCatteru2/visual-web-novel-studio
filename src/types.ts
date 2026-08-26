export type MagneticSlot = 'left' | 'center-left' | 'center' | 'center-right' | 'right';
export type VerticalSlot = 'sink' | 'floor' | 'ground' | 'elevated' | 'floating';
export type CharacterScale = 'small' | 'medium' | 'large' | 'closeup';
export type CharacterAnimation = 'none' | 'bounce' | 'shake' | 'fade_in' | 'slide_in';

export interface StageCharacterInstance {
  characterId: string;
  expression: string;
  slot: MagneticSlot;
  verticalSlot?: VerticalSlot;
  scale?: CharacterScale;
  brightness: number; // 0 = silueta negra, 50 = tenue/escuchando, 100 = iluminado/hablando
  animation?: CharacterAnimation;
}

export interface CharacterRelation {
  targetCharacterId: string;
  relationType: string;
  isPublic: boolean;
}

export interface Character {
  id: string;
  name: string;
  color: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
  expressions: Record<string, string>;
  hasAffinity: boolean;
  affinity: number;
  minAffinity: number;
  maxAffinity: number;
  showAffinityBar: boolean;
  customStats: Record<string, number>;
  relations: CharacterRelation[];
}

export type ScreenEffect = 'none' | 'shake' | 'flash' | 'fade_black';

export interface DialogueEvent {
  type: 'dialogue';
  id: string;
  speakerId: string; // Quién habla actualmente (o 'narrator')
  text: string;
  charactersOnStage: StageCharacterInstance[]; // Soporte multi-personaje simultáneo
  effect?: ScreenEffect;
  jumpToBranchId?: string;
}

export interface SceneChangeEvent {
  type: 'scene_change';
  id: string;
  backgroundUrl: string;
  title?: string;
}

export type VariableOperation = 'set' | 'add' | 'subtract' | 'multiply' | 'divide' | 'toggle';

export interface VariableChange {
  variableName: string;
  operation: VariableOperation;
  valueType: 'literal' | 'variable';
  value: boolean | number | string;
}

export interface ChoiceOption {
  id: string;
  text: string;
  affinityChanges?: { characterId: string; amount: number }[];
  variableChanges?: VariableChange[]; // Modificadores de variables detallados
  jumpToBranchId?: string;
  jumpToSceneId?: string;
}

export interface ChoiceEvent {
  type: 'choice';
  id: string;
  prompt: string;
  options: ChoiceOption[];
}

export interface ScriptEvent {
  type: 'script';
  id: string;
  code: string;
}

export type TimelineEvent = 
  | DialogueEvent 
  | SceneChangeEvent 
  | ChoiceEvent 
  | ScriptEvent;

export interface Branch {
  id: string;
  name: string;
  timeline: TimelineEvent[];
}

export interface Scene {
  id: string;
  title: string;
  backgroundUrl: string;
  timeline: TimelineEvent[];
  branches: Record<string, Branch>;
}

export interface Chapter {
  id: string;
  title: string;
  scenes: Scene[];
}

export interface CustomVariable {
  name: string;
  type: 'boolean' | 'number' | 'string';
  defaultValue: boolean | number | string;
  description?: string;
}

export interface NovelProject {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  backgroundGallery: { id: string; name: string; url: string }[];
  characters: Record<string, Character>;
  variables: Record<string, CustomVariable>;
  chapters: Chapter[];
  createdAt: number;
  updatedAt: number;
}

export interface PlayerGameState {
  currentChapterId: string;
  currentSceneId: string;
  currentBranchId: string;
  currentEventIndex: number;
  runtimeVariables: Record<string, boolean | number | string>;
  runtimeCharacters: Record<string, Character>;
  history: string[];
  activeEffect?: ScreenEffect;
}