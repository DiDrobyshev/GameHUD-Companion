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
  Languages,
  CircleDot
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
    captureScreenToAIDraft,
    isFloatingBubble,
    toggleFloatingBubble,
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
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Alt+G or Alt+L: Ghost Mode (click-through)
      if (e.altKey && (e.code === 'KeyG' || e.code === 'KeyL' || e.key === 'g' || e.key === 'п')) {
        e.preventDefault();
        await setMainGhost(!isMainGhost);
      }
      // Alt+S: Capture screen to AI chat draft
      if (e.altKey && (e.code === 'KeyS' || e.key === 's' || e.key === 'ы')) {
        e.preventDefault();
        await captureScreenToAIDraft();
      }
      // Alt+B: Toggle Floating Bubble Widget
      if (e.altKey && (e.code === 'KeyB' || e.key === 'b' || e.key === 'и')) {
        e.preventDefault();
        await toggleFloatingBubble();
      }
      // Alt+P: Toggle Video / PiP section
      if (e.altKey && (e.code === 'KeyP' || e.key === 'p' || e.key === 'з')) {
        e.preventDefault();
        setCurrentSection(currentSection === 'pip' ? 'notes' : 'pip');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMainGhost, setMainGhost, captureScreenToAIDraft, toggleFloatingBubble, currentSection, setCurrentSection]);

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

  // Drag and click handler for floating bubble widget
  const handleBubbleMouseDown = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    try {
      await invoke('start_dragging');
    } catch (err) {
      console.error('Failed to drag bubble:', err);
    }
  };

  // Floating Bubble Widget view
  if (isFloatingBubble) {
    return (
      <div
        onMouseDown={handleBubbleMouseDown}
        onClick={async () => {
          await toggleFloatingBubble();
        }}
        className="w-full h-full flex items-center justify-center bg-transparent select-none cursor-pointer p-0.5 overflow-hidden"
        title="GameHUD: Кликните для разворачивания (Alt+B). Зажмите мышь для перемещения."
      >
        <div
          style={{ opacity: mainOpacity / 100 }}
          className="w-12 h-12 rounded-2xl bg-[#0c0e12]/95 border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] flex items-center justify-center relative hover:scale-110 active:scale-95 transition-all duration-150 group"
        >
          <FileText className="w-5 h-5 text-amber-400 group-hover:text-yellow-300 transition-colors pointer-events-none" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-[#0c0e12] animate-pulse pointer-events-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen p-1.5 sm:p-2 overflow-hidden bg-transparent select-none box-border">
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
          className="h-11 border-b border-zinc-800/80 px-2 sm:px-3 flex items-center justify-between bg-[#101217]/90 shrink-0 select-none cursor-move overflow-hidden"
        >
          {/* Left: Yellow Note Icons + New Tab Button (Titles removed) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink no-drag">
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
                  className={`no-drag group relative w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                    isTabActive
                      ? 'bg-amber-500/20 text-amber-400 border-amber-400/80 font-semibold shadow-sm'
                      : 'bg-transparent text-zinc-500 hover:text-amber-400 hover:bg-zinc-800/40 border-transparent'
                  }`}
                  title={n.title || 'Заметка'}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400 pointer-events-none" />
                  {notes.length > 1 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(n.id);
                      }}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-zinc-900 border border-zinc-700 hover:border-red-400 hover:bg-red-500 text-zinc-400 hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Закрыть заметку"
                    >
                      <X className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}

            {/* [+ Заметка] Button (Icon only) */}
            <button
              type="button"
              onClick={handleNewNote}
              className="no-drag w-7 h-7 rounded-md bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-zinc-950 flex items-center justify-center transition-all shadow-md shadow-amber-500/10 active:scale-95 shrink-0"
              title="Создать новую заметку"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Center: Profile indicator + Save Status (hidden on narrow windows) */}
          <div
            data-tauri-drag-region
            className="flex-1 hidden xl:flex items-center justify-center gap-3 px-2 pointer-events-none select-none"
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
                  <span>Сохранение</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Сохранено</span>
                </>
              )}
            </div>
          </div>

          {/* Right Navigation: Icons only (No text labels) */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Video Section Toggle */}
            <button
              type="button"
              onClick={() => setCurrentSection(currentSection === 'pip' ? 'notes' : 'pip')}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-all border active:scale-95 shrink-0 ${
                currentSection === 'pip'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                  : 'text-zinc-300 hover:text-amber-400 bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-700/50'
              }`}
              title={currentSection === 'pip' ? 'Вернуться к заметкам (Alt+P)' : 'Видео & плейлист (Alt+P)'}
            >
              <Tv className="w-3.5 h-3.5" />
            </button>

            {/* Timers Section Toggle */}
            <button
              type="button"
              onClick={() => setCurrentSection(currentSection === 'timers' ? 'notes' : 'timers')}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-all border active:scale-95 shrink-0 relative ${
                currentSection === 'timers'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                  : activeTimer
                  ? 'text-amber-400 bg-amber-500/15 border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                  : 'text-zinc-300 hover:text-amber-400 bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-700/50'
              }`}
              title={
                activeTimer
                  ? `Таймер: ${activeTimer.label} (${formatSeconds(activeTimer.remainingSeconds)})`
                  : 'Игровые таймеры и кулдауны'
              }
            >
              <Timer className={`w-3.5 h-3.5 ${activeTimer ? 'animate-pulse text-amber-400' : ''}`} />
              {activeTimer && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            {/* Translator Section Toggle */}
            <button
              type="button"
              onClick={() => setCurrentSection(currentSection === 'translator' ? 'notes' : 'translator')}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-all border active:scale-95 shrink-0 ${
                currentSection === 'translator'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                  : 'text-zinc-300 hover:text-amber-400 bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-700/50'
              }`}
              title="Переводчик текста"
            >
              <Languages className="w-3.5 h-3.5" />
            </button>

            {/* Ghost / Lock Toggle Button */}
            <button
              type="button"
              onClick={handleToggleGhost}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-all border active:scale-95 shrink-0 ${
                isMainGhost
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-700/50'
              }`}
              title={
                isMainGhost
                  ? 'Режим Призрак ВКЛ (клики сквозь окно, Alt+G)'
                  : 'Включить режим Призрак (Alt+G)'
              }
            >
              {isMainGhost ? (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>

            {/* Floating Bubble Toggle Button */}
            <button
              type="button"
              onClick={() => toggleFloatingBubble()}
              className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50 transition-colors shrink-0"
              title="Свернуть в плавающую кнопку (Alt+B)"
            >
              <CircleDot className="w-3.5 h-3.5" />
            </button>

            {/* Settings (⚙) Button */}
            <button
              type="button"
              onClick={() => setCurrentSection(currentSection === 'settings' ? 'notes' : 'settings')}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors border shrink-0 ${
                currentSection === 'settings'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                  : 'text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/60 border-transparent hover:border-zinc-700/50'
              }`}
              title="Настройки AI, горячие клавиши и профили"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Window control buttons */}
            <div className="flex items-center gap-1 border-l border-zinc-800/80 pl-1.5 shrink-0">
              <button
                type="button"
                onClick={handleMinimize}
                className="w-7 h-7 flex items-center justify-center hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
                title="Свернуть"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center hover:bg-red-950/60 hover:text-red-300 rounded-md text-zinc-400 transition-colors shrink-0"
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
