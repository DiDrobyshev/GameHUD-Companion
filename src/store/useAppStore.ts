import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import {
  Note,
  NoteTab,
  NoteFileInfo,
  GameProfile,
  TimerItem,
  TimerPreset,
  VideoItem,
  AppConfig,
  AIConfig,
  ChatMessage
} from '../types';
import { playTimerChime } from '../utils/audio';
import { autoCalculateExpressions } from '../utils/mathCalc';
import { sendAIMessage } from '../services/aiService';

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export interface AppState {
  // --- Notes Slice ---
  notes: Note[];
  activeNoteId: string;
  tabs: Note[];
  activeTabId: string;
  activeNoteContent: string;
  allNoteFiles: NoteFileInfo[];
  checkboxStats: { total: number; checked: number; percentage: number };
  isSavingNote: boolean;

  // Modern isolated Notes actions
  addNote: (title?: string) => Promise<void>;
  updateNoteContent: (id: string, content: string) => void;
  appendNoteContent: (textToAppend: string) => void;
  setActiveNoteId: (id: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  renameNote: (id: string, newTitle: string) => Promise<void>;

  // Backward compatibility methods
  setActiveTab: (id: string) => Promise<void>;
  updateContent: (content: string, triggerAutosave?: boolean) => void;
  addTab: (title?: string, filePath?: string) => Promise<void>;
  closeTab: (id: string) => Promise<void>;
  renameTab: (id: string, newTitle: string) => Promise<void>;
  reorderTabs: (newTabs: NoteTab[]) => void;
  toggleCheckboxInNote: (index: number) => void;
  resetAllCheckboxes: () => void;
  evaluateCalculations: () => void;
  loadNotesList: () => Promise<void>;
  saveCurrentNoteToDisk: () => Promise<void>;
  saveProfileState: () => Promise<void>;

  // --- AI Slice ---
  aiConfig: AIConfig;
  chatMessages: ChatMessage[];
  isAILoading: boolean;
  isAIDockExpanded: boolean;
  pendingScreenshot: string | null;
  setPendingScreenshot: (img: string | null) => void;
  captureScreenToAIDraft: () => Promise<void>;
  setAIConfig: (config: Partial<AIConfig>) => void;
  setAIDockExpanded: (expanded: boolean) => void;
  sendChatMessage: (content: string, imageBase64?: string) => Promise<void>;
  sendScreenshotToAI: (customPrompt?: string) => Promise<void>;
  clearChatHistory: () => void;

  // --- Timer Slice ---
  timers: TimerItem[];
  timerPresets: TimerPreset[];

  // Timer actions
  addTimer: (label: string, totalSeconds: number) => void;
  removeTimer: (id: string) => void;
  resetTimer: (id: string) => void;
  toggleTimer: (id: string) => void;
  tickTimers: () => void;
  quickAddPreset: (seconds: number, label: string) => void;
  addTimerPreset: (label: string, seconds: number) => Promise<void>;
  removeTimerPreset: (id: string) => Promise<void>;
  setTimersFromSync: (timers: TimerItem[]) => void;

  // --- PiP Slice ---
  pipQueue: VideoItem[];
  pipCurrentIndex: number;
  pipIsPlaying: boolean;
  pipVolume: number;
  pipIsGhost: boolean;
  pipIsBossHidden: boolean;

  // PiP actions
  enqueueVideo: (item: VideoItem) => void;
  enqueueVideos: (items: VideoItem[]) => void;
  removeFromQueue: (id: string) => void;
  nextVideo: () => void;
  prevVideo: () => void;
  playIndex: (index: number) => void;
  togglePipPlay: () => void;
  setPipVolume: (vol: number) => void;
  setPipGhost: (ghost: boolean) => Promise<void>;
  togglePipBossKey: () => Promise<void>;

  // --- Hub & Navigation Slice ---
  firstRun: boolean;
  currentSection: 'settings' | 'notes' | 'clipper' | 'timers' | 'pip' | 'translator';
  isTimerHudVisible: boolean;
  isPipHudVisible: boolean;
  setCurrentSection: (section: 'settings' | 'notes' | 'clipper' | 'timers' | 'pip' | 'translator') => void;
  setFirstRunCompleted: () => Promise<void>;
  toggleTimerHud: () => Promise<void>;
  togglePipHud: () => Promise<void>;
  triggerSnipper: () => Promise<void>;
  refreshWindowVisibility: () => Promise<void>;
  isFloatingBubble: boolean;
  setFloatingBubble: (enabled: boolean) => Promise<void>;
  toggleFloatingBubble: () => Promise<void>;

  // --- Config & Profile Slice ---
  activeProfile: string;
  availableProfiles: string[];
  mainOpacity: number;
  pipOpacity: number;
  isMainGhost: boolean;
  hotkeys: AppConfig['hotkeys'];

  // Config actions
  initApp: () => Promise<void>;
  setMainOpacity: (opacity: number) => void;
  setPipOpacity: (opacity: number) => void;
  setMainGhost: (ghost: boolean) => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  createProfile: (name: string) => Promise<void>;
  deleteProfile: (name: string) => Promise<void>;
  saveConfigToDisk: () => Promise<void>;
}

function calculateCheckboxes(content: string) {
  if (!content) return { total: 0, checked: 0, percentage: 0 };
  const totalMatches = content.match(/^[ \t]*[-*+]\s+\[[ xX]\]/gm) || [];
  const checkedMatches = content.match(/^[ \t]*[-*+]\s+\[[xX]\]/gm) || [];
  const total = totalMatches.length;
  const checked = checkedMatches.length;
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;
  return { total, checked, percentage };
}

export const useAppStore = create<AppState>((set, get) => ({
  // Notes initial state
  notes: [
    {
      id: 'note-1',
      title: 'Заметка 1',
      content: '# Новая заметка\n\n',
      createdAt: Date.now(),
      filePath: 'note_1.md',
    },
  ],
  activeNoteId: 'note-1',
  tabs: [
    {
      id: 'note-1',
      title: 'Заметка 1',
      content: '# Новая заметка\n\n',
      createdAt: Date.now(),
      filePath: 'note_1.md',
    },
  ],
  activeTabId: 'note-1',
  activeNoteContent: '# Новая заметка\n\n',
  allNoteFiles: [],
  checkboxStats: { total: 0, checked: 0, percentage: 0 },
  isSavingNote: false,

  // AI initial state
  aiConfig: {
    provider: 'Gemini 2.5 Flash',
    apiKey: '',
    modelName: 'gemini-2.5-flash',
    customEndpoint: '',
    webSearchEnabled: true,
  },
  chatMessages: [
    {
      id: 'ai-welcome',
      role: 'assistant',
      content: 'Привет! Я твой игровой ассистент. Задай вопрос по квесту, билду, дропу или вставь ссылку на вики.',
      timestamp: Date.now(),
    },
  ],
  isAILoading: false,
  isAIDockExpanded: false,

  setAIConfig: (patch) => {
    const updated = { ...get().aiConfig, ...patch };
    set({ aiConfig: updated });
    get().saveConfigToDisk();
  },

  setAIDockExpanded: (expanded) => {
    set({ isAIDockExpanded: expanded });
  },

  sendChatMessage: async (prompt: string, imageBase64?: string) => {
    if (!prompt.trim()) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
      imageBase64,
    };

    const prevMessages = get().chatMessages;
    set({
      chatMessages: [...prevMessages, userMsg],
      isAILoading: true,
      isAIDockExpanded: true,
    });

    try {
      const replyText = await sendAIMessage(prompt.trim(), prevMessages, get().aiConfig, imageBase64);
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: Date.now(),
      };
      set({
        chatMessages: [...get().chatMessages, assistantMsg],
        isAILoading: false,
      });
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${err?.message || String(err)}`,
        timestamp: Date.now(),
      };
      set({
        chatMessages: [...get().chatMessages, errorMsg],
        isAILoading: false,
      });
    }
  },

  pendingScreenshot: null,
  setPendingScreenshot: (img: string | null) => set({ pendingScreenshot: img }),

  captureScreenToAIDraft: async () => {
    try {
      const bytes = await invoke<number[]>('capture_screen_full');
      if (!bytes || bytes.length === 0) return;
      let binary = '';
      const len = bytes.length;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = window.btoa(binary);
      const fullUrl = `data:image/png;base64,${base64}`;
      set({
        pendingScreenshot: fullUrl,
        isAIDockExpanded: true,
        currentSection: 'notes',
      });
    } catch (err) {
      console.error('Failed to capture screen to AI draft:', err);
    }
  },

  sendScreenshotToAI: async (customPrompt?: string) => {
    set({ isAILoading: true, isAIDockExpanded: true });
    try {
      const bytes = await invoke<number[]>('capture_screen_full');
      if (!bytes || bytes.length === 0) {
        throw new Error('Не удалось захватить экран.');
      }
      let binary = '';
      const len = bytes.length;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = window.btoa(binary);

      const promptText =
        customPrompt ||
        'Переведи текст с этого скриншота на русский язык подробно и понятно для игрока:';

      await get().sendChatMessage(promptText, base64);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Ошибка захвата экрана для AI: ${err?.message || String(err)}`,
        timestamp: Date.now(),
      };
      set({
        chatMessages: [...get().chatMessages, errorMsg],
        isAILoading: false,
      });
    }
  },

  clearChatHistory: () => {
    set({
      chatMessages: [
        {
          id: `ai-init-${Date.now()}`,
          role: 'assistant',
          content: 'История очищена. Чем могу помочь?',
          timestamp: Date.now(),
        },
      ],
    });
  },

  appendNoteContent: (textToAppend: string) => {
    const { activeNoteId, notes, updateNoteContent } = get();
    const activeNote = notes.find((n) => n.id === activeNoteId);
    if (activeNote) {
      const separator = activeNote.content && !activeNote.content.endsWith('\n') ? '\n\n' : '\n';
      updateNoteContent(activeNote.id, activeNote.content + separator + textToAppend);
    }
  },

  // Timers initial state - strictly empty initially (no mock timers, player configures them)
  timers: [],
  timerPresets: [],

  // PiP initial state - strictly empty initially (no standard video)
  pipQueue: [],
  pipCurrentIndex: 0,
  pipIsPlaying: false,
  pipVolume: 80,
  pipIsGhost: false,
  pipIsBossHidden: false,

  // Hub & Navigation initial state
  firstRun: false,
  currentSection: 'notes',
  isTimerHudVisible: false,
  isPipHudVisible: false,

  setCurrentSection: (section) => set({ currentSection: section }),

  setFirstRunCompleted: async () => {
    set({ firstRun: false });
    await get().saveConfigToDisk();
  },

  refreshWindowVisibility: async () => {
    const isTimer = await invoke<boolean>('is_window_visible', { windowLabel: 'timer-hud' }).catch(() => false);
    const isPip = await invoke<boolean>('is_window_visible', { windowLabel: 'pip-hud' }).catch(() => false);
    set({ isTimerHudVisible: isTimer, isPipHudVisible: isPip });
  },

  toggleTimerHud: async () => {
    const newState = await invoke<boolean>('toggle_window', { windowLabel: 'timer-hud' }).catch(() => false);
    set({ isTimerHudVisible: newState });
  },

  togglePipHud: async () => {
    const newState = await invoke<boolean>('toggle_window', { windowLabel: 'pip-hud' }).catch(() => false);
    set({ isPipHudVisible: newState });
  },

  triggerSnipper: async () => {
    await invoke('show_window', { windowLabel: 'snipper' }).catch(() => {});
  },

  isFloatingBubble: false,
  setFloatingBubble: async (enabled: boolean) => {
    try {
      await invoke('set_bubble_mode', { enable: enabled });
      set({ isFloatingBubble: enabled });
    } catch (err) {
      console.error('Failed to set bubble mode:', err);
    }
  },
  toggleFloatingBubble: async () => {
    try {
      const res = await invoke<boolean>('toggle_bubble_mode');
      set({ isFloatingBubble: res });
    } catch (err) {
      console.error('Failed to toggle bubble mode:', err);
    }
  },

  // Config initial state
  activeProfile: 'default',
  availableProfiles: ['default'],
  mainOpacity: 92,
  pipOpacity: 100,
  isMainGhost: false,
  hotkeys: {
    ghostModeMain: 'Alt+G',
    ghostModePip: 'Alt+L',
    bossKey: 'Alt+H',
    playPausePip: 'Alt+P',
    hoverTranslate: 'Alt+T',
    snipperTool: 'Alt+S',
    quickSearch: 'Ctrl+Space',
    toggleFloatingBubble: 'Alt+B',
  },

  // --- Initializer ---
  initApp: async () => {
    try {
      // 1. Load config
      const configStr = await invoke<string>('load_config').catch(() => '{}');
      const config: Partial<AppConfig> = JSON.parse(configStr || '{}');

      const isFirstRun = config.firstRun === true;
      set({
        firstRun: isFirstRun,
        currentSection: 'notes',
      });

      if (config.mainOpacity !== undefined) set({ mainOpacity: config.mainOpacity });
      if (config.pipOpacity !== undefined) set({ pipOpacity: config.pipOpacity });
      if (config.pipVolume !== undefined) set({ pipVolume: config.pipVolume });
      if (config.hotkeys) set({ hotkeys: { ...get().hotkeys, ...config.hotkeys } });
      if (config.timerPresets !== undefined) {
        set({ timerPresets: config.timerPresets });
      }

      // Purge any legacy leaked API key from Webview2 localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('gamehud_ai_key');
        } catch {}
      }

      if (config.aiConfig) {
        set({
          aiConfig: {
            ...get().aiConfig,
            ...config.aiConfig,
            apiKey: config.aiConfig.apiKey || '',
          },
        });
      }

      // 2. Load profiles
      const profileNames = await invoke<string[]>('list_profiles').catch(() => ['default']);
      set({ availableProfiles: profileNames.length > 0 ? profileNames : ['default'] });

      const targetProfile = config.activeProfile || profileNames[0] || 'default';
      await get().switchProfile(targetProfile);
      await get().loadNotesList();
      await get().refreshWindowVisibility();

      // 3. Listen to timer sync events across windows
      await listen<TimerItem[]>('timer-sync', (event) => {
        set({ timers: event.payload });
      });

      // 4. Listen to PiP sync events
      await listen<{
        queue?: VideoItem[];
        currentIndex?: number;
        isPlaying?: boolean;
        isGhost?: boolean;
        volume?: number;
        opacity?: number;
      }>('pip-sync', (event) => {
        const p = event.payload;
        if (p.queue !== undefined) set({ pipQueue: p.queue });
        if (p.currentIndex !== undefined) set({ pipCurrentIndex: p.currentIndex });
        if (p.isPlaying !== undefined) set({ pipIsPlaying: p.isPlaying });
        if (p.isGhost !== undefined) set({ pipIsGhost: p.isGhost });
        if (p.volume !== undefined) set({ pipVolume: p.volume });
        if (p.opacity !== undefined) set({ pipOpacity: p.opacity });
      });

      // 5. Listen to ghost mode sync from Rust OS shortcuts
      await listen<boolean>('main-ghost-sync', (event) => {
        set({ isMainGhost: event.payload });
      });
      await listen<boolean>('pip-ghost-sync', (event) => {
        set({ pipIsGhost: event.payload });
      });

      // 6. Listen for request for PiP state from secondary windows
      await listen('pip-request-sync', () => {
        const s = get();
        emit('pip-sync', {
          queue: s.pipQueue,
          currentIndex: s.pipCurrentIndex,
          isPlaying: s.pipIsPlaying,
          volume: s.pipVolume,
          isGhost: s.pipIsGhost,
          opacity: s.pipOpacity,
        }).catch(() => {});
      });

      // 7. Listen to toggle-pip-playback from Rust shortcut
      await listen('toggle-pip-playback', () => {
        get().togglePipPlay();
      });

      // 8. Listen to open-settings from tray
      await listen('open-settings', () => {
        set({ currentSection: 'settings' });
      });

      // 9. Listen to floating bubble sync from Rust
      await listen<boolean>('floating-bubble-sync', (event) => {
        set({ isFloatingBubble: !!event.payload });
      });

      // 10. Listen to global screen capture to AI draft (Alt+S)
      await listen('global-screen-to-ai', () => {
        get().captureScreenToAIDraft();
      });
    } catch (err) {
      console.error('Failed to init app state:', err);
    }
  },

  // --- Isolated Notes Actions ---
  addNote: async (title?: string) => {
    const state = get();
    const newId = Date.now().toString();
    const defaultTitle = title || `Заметка ${state.notes.length + 1}`;
    const safeFilename = `${defaultTitle.replace(/[\\/:*?"<>|]/g, '_')}.md`;

    const newNote: Note = {
      id: newId,
      title: defaultTitle,
      content: '',
      createdAt: Date.now(),
      filePath: safeFilename,
    };

    const newNotes = [...state.notes, newNote];
    set({
      notes: newNotes,
      activeNoteId: newId,
      tabs: newNotes,
      activeTabId: newId,
      activeNoteContent: '',
      checkboxStats: { total: 0, checked: 0, percentage: 0 },
    });

    // Save initial empty file
    await invoke('save_note_file', { path: safeFilename, content: '' }).catch(() => {});
    await get().saveProfileState();
    await get().loadNotesList();
  },

  updateNoteContent: (id: string, content: string) => {
    const stats = calculateCheckboxes(content);
    set((state) => {
      const updatedNotes = state.notes.map((note) =>
        note.id === id ? { ...note, content } : note
      );
      return {
        notes: updatedNotes,
        tabs: updatedNotes,
        activeNoteContent: state.activeNoteId === id ? content : state.activeNoteContent,
        checkboxStats: state.activeNoteId === id ? stats : state.checkboxStats,
      };
    });

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      get().saveCurrentNoteToDisk();
    }, 300);
  },

  setActiveNoteId: async (id: string) => {
    const { notes } = get();
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    set({
      activeNoteId: id,
      activeTabId: id,
      activeNoteContent: note.content,
      checkboxStats: calculateCheckboxes(note.content),
    });

    await get().saveProfileState();
  },

  deleteNote: async (id: string) => {
    const { notes, activeNoteId } = get();
    if (notes.length <= 1) return; // Keep at least one note

    const updatedNotes = notes.filter((n) => n.id !== id);
    const nextActiveId = activeNoteId === id ? updatedNotes[0].id : activeNoteId;
    const nextNote = updatedNotes.find((n) => n.id === nextActiveId);

    set({
      notes: updatedNotes,
      tabs: updatedNotes,
      activeNoteId: nextActiveId,
      activeTabId: nextActiveId,
      activeNoteContent: nextNote?.content || '',
      checkboxStats: calculateCheckboxes(nextNote?.content || ''),
    });

    await get().saveProfileState();
  },

  renameNote: async (id: string, newTitle: string) => {
    const { notes } = get();
    const updatedNotes = notes.map((n) => (n.id === id ? { ...n, title: newTitle } : n));
    set({ notes: updatedNotes, tabs: updatedNotes });
    await get().saveProfileState();
  },

  saveProfileState: async () => {
    const { activeProfile, notes, activeNoteId } = get();
    const profile: GameProfile = {
      id: activeProfile,
      name: activeProfile,
      tabs: notes,
      activeTabId: activeNoteId,
    };
    await invoke('save_profile', {
      name: activeProfile,
      profileJson: JSON.stringify(profile, null, 2),
    }).catch(() => {});
  },

  // Backward compatibility methods
  setActiveTab: async (id: string) => {
    await get().setActiveNoteId(id);
  },

  updateContent: (content: string) => {
    const { activeNoteId } = get();
    if (activeNoteId) {
      get().updateNoteContent(activeNoteId, content);
    }
  },

  addTab: async (title?: string, filePath?: string) => {
    await get().addNote(title);
    if (filePath) {
      const { activeNoteId, notes } = get();
      const updatedNotes = notes.map((n) => (n.id === activeNoteId ? { ...n, filePath } : n));
      set({ notes: updatedNotes, tabs: updatedNotes });
    }
  },

  closeTab: async (id: string) => {
    await get().deleteNote(id);
  },

  renameTab: async (id: string, newTitle: string) => {
    await get().renameNote(id, newTitle);
  },

  reorderTabs: async (newTabs: NoteTab[]) => {
    set({ notes: newTabs, tabs: newTabs });
    await get().saveProfileState();
  },

  saveCurrentNoteToDisk: async () => {
    const { notes, activeNoteId } = get();
    const currentNote = notes.find((n) => n.id === activeNoteId);
    if (!currentNote || !currentNote.filePath) return;

    set({ isSavingNote: true });
    try {
      await invoke('save_note_file', {
        path: currentNote.filePath,
        content: currentNote.content,
      });
      await get().loadNotesList();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      set({ isSavingNote: false });
    }
  },

  toggleCheckboxInNote: (targetIndex: number) => {
    const { notes, activeNoteId } = get();
    const currentNote = notes.find((n) => n.id === activeNoteId);
    if (!currentNote) return;

    let currentIndex = 0;
    const regex = /^([ \t]*[-*+]\s+\[)([ xX])(\])/gm;

    const newContent = currentNote.content.replace(regex, (match, prefix, checkState, suffix) => {
      if (currentIndex === targetIndex) {
        currentIndex++;
        const nextState = checkState === ' ' ? 'x' : ' ';
        return `${prefix}${nextState}${suffix}`;
      }
      currentIndex++;
      return match;
    });

    get().updateNoteContent(activeNoteId, newContent);
  },

  resetAllCheckboxes: () => {
    const { notes, activeNoteId } = get();
    const currentNote = notes.find((n) => n.id === activeNoteId);
    if (!currentNote) return;

    const newContent = currentNote.content.replace(
      /^([ \t]*[-*+]\s+\[)[xX](\])/gm,
      '$1 $2'
    );
    get().updateNoteContent(activeNoteId, newContent);
  },

  evaluateCalculations: () => {
    const { notes, activeNoteId } = get();
    const currentNote = notes.find((n) => n.id === activeNoteId);
    if (!currentNote) return;

    const { newText, replaced } = autoCalculateExpressions(currentNote.content);
    if (replaced) {
      get().updateNoteContent(activeNoteId, newText);
    }
  },

  loadNotesList: async () => {
    try {
      const files = await invoke<NoteFileInfo[]>('read_notes_directory');
      set({ allNoteFiles: files });
    } catch (err) {
      console.error('Failed to load notes files list:', err);
    }
  },

  // --- Timer Actions ---
  addTimer: (label: string, totalSeconds: number) => {
    const newTimer: TimerItem = {
      id: `timer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: label.trim() || 'Таймер',
      totalSeconds,
      remainingSeconds: totalSeconds,
      isRunning: true,
      isFinished: false,
    };
    const newTimers = [...get().timers, newTimer];
    set({ timers: newTimers });
    emit('timer-sync', newTimers).catch(() => {});
  },

  removeTimer: (id: string) => {
    const newTimers = get().timers.filter((t) => t.id !== id);
    set({ timers: newTimers });
    emit('timer-sync', newTimers).catch(() => {});
  },

  resetTimer: (id: string) => {
    const newTimers = get().timers.map((t) =>
      t.id === id ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false, isFinished: false } : t
    );
    set({ timers: newTimers });
    emit('timer-sync', newTimers).catch(() => {});
  },

  toggleTimer: (id: string) => {
    const newTimers = get().timers.map((t) =>
      t.id === id ? { ...t, isRunning: !t.isRunning } : t
    );
    set({ timers: newTimers });
    emit('timer-sync', newTimers).catch(() => {});
  },

  tickTimers: () => {
    const { timers } = get();
    let hasChanges = false;
    let chimesTriggered = false;

    const updated = timers.map((t) => {
      if (!t.isRunning || t.remainingSeconds <= 0) return t;

      hasChanges = true;
      const nextRemaining = t.remainingSeconds - 1;
      const isNowFinished = nextRemaining <= 0;

      if (isNowFinished && !t.isFinished) {
        chimesTriggered = true;
      }

      return {
        ...t,
        remainingSeconds: nextRemaining,
        isRunning: !isNowFinished,
        isFinished: isNowFinished,
      };
    });

    if (hasChanges) {
      set({ timers: updated });
      emit('timer-sync', updated).catch(() => {});
    }

    if (chimesTriggered) {
      playTimerChime();
    }
  },

  quickAddPreset: (seconds: number, label: string) => {
    get().addTimer(label, seconds);
  },

  addTimerPreset: async (label: string, seconds: number) => {
    const newPreset: TimerPreset = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: label.trim() || 'Пресет',
      seconds,
    };
    const updated = [...get().timerPresets, newPreset];
    set({ timerPresets: updated });
    await get().saveConfigToDisk();
  },

  removeTimerPreset: async (id: string) => {
    const updated = get().timerPresets.filter((p) => p.id !== id);
    set({ timerPresets: updated });
    await get().saveConfigToDisk();
  },

  setTimersFromSync: (timers: TimerItem[]) => {
    set({ timers });
  },

  // --- PiP Actions ---
  enqueueVideo: (item: VideoItem) => {
    const prevQueue = get().pipQueue;
    const newQueue = [...prevQueue, item];
    const shouldPlay = prevQueue.length === 0;
    const nextIdx = shouldPlay ? 0 : get().pipCurrentIndex;
    const nextPlaying = shouldPlay ? true : get().pipIsPlaying;
    set({
      pipQueue: newQueue,
      pipIsPlaying: nextPlaying,
      pipCurrentIndex: nextIdx,
    });
    emit('pip-sync', {
      queue: newQueue,
      currentIndex: nextIdx,
      isPlaying: nextPlaying,
    }).catch(() => {});
  },

  enqueueVideos: (items: VideoItem[]) => {
    const prevQueue = get().pipQueue;
    const newQueue = [...prevQueue, ...items];
    const shouldPlay = prevQueue.length === 0 && newQueue.length > 0;
    const nextIdx = shouldPlay ? 0 : get().pipCurrentIndex;
    const nextPlaying = shouldPlay ? true : get().pipIsPlaying;
    set({
      pipQueue: newQueue,
      pipIsPlaying: nextPlaying,
      pipCurrentIndex: nextIdx,
    });
    emit('pip-sync', {
      queue: newQueue,
      currentIndex: nextIdx,
      isPlaying: nextPlaying,
    }).catch(() => {});
  },

  removeFromQueue: (id: string) => {
    const { pipQueue, pipCurrentIndex } = get();
    const newQueue = pipQueue.filter((v) => v.id !== id);
    let nextIndex = pipCurrentIndex;
    if (nextIndex >= newQueue.length) {
      nextIndex = Math.max(0, newQueue.length - 1);
    }
    set({ pipQueue: newQueue, pipCurrentIndex: nextIndex });
    emit('pip-sync', {
      queue: newQueue,
      currentIndex: nextIndex,
    }).catch(() => {});
  },

  nextVideo: () => {
    const { pipQueue, pipCurrentIndex } = get();
    if (pipQueue.length === 0) return;
    const nextIdx = (pipCurrentIndex + 1) % pipQueue.length;
    set({ pipCurrentIndex: nextIdx, pipIsPlaying: true });
    emit('pip-sync', {
      currentIndex: nextIdx,
      isPlaying: true,
    }).catch(() => {});
  },

  prevVideo: () => {
    const { pipQueue, pipCurrentIndex } = get();
    if (pipQueue.length === 0) return;
    const prevIdx = (pipCurrentIndex - 1 + pipQueue.length) % pipQueue.length;
    set({ pipCurrentIndex: prevIdx, pipIsPlaying: true });
    emit('pip-sync', {
      currentIndex: prevIdx,
      isPlaying: true,
    }).catch(() => {});
  },

  playIndex: (index: number) => {
    set({ pipCurrentIndex: index, pipIsPlaying: true });
    emit('pip-sync', {
      currentIndex: index,
      isPlaying: true,
    }).catch(() => {});
  },

  togglePipPlay: () => {
    const newState = !get().pipIsPlaying;
    set({ pipIsPlaying: newState });
    emit('pip-sync', { isPlaying: newState }).catch(() => {});
  },

  setPipVolume: (vol: number) => {
    const clamped = Math.max(0, Math.min(100, vol));
    set({ pipVolume: clamped });
    emit('pip-sync', { volume: clamped }).catch(() => {});
  },

  setPipGhost: async (ghost: boolean) => {
    set({ pipIsGhost: ghost });
    await invoke('set_ghost_mode', { windowLabel: 'pip-hud', enable: ghost }).catch(() => {});
  },

  togglePipBossKey: async () => {
    const isHidden = !get().pipIsBossHidden;
    set({ pipIsBossHidden: isHidden });
    if (isHidden) {
      await invoke('hide_window', { windowLabel: 'pip-hud' }).catch(() => {});
    } else {
      await invoke('show_window', { windowLabel: 'pip-hud' }).catch(() => {});
    }
  },

  // --- Config & Profile Actions ---
  setMainOpacity: (opacity: number) => {
    const clamped = Math.max(10, Math.min(100, Math.round(opacity)));
    set({ mainOpacity: clamped });
    get().saveConfigToDisk();
  },

  setPipOpacity: (opacity: number) => {
    const clamped = Math.max(10, Math.min(100, Math.round(opacity)));
    set({ pipOpacity: clamped });
    emit('pip-sync', { opacity: clamped }).catch(() => {});
    get().saveConfigToDisk();
  },

  setMainGhost: async (ghost: boolean) => {
    set({ isMainGhost: ghost });
    await invoke('set_ghost_mode', { windowLabel: 'main', enable: ghost }).catch(() => {});
  },

  switchProfile: async (profileId: string) => {
    try {
      const profileStr = await invoke<string>('load_profile', { name: profileId }).catch(() => '{}');
      let profile: GameProfile;
      try {
        profile = JSON.parse(profileStr);
      } catch {
        profile = {
          id: profileId,
          name: profileId,
          tabs: [
            {
              id: `note-${profileId}-1`,
              title: 'Гайд',
              content: '',
              createdAt: Date.now(),
              filePath: `${profileId}_notes.md`,
            },
          ],
          activeTabId: `note-${profileId}-1`,
        };
      }

      if (!profile.tabs || profile.tabs.length === 0) {
        profile.tabs = [
          {
            id: `note-${profileId}-1`,
            title: 'Гайд',
            content: '',
            createdAt: Date.now(),
            filePath: `${profileId}_notes.md`,
          },
        ];
        profile.activeTabId = `note-${profileId}-1`;
      }

      const loadedNotes: Note[] = await Promise.all(
        profile.tabs.map(async (t, idx) => {
          const filePath = t.filePath || `${profileId}_note_${idx + 1}.md`;
          let content = t.content || '';
          try {
            const fileContent = await invoke<string>('read_note_file', { path: filePath });
            if (fileContent !== undefined && fileContent !== null) {
              content = fileContent;
            }
          } catch {
            if (!content) {
              content = `# ${t.title || 'Заметка'}\n\n- [ ] Задача 1\n`;
              await invoke('save_note_file', { path: filePath, content }).catch(() => {});
            }
          }
          return {
            id: t.id || `note-${Date.now()}-${idx}`,
            title: t.title || `Заметка ${idx + 1}`,
            content,
            createdAt: t.createdAt || Date.now(),
            filePath,
          };
        })
      );

      const activeId =
        profile.activeTabId && loadedNotes.some((n) => n.id === profile.activeTabId)
          ? profile.activeTabId
          : loadedNotes[0].id;
      const activeNote = loadedNotes.find((n) => n.id === activeId) || loadedNotes[0];

      set({
        activeProfile: profileId,
        notes: loadedNotes,
        tabs: loadedNotes,
        activeNoteId: activeId,
        activeTabId: activeId,
        activeNoteContent: activeNote?.content || '',
        checkboxStats: calculateCheckboxes(activeNote?.content || ''),
      });

      await get().saveConfigToDisk();
    } catch (err) {
      console.error('Failed to switch profile:', err);
    }
  },

  createProfile: async (name: string) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newNoteId = Date.now().toString();
    const newProfile: GameProfile = {
      id,
      name,
      tabs: [
        {
          id: newNoteId,
          title: 'Гайд',
          content: '',
          createdAt: Date.now(),
          filePath: `${id}_notes.md`,
        },
      ],
      activeTabId: newNoteId,
    };

    await invoke('save_profile', { name: id, profileJson: JSON.stringify(newProfile, null, 2) });
    const profileNames = await invoke<string[]>('list_profiles').catch(() => []);
    set({ availableProfiles: profileNames });
    await get().switchProfile(id);
  },

  deleteProfile: async (name: string) => {
    if (name === 'default') return;
    try {
      await invoke('delete_profile', { name });
      const profileNames = await invoke<string[]>('list_profiles').catch(() => ['default']);
      const updatedProfiles = profileNames.length > 0 ? profileNames : ['default'];
      set({ availableProfiles: updatedProfiles });
      if (get().activeProfile === name) {
        await get().switchProfile(updatedProfiles[0] || 'default');
      }
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
  },

  saveConfigToDisk: async () => {
    const { firstRun, activeProfile, mainOpacity, pipOpacity, pipVolume, hotkeys, timerPresets, aiConfig } = get();
    const config: AppConfig = {
      firstRun,
      activeProfile,
      mainOpacity,
      pipOpacity,
      pipVolume,
      hotkeys,
      timerPresets,
      aiConfig,
    };
    await invoke('save_config', { configJson: JSON.stringify(config, null, 2) }).catch(() => {});
  },
}));
