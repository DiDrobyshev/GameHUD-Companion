import React, { useState, useEffect } from 'react';
import {
  GripHorizontal,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Ghost,
  Volume2,
  ListVideo,
  EyeOff
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { currentMonitor } from '@tauri-apps/api/window';
import { LogicalPosition } from '@tauri-apps/api/dpi';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { VideoItem } from '../types';

export const PipHudWindow: React.FC = () => {
  const {
    pipQueue,
    pipCurrentIndex,
    pipIsPlaying,
    pipVolume,
    pipIsGhost,
    pipOpacity,
    togglePipPlay,
    nextVideo,
    prevVideo,
    setPipGhost,
    setPipVolume,
    togglePipBossKey,
  } = useAppStore();

  const [showControls, setShowControls] = useState(true);
  const [showQueueMenu, setShowQueueMenu] = useState(false);

  // Sync state with main window
  useEffect(() => {
    // Request current PiP state from main window
    emit('pip-request-sync').catch(() => {});

    const unlistenPromise = listen<{
      queue?: VideoItem[];
      currentIndex?: number;
      isPlaying?: boolean;
      isGhost?: boolean;
      volume?: number;
      opacity?: number;
    }>('pip-sync', (event) => {
      const p = event.payload;
      if (p.queue !== undefined) useAppStore.setState({ pipQueue: p.queue });
      if (p.currentIndex !== undefined) useAppStore.setState({ pipCurrentIndex: p.currentIndex });
      if (p.isPlaying !== undefined) useAppStore.setState({ pipIsPlaying: p.isPlaying });
      if (p.isGhost !== undefined) useAppStore.setState({ pipIsGhost: p.isGhost });
      if (p.volume !== undefined) useAppStore.setState({ pipVolume: p.volume });
      if (p.opacity !== undefined) useAppStore.setState({ pipOpacity: p.opacity });
    });

    const unlistenGhostPromise = listen<boolean>('pip-ghost-sync', (event) => {
      useAppStore.setState({ pipIsGhost: event.payload });
    });

    return () => {
      unlistenPromise.then((fn) => fn());
      unlistenGhostPromise.then((fn) => fn());
    };
  }, []);

  const currentVideo = pipQueue[pipCurrentIndex];

  // Mouse wheel over PiP window adjusts volume
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 5 : -5;
    setPipVolume(pipVolume + delta);
  };

  // Keyboard shortcuts while focused
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Alt+L: Toggle Ghost Mode
      if (e.altKey && (e.key === 'l' || e.key === 'д' || e.key === 'L')) {
        e.preventDefault();
        setPipGhost(!pipIsGhost);
      }
      // Alt+H: Boss Key
      if (e.altKey && (e.key === 'h' || e.key === 'р' || e.key === 'H')) {
        e.preventDefault();
        togglePipBossKey();
      }
      // Alt+P: Play/Pause
      if (e.altKey && (e.key === 'p' || e.key === 'з' || e.key === 'P')) {
        e.preventDefault();
        togglePipPlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pipIsGhost, setPipGhost, togglePipBossKey, togglePipPlay]);

  const snapToCorner = async (corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    try {
      const win = getCurrentWebviewWindow();
      const monitor = await currentMonitor();
      const size = await win.outerSize();
      if (!monitor) return;

      const screenWidth = monitor.size.width;
      const screenHeight = monitor.size.height;
      const margin = 20;

      let targetX = margin;
      let targetY = margin;

      if (corner === 'top-right') {
        targetX = screenWidth - size.width - margin;
        targetY = margin;
      } else if (corner === 'bottom-left') {
        targetX = margin;
        targetY = screenHeight - size.height - margin;
      } else if (corner === 'bottom-right') {
        targetX = screenWidth - size.width - margin;
        targetY = screenHeight - size.height - margin;
      }

      await win.setPosition(new LogicalPosition(targetX, targetY));
    } catch (err) {
      console.error('Failed to snap corner:', err);
    }
  };

  const handleDragMouseDown = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    try {
      await invoke('start_dragging');
    } catch (err) {
      console.error('Failed to start dragging PiP window:', err);
    }
  };

  const handleClose = async () => {
    try {
      await invoke('hide_window', { windowLabel: 'pip-hud' });
      useAppStore.setState({ isPipHudVisible: false });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onWheel={handleWheel}
      className="w-full h-full flex flex-col bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 relative select-none group"
      style={{
        opacity: pipOpacity / 100,
      }}
    >
      {/* Top Controls Overlay - Always draggable */}
      <div
        data-tauri-drag-region
        onMouseDown={handleDragMouseDown}
        className={`absolute top-0 left-0 right-0 h-9 z-30 flex items-center justify-between px-2 cursor-move transition-all duration-200 ${
          showControls
            ? 'bg-gradient-to-b from-black/95 via-black/85 to-transparent opacity-100'
            : 'bg-black/60 opacity-80 hover:opacity-100 hover:bg-black/90'
        }`}
      >
        <div data-tauri-drag-region className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 pointer-events-none select-none">
          <GripHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate max-w-[150px]">
            {currentVideo ? currentVideo.title : 'PiP Player'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Snap Corner buttons */}
          <div className="flex items-center bg-black/50 border border-zinc-800 rounded p-0.5 text-[10px] text-zinc-300">
            <button
              onClick={() => snapToCorner('top-left')}
              className="px-1 hover:text-amber-400"
              title="Примагнитить в левый верхний угол"
            >
              ↖
            </button>
            <button
              onClick={() => snapToCorner('top-right')}
              className="px-1 hover:text-amber-400"
              title="Примагнитить в правый верхний угол"
            >
              ↗
            </button>
            <button
              onClick={() => snapToCorner('bottom-left')}
              className="px-1 hover:text-amber-400"
              title="Примагнитить в левый нижний угол"
            >
              ↙
            </button>
            <button
              onClick={() => snapToCorner('bottom-right')}
              className="px-1 hover:text-amber-400"
              title="Примагнитить в правый нижний угол"
            >
              ↘
            </button>
          </div>

          {/* Ghost Mode Badge */}
          <button
            onClick={() => setPipGhost(!pipIsGhost)}
            className={`p-1 rounded text-[10px] flex items-center gap-1 border transition ${
              pipIsGhost
                ? 'bg-amber-500 text-black border-amber-400 font-bold animate-pulse'
                : 'bg-black/50 text-zinc-300 border-zinc-800 hover:bg-white/10'
            }`}
            title="Ghost Mode (Alt+L: сквозные клики)"
          >
            <Ghost className="w-3 h-3" />
            <span>{pipIsGhost ? 'Ghost ON' : 'Ghost'}</span>
          </button>

          {/* Queue Menu Toggle */}
          <button
            onClick={() => setShowQueueMenu(!showQueueMenu)}
            className="p-1 bg-black/50 hover:bg-white/10 text-zinc-300 rounded border border-zinc-800 transition"
            title="Очередь видео"
          >
            <ListVideo className="w-3 h-3" />
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="p-1 hover:bg-red-500/80 text-zinc-400 hover:text-white rounded transition"
            title="Скрыть PiP"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Video Content Renderer */}
      <div className="flex-1 w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
        {currentVideo ? (
          currentVideo.type === 'youtube' ? (
            <iframe
              src={currentVideo.embedUrl}
              className="w-full h-full border-0 pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : currentVideo.type === 'twitch' || currentVideo.type === 'vk' ? (
            <iframe
              src={currentVideo.embedUrl}
              className="w-full h-full border-0 pointer-events-auto"
              allowFullScreen
            />
          ) : (
            <video
              src={currentVideo.embedUrl}
              controls={false}
              autoPlay={pipIsPlaying}
              loop={false}
              onEnded={() => nextVideo()}
              className="w-full h-full object-contain"
            />
          )
        ) : (
          <div className="text-center text-slate-500 text-xs px-4">
            Очередь воспроизведения пуста. Добавьте видео в главном окне.
          </div>
        )}
      </div>

      {/* Bottom Floating Playback Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-9 bg-gradient-to-t from-black/95 to-transparent z-30 flex items-center justify-between px-3 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => prevVideo()}
            className="p-1 text-zinc-300 hover:text-white transition"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => togglePipPlay()}
            className="p-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded transition"
          >
            {pipIsPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => nextVideo()}
            className="p-1 text-zinc-300 hover:text-white transition"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Volume & Boss Key */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-zinc-300 text-xs">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={pipVolume}
              onChange={(e) => setPipVolume(parseInt(e.target.value))}
              className="w-16 accent-amber-500 cursor-pointer"
            />
          </div>

          <button
            onClick={() => togglePipBossKey()}
            className="p-1 hover:text-amber-400 text-zinc-400 transition"
            title="Boss Key (Alt+H)"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Queue Dropdown Popup */}
      {showQueueMenu && (
        <div className="absolute top-9 right-2 w-56 max-h-48 overflow-y-auto bg-[#14161b]/95 border border-zinc-800 rounded-lg p-1.5 shadow-2xl z-40 text-xs">
          <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Очередь ({pipQueue.length})
          </div>
          {pipQueue.map((v, i) => (
            <button
              key={v.id}
              onClick={() => {
                useAppStore.getState().playIndex(i);
                setShowQueueMenu(false);
              }}
              className={`w-full text-left px-2 py-1 rounded truncate flex items-center gap-1.5 ${
                i === pipCurrentIndex
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-zinc-300 hover:bg-white/10'
              }`}
            >
              <span>{i + 1}.</span>
              <span className="truncate">{v.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
