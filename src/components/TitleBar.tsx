import React, { useState } from 'react';
import {
  FileText,
  Globe,
  Timer,
  Tv,
  Settings,
  Ghost,
  Minus,
  X,
  Gamepad2,
  ChevronDown,
  Plus
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

export type MainNavSection = 'settings' | 'notes' | 'clipper' | 'timers' | 'pip' | 'translator';

interface TitleBarProps {
  currentSection: MainNavSection;
  onSelectSection: (section: MainNavSection) => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentSection,
  onSelectSection,
}) => {
  const {
    activeProfile,
    availableProfiles,
    switchProfile,
    createProfile,
    isMainGhost,
    setMainGhost,
  } = useAppStore();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);

  const handleMinimize = async () => {
    try {
      const win = getCurrentWebviewWindow();
      await win.minimize();
    } catch (err) {
      console.error(err);
    }
  };

  const handleHideToTray = async () => {
    try {
      const win = getCurrentWebviewWindow();
      await win.hide();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProfileName.trim()) {
      await createProfile(newProfileName.trim());
      setNewProfileName('');
      setShowNewProfileModal(false);
      setIsProfileMenuOpen(false);
    }
  };

  return (
    <>
      <header
        data-tauri-drag-region
        className="h-12 w-full bg-[#0a0d14] border-b border-[#1c2333] flex items-center justify-between px-3 select-none shrink-0"
      >
        {/* Left: Branding & Profile Selector */}
        <div className="flex items-center gap-3">
          <div data-tauri-drag-region className="flex items-center gap-2 font-black text-xs tracking-wider text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse"></span>
            <span className="tracking-widest font-mono text-sm text-slate-100">GAME<span className="text-cyan-400">HUD</span></span>
          </div>

          {/* Profile Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#141a26] hover:bg-[#1a2233] rounded-lg text-xs font-medium text-slate-200 border border-[#273248] transition shadow-sm"
              title="Переключить игровой профиль"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[120px] truncate">{activeProfile}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-[#0f1420] border border-[#273248] rounded-xl shadow-2xl py-1.5 z-50">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Игровой профиль
                </div>
                {availableProfiles.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      switchProfile(p);
                      setIsProfileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/10 transition ${
                      p === activeProfile ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{p}</span>
                    {p === activeProfile && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                  </button>
                ))}
                <div className="border-t border-[#273248] my-1"></div>
                <button
                  onClick={() => {
                    setShowNewProfileModal(true);
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-indigo-400 hover:bg-white/10 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Создать профиль...</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center: Navigation Sections */}
        <nav className="flex items-center gap-1 bg-[#10141f] p-1 rounded-xl border border-[#202738]">
          <button
            onClick={() => onSelectSection('settings')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              currentSection === 'settings'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Настройки & Хоткеи</span>
          </button>

          <button
            onClick={() => onSelectSection('notes')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              currentSection === 'notes'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Заметки</span>
          </button>

          <button
            onClick={() => onSelectSection('clipper')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              currentSection === 'clipper'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Clipper</span>
          </button>


          <button
            onClick={() => onSelectSection('timers')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              currentSection === 'timers'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Таймеры</span>
          </button>

          <button
            onClick={() => onSelectSection('pip')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
              currentSection === 'pip'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>PiP</span>
          </button>
        </nav>

        {/* Right: Ghost Mode & Window Controls */}
        <div className="flex items-center gap-2">
          {/* Ghost Mode Toggle */}
          <button
            onClick={() => setMainGhost(!isMainGhost)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              isMainGhost
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                : 'bg-[#141a26] hover:bg-[#1a2233] text-slate-300 border-[#273248]'
            }`}
            title="Ghost Mode: сквозные клики мыши прямо в игру (Alt+G)"
          >
            <Ghost className="w-3.5 h-3.5" />
            <span>{isMainGhost ? 'Ghost ON' : 'Ghost (Alt+G)'}</span>
          </button>

          {/* Minimize & Hide to Tray */}
          <div className="flex items-center pl-1 border-l border-[#273248] gap-1">
            <button
              onClick={handleMinimize}
              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition"
              title="Свернуть"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={handleHideToTray}
              className="p-1.5 hover:bg-rose-500/80 text-slate-400 hover:text-white rounded-lg transition"
              title="Свернуть в трей (программа продолжает работать в фоне)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* New Profile Modal */}
      {showNewProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleCreateProfileSubmit}
            className="w-84 bg-[#121622] border border-[#2c364c] rounded-2xl p-5 shadow-2xl flex flex-col gap-3 text-white"
          >
            <div className="flex items-center justify-between text-sm font-bold text-slate-200">
              <span>Новый игровой профиль</span>
              <button
                type="button"
                onClick={() => setShowNewProfileModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Название игры (напр. Witcher 3)"
              className="px-3.5 py-2.5 bg-[#0a0d14] border border-[#273248] rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewProfileModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition shadow"
              >
                Создать профиль
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
