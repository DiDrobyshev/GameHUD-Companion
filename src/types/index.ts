export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  filePath?: string;
}

export type NoteTab = Note;

export interface NoteFileInfo {
  name: string;
  path: string;
  size_bytes: number;
  modified_ms: number;
}

export interface GameProfile {
  id: string;
  name: string;
  tabs: Note[];
  activeTabId: string;
  timerPresets?: TimerPreset[];
}

export interface TimerItem {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isFinished?: boolean;
}

export interface TimerPreset {
  id: string;
  label: string;
  seconds: number;
}

export type VideoSourceType = 'youtube' | 'twitch' | 'vk' | 'direct' | 'local';

export interface VideoItem {
  id: string;
  title: string;
  url: string;
  type: VideoSourceType;
  embedUrl?: string;
  thumbnail?: string;
}

export type AIProvider =
  | 'Gemini'
  | 'OpenRouter'
  | 'Кастомный OpenAI'
  | 'Gemini 2.5 Flash'
  | 'OpenRouter (Любая модель)'
  | 'Кастомный OpenAI-совместимый';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  modelName: string;
  customEndpoint?: string;
  webSearchEnabled: boolean;
  systemPrompt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  imageBase64?: string;
}

export interface AppConfig {
  firstRun?: boolean;
  activeProfile: string;
  mainOpacity: number;
  pipOpacity: number;
  pipVolume: number;
  hotkeys: {
    ghostModeMain: string;
    ghostModePip: string;
    bossKey: string;
    playPausePip: string;
    hoverTranslate?: string;
    snipperTool: string;
    quickSearch: string;
  };
  timerPresets: TimerPreset[];
  aiConfig?: AIConfig;
}

export interface HoverTranslateResult {
  original_text: string;
  translated_text: string;
  cursor_x: number;
  cursor_y: number;
}
