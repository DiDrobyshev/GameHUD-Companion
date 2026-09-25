import React from 'react';
import { Timer, Tv, Crop, ExternalLink, Power } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface ModuleLauncherBarProps {
  className?: string;
}

export const ModuleLauncherBar: React.FC<ModuleLauncherBarProps> = () => {
  const {
    isTimerHudVisible,
    isPipHudVisible,
    toggleTimerHud,
    togglePipHud,
    triggerSnipper,
    hotkeys,
  } = useAppStore();

  return (
    <div className="bg-[#121622] border-b border-[#1f2738] px-4 py-2.5 flex items-center justify-between gap-3 select-none shrink-0">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden lg:block shrink-0">
        Быстрый запуск:
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 flex-1 max-w-5xl">
        {/* 1. Timer HUD Widget Toggle */}
        <div className="bg-[#181e2e] border border-[#273248] rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm hover:border-amber-500/40 transition">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400">
              <Timer className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-200 truncate">
                HUD Таймеры
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <span className={`w-1.5 h-1.5 rounded-full ${isTimerHudVisible ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-500'}`} />
                <span className={isTimerHudVisible ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                  {isTimerHudVisible ? 'Включен' : 'Скрыт'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => toggleTimerHud()}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition shrink-0 flex items-center gap-1 ${
              isTimerHudVisible
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            <Power className="w-3 h-3" />
            <span>{isTimerHudVisible ? 'Закрыть' : 'Запуск'}</span>
          </button>
        </div>

        {/* 2. PiP Player Widget Toggle */}
        <div className="bg-[#181e2e] border border-[#273248] rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm hover:border-rose-500/40 transition">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0 text-rose-400">
              <Tv className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-200 truncate">
                PiP Плеер
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <span className={`w-1.5 h-1.5 rounded-full ${isPipHudVisible ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-500'}`} />
                <span className={isPipHudVisible ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                  {isPipHudVisible ? 'Включен' : 'Скрыт'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => togglePipHud()}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition shrink-0 flex items-center gap-1 ${
              isPipHudVisible
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
            }`}
          >
            <Power className="w-3 h-3" />
            <span>{isPipHudVisible ? 'Закрыть' : 'Запуск'}</span>
          </button>
        </div>

        {/* 3. Freeze-Frame Snipper OCR */}
        <div className="bg-[#181e2e] border border-[#273248] rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm hover:border-violet-500/40 transition">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0 text-violet-400">
              <Crop className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-200 truncate">
                Стоп-кадр OCR
              </div>
              <div className="text-[10px] text-violet-400/80 font-mono">
                {hotkeys.snipperTool}
              </div>
            </div>
          </div>

          <button
            onClick={() => triggerSnipper()}
            className="px-2 py-1 rounded-md text-[11px] font-medium bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 transition shrink-0 flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Снимок</span>
          </button>
        </div>
      </div>
    </div>
  );
};
