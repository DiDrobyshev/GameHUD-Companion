import React, { useEffect } from 'react';
import { X, Play, Pause, RotateCcw, GripHorizontal } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

export const TimerHudWindow: React.FC = () => {
  const {
    timers,
    timerPresets,
    quickAddPreset,
    toggleTimer,
    resetTimer,
    tickTimers,
  } = useAppStore();

  // Tick timers in HUD if running standalone
  useEffect(() => {
    const interval = setInterval(() => {
      tickTimers();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickTimers]);

  const handleClose = async () => {
    try {
      const win = getCurrentWebviewWindow();
      await win.hide();
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950/90 border border-amber-500/40 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md select-none text-white">
      {/* Draggable Header */}
      <div
        data-tauri-drag-region
        className="h-7 bg-slate-900/90 border-b border-white/10 px-2 flex items-center justify-between cursor-move shrink-0"
      >
        <div data-tauri-drag-region className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span>HUD ТАЙМЕРЫ</span>
        </div>

        <button
          onClick={handleClose}
          className="p-0.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded transition"
          title="Скрыть HUD"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Presets Strip */}
      <div className="px-2 py-1 bg-black/40 border-b border-white/5 flex items-center justify-between gap-1 shrink-0">
        {timerPresets.slice(0, 4).map((p) => (
          <button
            key={p.id}
            onClick={() => quickAddPreset(p.seconds, p.label)}
            className="flex-1 py-0.5 px-1 bg-white/5 hover:bg-amber-500/20 text-amber-300 border border-white/5 hover:border-amber-500/30 rounded text-[10px] font-medium transition text-center truncate"
            title={`Добавить ${p.label}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Timers List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
        {timers.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs">
            Нажмите кнопку пресета выше
          </div>
        ) : (
          timers.map((timer) => {
            const isFinished = timer.remainingSeconds === 0;
            const percent = Math.round(
              ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100
            );

            return (
              <div
                key={timer.id}
                className={`p-1.5 rounded-lg border flex flex-col gap-1 relative overflow-hidden transition ${
                  isFinished
                    ? 'bg-rose-950/60 border-rose-500 animate-pulse-glow'
                    : timer.isRunning
                    ? 'bg-slate-900/80 border-amber-500/30'
                    : 'bg-slate-900/40 border-white/5'
                }`}
              >
                {/* Progress bar background fill */}
                <div
                  className={`absolute left-0 top-0 bottom-0 opacity-15 transition-all ${
                    isFinished ? 'bg-rose-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${percent}%` }}
                />

                <div className="flex items-center justify-between relative z-10">
                  <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[130px]">
                    {timer.label}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleTimer(timer.id)}
                      className={`p-0.5 rounded text-[10px] ${
                        timer.isRunning ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {timer.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => resetTimer(timer.id)}
                      className="p-0.5 text-slate-400 hover:text-white rounded text-[10px]"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between relative z-10">
                  <span
                    className={`font-mono text-base font-extrabold tracking-wider ${
                      isFinished
                        ? 'text-rose-400 animate-pulse'
                        : timer.isRunning
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatTime(timer.remainingSeconds)}
                  </span>

                  {isFinished && (
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider animate-bounce">
                      Готово!
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
