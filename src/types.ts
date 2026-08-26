export type MagneticSlot = 'far-left' | 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'far-right';
export type VerticalSlot = 'deep_sink' | 'sink' | 'floor' | 'ground' | 'elevated' | 'floating' | 'sky';
export type CharacterScale = 'small' | 'medium' | 'large' | 'closeup';
export type CharacterAnimation = 'none' | 'bounce' | 'shake' | 'slide_in' | 'fade_in';
export type ScreenEffect = 'none' | 'shake' | 'flash' | 'fade_black';

export type VariableOperation = 'set' | 'add' | 'subtract' | 'multiply' | 'divide' | 'toggle';

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
  charactersOnStage: StageCharacterInstance[];
  effect?: ScreenEffect;
  jumpToBranchId?: string;
  jumpToEventIndex?: number;
  condition?: VariableCondition;
}

export interface ChoiceEvent {
  type: 'choice';
  id: string;
  prompt: string;
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
}

export interface NovelProject {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  backgroundGallery: { id: string; name: string; url: string }[];
  variables: Record<string, CustomVariable>;
  characters: Record<string, Character>;
  chapters: Chapter[];
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
