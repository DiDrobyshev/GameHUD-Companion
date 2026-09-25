import React, { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Plus,
  Minus,
  X,
  Lock,
  Unlock,
  Tv,
  Timer,
  Settings,
  FileText,
  Check,
  Languages
} from 'lucide-react';

import { useAppStore } from './store/useAppStore';
import { TimerHudWindow } from './windows/TimerHudWindow';
import { PipHudWindow } from './windows/PipHudWindow';
import { SnipperWindow } from './windows/SnipperWindow';
import { PiPView } from './components/PiPView';
import { SettingsView } from './components/SettingsView';
import { TimersView } from './components/TimersView';
import { TranslatorView } from './components/TranslatorView';
import { WebClipperView } from './components/WebClipperView';
import { AIDock } from './components/AIDock';
import { NotepadEditor } from './components/NotepadEditor';

export function App() {
  const {
    initApp,
    notes,
    activeNoteId,
    setActiveNoteId,
    addNote,
    deleteNote,
    updateNoteContent,
    isSavingNote,
    timers,
    tickTimers,
    isMainGhost,
    setMainGhost,
    mainOpacity,
    activeProfile,
    triggerSnipper,
    currentSection,
    setCurrentSection,
  } = useAppStore();

  // Find active note directly from Zustand
  const activeNote = notes.find((n) => n.id === activeNoteId);

  // Handle secondary windows routing
  const searchParams = new URLSearchParams(window.location.search);
  const windowLabel = searchParams.get('window');

  if (windowLabel === 'timer-hud') return <TimerHudWindow />;
  if (windowLabel === 'pip-hud') return <PipHudWindow />;
  if (windowLabel === 'snipper') return <SnipperWindow />;

  // Initialize app
  useEffect(() => {
    initApp();
  }, [initApp]);

  // Tick timers once every second
  useEffect(() => {
    const interval = setInterval(() => {
      tickTimers();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickTimers]);

  // Global window hotkeys (local listener)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+G or Alt+L: Ghost Mode (click-through)
      if (e.altKey && (e.code === 'KeyG' || e.code === 'KeyL')) {
        e.preventDefault();
        setMainGhost(!isMainGhost);
      }
      // Alt+S: Screen OCR capture (snipper)
      if (e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        triggerSnipper();
      }
      // Alt+P: Toggle Video / PiP section
      if (e.altKey && e.code === 'KeyP') {
        e.preventDefault();
        setCurrentSection(currentSection === 'pip' ? 'notes' : 'pip');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMainGhost, setMainGhost, triggerSnipper, currentSection, setCurrentSection]);

  // Minimize window
  const handleMinimize = async () => {
    try {
      await invoke('minimize_window');
    } catch (err) {
      console.error('Failed to minimize window:', err);
    }
  };

  // Close to tray
  const handleClose = async () => {
    try {
      await invoke('hide_window', { windowLabel: 'main' });
    } catch (err) {
      console.error('Failed to hide window to tray:', err);
    }
  };

  // Toggle Ghost mode
  const handleToggleGhost = async () => {
    await setMainGhost(!isMainGhost);
  };

  // Add new note handler
  const handleNewNote = async () => {
    if (currentSection !== 'notes') {
      setCurrentSection('notes');
    }
    await addNote();
  };

  // Format seconds to mm:ss
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Find active running timer if any
  const activeTimer = timers.find((t) => t.isRunning && t.remainingSeconds > 0);

  // Drag handler for window header
  const handleHeaderMouseDown = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('.no-drag') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea')
    ) {
      return;
    }
    try {
      await invoke('start_dragging');
    } catch (err) {
      console.error('Failed to start dragging window:', err);
    }
  };

  return (
    <div className="h-screen w-screen p-2 overflow-hidden bg-transparent select-none box-border">
      {/* 1. Industrial Cyberpunk / Tactical HUD Window Container (Full window opacity) */}
      <div
        style={{
          opacity: mainOpacity / 100,
        }}
        className="bg-[#0b0c0e]/95 backdrop-blur-xl border border-zinc-800/80 rounded-xl shadow-2xl text-zinc-100 flex flex-col h-full overflow-hidden transition-opacity"
      >
        
        {/* A. Top Header / Tabs Bar */}
        <header
          data-tauri-drag-region
          onMouseDown={handleHeaderMouseDown}
          className="h-11 border-b border-zinc-800/80 px-3 flex items-center justify-between bg-[#101217]/90 shrink-0 select-none cursor-move"
        >
          {/* Left: Note Tabs List + New Tab Button */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[45%] no-drag">
            {notes.map((n) => {
              const isTabActive = n.id === activeNoteId && currentSection === 'notes';
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setCurrentSection('notes');
                    setActiveNoteId(n.id);
                  }}
                  className={`no-drag group px-3 py-1.5 text-xs rounded-t-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border-b-2 ${
                    isTabActive
                      ? 'bg-[#161820] text-amber-400 border-amber-400 font-semibold shadow-sm'
                      : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-transparent'
                  }`}
                >
                  <FileText className="w-3 h-3 text-amber-400/80 pointer-events-none" />
                  <span className="truncate max-w-[110px] pointer-events-none">{n.title}</span>
                  {notes.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(n.id);
                      }}
                      className="no-drag opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity ml-0.5"
                      title="Закрыть заметку"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </button>
              );
            })}

            {/* [+ Заметка] Button */}
            <button
              type="button"
              onClick={handleNewNote}
              className="no-drag px-2 py-1 text-xs font-semibold text-zinc-950 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 rounded-md transition-all shadow-md shadow-amber-500/10 active:scale-95 flex items-center gap-1 ml-1 shrink-0"
              title="Создать новую заметку"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Заметка</span>
            </button>
          </div>

          {/* Center: Profile indicator + Save Status (Calculator moved to note editor) */}
          <div
            data-tauri-drag-region
            className="flex-1 flex items-center justify-center gap-3 px-2 pointer-events-none select-none"
          >
            <div className="font-mono text-[11px] text-zinc-400 truncate pointer-events-none">
              <span className="text-zinc-500">ПРОФИЛЬ:</span>{' '}
              <strong className="text-amber-400">{activeProfile.toUpperCase()}</strong>
            </div>

            {/* Save status */}
            <div className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 bg-[#161820] border border-zinc-800/80 rounded flex items-center gap-1 shrink-0">
              {isSavingNote ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="hidden md:inline">Сохранение</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="hidden md:inline">Сохранено</span>
                </>
              )}
            </div>
          </div>

          {/* Right Navigation: Video + Timers + Translator + Ghost + Settings + Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Video Section Toggle Button */}
            <button
              onClick={() => setCurrentSection(currentSection === 'pip' ? 'notes' : 'pip')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 border active:scale-95 ${
                currentSection === 'pip'
                  ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md shadow-amber-500/20'
                  : 'text-zinc-300 hover:text-amber-400 bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-700/50'
              }`}
              title={currentSection === 'pip' ? 'Вернуться к заметкам' : 'Раздел видеоплеера & плейлист (Alt+P)'}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Видео</span>
            </button>

            {/* Timers Button (Always opens TimersView in main window) */}
            {activeTimer ? (
              <button
                onClick={() => setCurrentSection(currentSection === 'timers' ? 'notes' : 'timers')}
                className={`font-mono text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 cursor-pointer transition-all border active:scale-95 ${
                  currentSection === 'timers'
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md shadow-amber-500/20'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20'
                }`}
                title="Управление таймерами и пресетами"
              >
                <Timer className="w-3.5 h-3.5 animate-pulse text-current" />
                <span>
                  {activeTimer.label}: {formatSeconds(activeTimer.remainingSeconds)}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentSection(currentSection === 'timers' ? 'notes' : 'timers')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 border active:scale-95 ${
                  currentSection === 'timers'
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md shadow-amber-500/20'
                    : 'text-zinc-300 hover:text-amber-400 bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-700/50'
                }`}
                title="Игровые таймеры и кулдауны"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Таймеры</span>
              </button>
            )}

            {/* Translator Section Toggle Button */}
            <button
              onClick={() => setCurrentSection(currentSection === 'translator' ? 'notes' : 'translator')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 border active:scale-95 ${
                currentSection === 'translator'
                  ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md shadow-amber-500/20'
                  : 'text-zinc-300 hover:text-amber-400 bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-700/50'
              }`}
              title="Экранный и ручной переводчик текстов (Alt+T, Alt+S)"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>Перевод</span>
            </button>

            {/* Ghost / Lock Toggle Button */}
            <button
              onClick={handleToggleGhost}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 border active:scale-95 ${
                isMainGhost
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm shadow-amber-500/20 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-700/50'
              }`}
              title={
                isMainGhost
                  ? 'Режим Призрак ВКЛ (окно поверх всех окон, клики сквозь окно, Alt+G)'
                  : 'Включить режим Призрак (Alt+G)'
              }
            >
              {isMainGhost ? (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span className="hidden sm:inline">Ghost</span>
            </button>

            {/* Settings (⚙) Button */}
            <button
              onClick={() => setCurrentSection(currentSection === 'settings' ? 'notes' : 'settings')}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors border ${
                currentSection === 'settings'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                  : 'text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/60 border-transparent hover:border-zinc-700/50'
              }`}
              title="Настройки AI, горячие клавиши и профили"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Window control buttons */}
            <div className="flex items-center gap-1 border-l border-zinc-800/80 pl-2">
              <button
                onClick={handleMinimize}
                className="w-7 h-7 flex items-center justify-center hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors"
                title="Свернуть"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center hover:bg-red-950/60 hover:text-red-300 rounded-md text-zinc-400 transition-colors"
                title="Свернуть в трей"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* B. Central Zone: Tactical Notepad++ Editor & Subviews */}
        <main className="flex-1 overflow-hidden p-3 bg-transparent flex flex-col">
          {currentSection === 'notes' && (
            <div className="flex-1 overflow-hidden rounded-lg bg-[#0e1014]/90 border border-zinc-800/80 flex flex-col">
              {activeNote ? (
                <NotepadEditor
                  key={activeNote.id}
                  noteId={activeNote.id}
                  content={activeNote.content}
                  onChange={(val) => updateNoteContent(activeNote.id, val)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
                  Нет активной заметки
                </div>
              )}
            </div>
          )}

          {/* Video Player Section */}
          {currentSection === 'pip' && (
            <div className="h-full overflow-y-auto">
              <PiPView />
            </div>
          )}

          {/* Settings Section (AI config, profiles, hotkeys) */}
          {currentSection === 'settings' && (
            <div className="h-full overflow-y-auto">
              <SettingsView />
            </div>
          )}

          {/* Timers View Section */}
          {currentSection === 'timers' && (
            <div className="h-full overflow-y-auto">
              <TimersView />
            </div>
          )}

          {/* Screen & Manual Translator View Section */}
          {currentSection === 'translator' && (
            <div className="h-full overflow-y-auto">
              <TranslatorView />
            </div>
          )}

          {/* Web Clipper View Section */}
          {currentSection === 'clipper' && (
            <div className="h-full overflow-y-auto">
              <WebClipperView />
            </div>
          )}
        </main>

        {/* C. Bottom Zone: AI Assistant Dock (AI Bottom Dock) */}
        <AIDock onOpenSettings={() => setCurrentSection('settings')} />
      </div>
    </div>
  );
}

export default App;
