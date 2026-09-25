import React, { useEffect } from 'react';
import { TitleBar } from '../components/TitleBar';
import { ModuleLauncherBar } from '../components/ModuleLauncherBar';
import { SettingsView } from '../components/SettingsView';
import { NotesView } from '../components/NotesView';
import { WebClipperView } from '../components/WebClipperView';
import { TimersView } from '../components/TimersView';
import { PiPView } from '../components/PiPView';
import { useAppStore } from '../store/useAppStore';
import { Ghost } from 'lucide-react';

export const MainWindow: React.FC = () => {
  const {
    currentSection,
    setCurrentSection,
    mainOpacity,
    isMainGhost,
    setMainGhost,
    tickTimers,
    triggerSnipper,
  } = useAppStore();

  // Run timer ticks every 1 second, cleanly unmounting on exit
  useEffect(() => {
    const timerInterval = setInterval(() => {
      tickTimers();
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [tickTimers]);

  // Global key listener for Alt+G, Alt+S
  useEffect(() => {
    const handleGlobalKeys = async (e: KeyboardEvent) => {
      // Alt+G: Toggle Main Ghost Mode
      if (e.altKey && (e.key === 'g' || e.key === 'п' || e.key === 'G')) {
        e.preventDefault();
        setMainGhost(!isMainGhost);
      }
      // Alt+S: Snipper Tool
      if (e.altKey && (e.key === 's' || e.key === 'ы' || e.key === 'S')) {
        e.preventDefault();
        await triggerSnipper();
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isMainGhost, setMainGhost, triggerSnipper]);

  return (
    <div
      className={`flex flex-col w-screen h-screen overflow-hidden rounded-2xl border transition-all duration-150 shadow-2xl relative ${
        isMainGhost
          ? 'border-rose-500/50'
          : 'border-[#1e2536] bg-[#0b0e15]'
      }`}
      style={{
        opacity: mainOpacity / 100,
        backgroundColor: '#0b0e15',
      }}
    >
      {/* 1. Header with Window Controls & Section Navigation */}
      <TitleBar
        currentSection={currentSection}
        onSelectSection={(sec) => setCurrentSection(sec)}
      />

      {/* 2. Quick Module Launcher Bar (Timer HUD, PiP, OCR Snipper) */}
      <ModuleLauncherBar />

      {/* 3. Ghost Mode Alert Banner (if activated) */}
      {isMainGhost && (
        <div className="bg-rose-950/90 border-b border-rose-500/50 px-4 py-2 flex items-center justify-between text-xs text-rose-200 z-40">
          <div className="flex items-center gap-2 font-medium">
            <Ghost className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>
              <strong>GHOST MODE АКТИВЕН:</strong> Мышь кликает сквозь оверлей прямо в окно игры.
            </span>
          </div>
          <button
            onClick={() => setMainGhost(false)}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow"
          >
            Выключить (Alt+G)
          </button>
        </div>
      )}

      {/* 4. Main Section Container */}
      <main className="flex-1 flex overflow-hidden">
        {currentSection === 'settings' && <SettingsView />}
        {currentSection === 'notes' && <NotesView />}
        {currentSection === 'clipper' && <WebClipperView />}
        {currentSection === 'timers' && <TimersView />}
        {currentSection === 'pip' && <PiPView />}
      </main>
    </div>
  );
};
