import React, { useState } from 'react';
import {
  Tv,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Ghost,
  Volume2,
  ExternalLink,
  Plus,
  Trash2,
  EyeOff,
  Video,
  ListVideo
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { parseVideoUrl } from '../utils/videoParser';
import { invoke } from '@tauri-apps/api/core';

export const PiPView: React.FC = () => {
  const {
    pipQueue,
    pipCurrentIndex,
    pipIsPlaying,
    pipVolume,
    pipIsGhost,
    pipIsBossHidden,
    enqueueVideo,
    removeFromQueue,
    playIndex,
    togglePipPlay,
    nextVideo,
    prevVideo,
    setPipVolume,
    setPipGhost,
    togglePipBossKey,
  } = useAppStore();

  const [inputUrl, setInputUrl] = useState('');

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const parsed = parseVideoUrl(inputUrl.trim());
    if (parsed) {
      enqueueVideo(parsed);
      setInputUrl('');
    }
  };

  const handleOpenFloatingPip = async () => {
    try {
      await invoke('show_window', { windowLabel: 'pip-hud' });
    } catch (err) {
      console.error('Failed to show pip HUD window:', err);
    }
  };

  const currentVideo = pipQueue[pipCurrentIndex];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0c0e]/95 p-6 overflow-y-auto backdrop-blur-md">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-6">
        {/* Banner with PiP Window Controls */}
        <div className="bg-[#14161b]/90 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-lg mb-1">
              <Tv className="w-6 h-6" />
              <span>Tactical PiP Видеоплеер & Очередь</span>
            </div>
            <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
              Смотрите стримы Twitch, прохождения YouTube, VK Видео прямо в игре.
              Магнитное прилипание к углам монитора, хоткей сквозных кликов Ghost Mode (Alt+L)
              и моментальная маскировка Boss Key (Alt+H).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => togglePipBossKey()}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition ${
                pipIsBossHidden
                  ? 'bg-amber-500 text-black border-amber-400 font-bold animate-pulse'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
              title="Boss Key: скрыть видео и выключить звук (Alt+H)"
            >
              <EyeOff className="w-4 h-4 text-amber-400" />
              <span>Boss Key (Alt+H)</span>
            </button>

            <button
              onClick={handleOpenFloatingPip}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold shadow-lg border border-amber-400/30 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Открыть PiP окно</span>
            </button>
          </div>
        </div>

        {/* Add Video to Queue Form */}
        <form onSubmit={handleAddVideo} className="flex gap-2">
          <input
            type="text"
            placeholder="Вставьте ссылку на YouTube, Twitch, VK видео или прямую ссылку .mp4..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-[#14161b] border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition"
          />
          <button
            type="submit"
            disabled={!inputUrl.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition shadow shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить в очередь</span>
          </button>
        </form>

        {/* Player Controls Bar */}
        <div className="bg-[#14161b]/80 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          {/* Currently playing info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Сейчас играет:</div>
              <div className="text-sm font-semibold text-zinc-100 truncate max-w-sm">
                {currentVideo ? currentVideo.title : 'Очередь пуста'}
              </div>
            </div>
          </div>

          {/* Playback buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevVideo()}
              className="p-2 hover:bg-white/10 text-zinc-300 rounded-lg transition"
              title="Предыдущее видео"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => togglePipPlay()}
              className="p-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-lg transition font-bold"
              title={pipIsPlaying ? 'Пауза (Alt+P)' : 'Воспроизведение (Alt+P)'}
            >
              {pipIsPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => nextVideo()}
              className="p-2 hover:bg-white/10 text-zinc-300 rounded-lg transition"
              title="Следующее видео"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Volume and Ghost mode */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-zinc-300">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <input
                type="range"
                min="0"
                max="100"
                value={pipVolume}
                onChange={(e) => setPipVolume(parseInt(e.target.value))}
                className="w-24 accent-amber-500 cursor-pointer"
                title={`Громкость: ${pipVolume}%`}
              />
              <span className="text-xs w-7">{pipVolume}%</span>
            </div>

            <button
              onClick={() => setPipGhost(!pipIsGhost)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                pipIsGhost
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-zinc-700'
              }`}
              title="Ghost Mode (сквозные клики мыши в игру, Alt+L)"
            >
              <Ghost className="w-3.5 h-3.5" />
              <span>{pipIsGhost ? 'Ghost ON' : 'Ghost Mode'}</span>
            </button>
          </div>
        </div>

        {/* Playlist Queue */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <ListVideo className="w-4 h-4 text-amber-400" />
              <span>Очередь воспроизведения ({pipQueue.length})</span>
            </div>
            <span>Автоматический переход к следующему видео</span>
          </div>

          {pipQueue.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl bg-[#14161b]/40">
              Очередь пуста. Вставьте ссылку на YouTube или Twitch выше!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pipQueue.map((video, idx) => (
                <div
                  key={video.id}
                  onClick={() => playIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                    idx === pipCurrentIndex
                      ? 'bg-amber-500/15 border-amber-500/40 text-zinc-100'
                      : 'bg-[#14161b]/80 border-zinc-800 text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Thumbnail or Icon */}
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt="thumb"
                        className="w-12 h-8 rounded object-cover border border-zinc-800 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4 text-amber-400" />
                      </div>
                    )}

                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        {idx === pipCurrentIndex && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        )}
                        <span className="text-xs font-semibold truncate max-w-md">
                          {video.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 truncate block font-mono">
                        {video.url}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-amber-400">
                      {video.type}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(video.id);
                      }}
                      className="p-1 hover:bg-amber-500/20 text-zinc-500 hover:text-amber-300 rounded transition"
                      title="Удалить из очереди"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
