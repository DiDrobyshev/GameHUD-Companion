import React, { useState } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Plus,
  Volume2,
  ExternalLink,
  Flame,
  Clock,
  BookmarkPlus,
  X
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { playTimerChime } from '../utils/audio';
import { invoke } from '@tauri-apps/api/core';

export const TimersView: React.FC = () => {
  const {
    timers,
    timerPresets,
    addTimer,
    toggleTimer,
    resetTimer,
    removeTimer,
    quickAddPreset,
    addTimerPreset,
    removeTimerPreset,
  } = useAppStore();

  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState('5');
  const [seconds, setSeconds] = useState('0');

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const totalSec = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
    if (totalSec > 0) {
      addTimer(label.trim() || 'Таймер', totalSec);
      setLabel('');
    }
  };

  const handleSaveAsPreset = () => {
    const totalSec = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
    if (totalSec > 0) {
      addTimerPreset(label.trim() || `Таймер ${formatTime(totalSec)}`, totalSec);
    }
  };

  const handleOpenFloatingHud = async () => {
    try {
      await invoke('show_window', { windowLabel: 'timer-hud' });
    } catch (err) {
      console.error('Failed to show timer HUD window:', err);
    }
  };

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0c0e] p-6 overflow-y-auto text-zinc-100 select-none">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-6">
        {/* Banner with Floating HUD Launcher */}
        <div className="bg-[#14161b]/90 border border-zinc-800/80 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-base mb-1">
              <Timer className="w-5 h-5 text-amber-400" />
              <span>Игровые Таймеры & Кулдауны</span>
            </div>
            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
              Отслеживайте респаун боссов, время баффов и кулдауны руды. Вы можете запускать
              независимый плавающий HUD поверх всех окон со звуковым синтезатором.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => playTimerChime()}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0e1014] hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs border border-zinc-800 transition active:scale-95"
              title="Проверить звуковой сигнал"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Тест звука</span>
            </button>

            <button
              onClick={handleOpenFloatingHud}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 rounded-lg text-xs font-semibold shadow-md shadow-amber-500/10 hover:brightness-110 active:scale-95 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Плавающий HUD</span>
            </button>
          </div>
        </div>

        {/* Custom Presets Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Ваши пресеты {timerPresets.length > 0 && `(${timerPresets.length})`}:
            </span>
          </div>

          {timerPresets.length === 0 ? (
            <div className="p-3 bg-[#14161b]/60 border border-dashed border-zinc-800 rounded-xl text-center text-xs text-zinc-500">
              Нет сохраненных пресетов. Задайте время в форме ниже и нажмите «+ В пресеты».
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {timerPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-2.5 bg-[#14161b]/90 hover:bg-[#1a1d24] border border-zinc-800/80 hover:border-amber-500/40 rounded-xl transition text-left group relative"
                >
                  <button
                    onClick={() => quickAddPreset(preset.seconds, preset.label)}
                    className="flex-1 flex flex-col truncate pr-2 text-left"
                    title={`Запустить таймер: ${preset.label}`}
                  >
                    <div className="text-xs font-semibold text-zinc-200 group-hover:text-amber-300 truncate">
                      {preset.label}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500">
                      {formatTime(preset.seconds)}
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => quickAddPreset(preset.seconds, preset.label)}
                      className="p-1 text-amber-400 hover:text-amber-300 transition"
                      title="Запустить"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeTimerPreset(preset.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                      title="Удалить пресет"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom Timer Form */}
        <form
          onSubmit={handleAddCustom}
          className="bg-[#14161b]/90 border border-zinc-800/80 rounded-xl p-4 flex flex-wrap items-center gap-3"
        >
          <div className="flex-1 min-w-[180px]">
            <input
              type="text"
              placeholder="Название таймера (напр. Босс или Бафф)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 bg-[#0e1014] border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="999"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-16 px-2 py-2 bg-[#0e1014] border border-zinc-800 rounded-lg text-xs text-zinc-200 text-center outline-none focus:border-amber-500/60 font-mono"
            />
            <span className="text-xs text-zinc-400">мин</span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="59"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              className="w-16 px-2 py-2 bg-[#0e1014] border border-zinc-800 rounded-lg text-xs text-zinc-200 text-center outline-none focus:border-amber-500/60 font-mono"
            />
            <span className="text-xs text-zinc-400">сек</span>
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-zinc-950 font-semibold rounded-lg text-xs shadow-md shadow-amber-500/10 active:scale-95 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Запустить таймер</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAsPreset}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0e1014] hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs border border-zinc-800 transition active:scale-95 shrink-0"
            title="Сохранить текущие параметры в список быстрых пресетов"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ В пресеты</span>
          </button>
        </form>

        {/* Active Timers List */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Активные таймеры ({timers.length})</span>
            <span className="font-mono text-[11px] text-zinc-500">Синхронизировано с HUD</span>
          </div>

          {timers.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl bg-[#14161b]/40">
              Нет активных таймеров. Запустите таймер или создайте пресет выше.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {timers.map((timer) => {
                const percent = Math.round(
                  ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100
                );
                const isFinished = timer.remainingSeconds === 0;

                return (
                  <div
                    key={timer.id}
                    className={`p-4 rounded-xl border transition flex flex-col gap-3 relative overflow-hidden ${
                      isFinished
                        ? 'bg-rose-950/40 border-rose-500/60 shadow-lg'
                        : timer.isRunning
                        ? 'bg-[#14161b] border-amber-500/40 shadow-md'
                        : 'bg-[#14161b]/60 border-zinc-800/80'
                    }`}
                  >
                    {/* Progress Bar background fill */}
                    <div
                      className={`absolute bottom-0 left-0 top-0 opacity-15 transition-all ${
                        isFinished ? 'bg-rose-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />

                    {/* Top Row: Title & Actions */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        {isFinished ? (
                          <Flame className="w-4 h-4 text-rose-400 animate-bounce" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-semibold text-xs text-zinc-100 truncate max-w-[180px]">
                          {timer.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleTimer(timer.id)}
                          className={`p-1.5 rounded-lg border transition ${
                            timer.isRunning
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-zinc-800/60 text-zinc-300 border-zinc-700/60 hover:bg-zinc-700'
                          }`}
                          title={timer.isRunning ? 'Пауза' : 'Старт'}
                        >
                          {timer.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => resetTimer(timer.id)}
                          className="p-1.5 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 rounded-lg border border-zinc-700/60 transition"
                          title="Сброс"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => removeTimer(timer.id)}
                          className="p-1.5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Countdown Digit */}
                    <div className="flex items-baseline justify-between relative z-10">
                      <span
                        className={`text-2xl font-bold font-mono ${
                          isFinished
                            ? 'text-rose-400 animate-pulse'
                            : timer.isRunning
                            ? 'text-amber-400'
                            : 'text-zinc-400'
                        }`}
                      >
                        {formatTime(timer.remainingSeconds)}
                      </span>

                      <span className="text-[11px] font-mono text-zinc-500">
                        из {formatTime(timer.totalSeconds)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default TimersView;
