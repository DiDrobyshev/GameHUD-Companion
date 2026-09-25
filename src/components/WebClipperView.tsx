import React, { useState } from 'react';
import { Globe, Download, Check, AlertCircle, FilePlus, BookOpen } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { parseAndConvertHtmlToMarkdown, ClippedArticle } from '../utils/clipper';
import { useAppStore } from '../store/useAppStore';

const PRESET_URLS = [
  { name: 'Wiki.gg', url: 'https://terraria.wiki.gg/wiki/Terraria_Wiki' },
  { name: 'Fandom', url: 'https://eldenring.fandom.com/wiki/Elden_Ring_Wiki' },
  { name: 'Fextralife', url: 'https://eldenring.wiki.fextralife.com/Elden+Ring+Wiki' },
];

export const WebClipperView: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clipped, setClipped] = useState<ClippedArticle | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const { addTab } = useAppStore();

  const handleClip = async (targetUrl?: string) => {
    const rawUrl = targetUrl || url;
    if (!rawUrl.trim()) return;

    setLoading(true);
    setError(null);
    setClipped(null);
    setIsSaved(false);

    try {
      // 1. Fetch raw HTML from Rust backend bypassing CORS
      const html = await invoke<string>('fetch_html_cors_bypass', { url: rawUrl.trim() });

      // 2. Process with Readability + Turndown GFM
      const article = parseAndConvertHtmlToMarkdown(html, rawUrl.trim());
      setClipped(article);
    } catch (err) {
      console.error('Clipper error:', err);
      setError(`Ошибка скачивания: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToNotes = async () => {
    if (!clipped) return;

    try {
      const cleanTitle = clipped.title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 40);
      const fileName = `Guide_${cleanTitle}.md`;

      // Save directly as a new tab
      await addTab(`📖 ${cleanTitle}`, fileName);
      // Update with clipped markdown
      const { updateContent, saveCurrentNoteToDisk } = useAppStore.getState();
      updateContent(clipped.markdown, false);
      await saveCurrentNoteToDisk();

      setIsSaved(true);
    } catch (err) {
      console.error('Failed to save clipped note:', err);
      setError('Не удалось сохранить в заметки');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0c0e]/95 p-6 overflow-y-auto backdrop-blur-md">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-6">
        {/* Header Banner */}
        <div className="bg-[#14161b]/90 border border-zinc-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-3 text-amber-400 font-bold text-lg mb-1">
            <Globe className="w-6 h-6" />
            <span>Web Clipper: Режим Чтения для Вики и Гайдов</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
            Вставьте ссылку на любой гайд (Fandom, Fextralife, Wiki.gg). Rust-бэкенд скачивает страницу
            в обход CORS, вычищает рекламу и баннеры через Mozilla Readability, и преобразует статью в чистый
            Markdown со всеми таблицами для игры в офлайне.
          </p>

          {/* Quick presets */}
          <div className="flex items-center gap-2 mt-4 text-xs">
            <span className="text-zinc-400">Быстрые примеры:</span>
            {PRESET_URLS.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setUrl(p.url);
                  handleClip(p.url);
                }}
                className="px-2.5 py-1 bg-white/5 hover:bg-amber-500/20 text-amber-300 rounded-md border border-white/5 hover:border-amber-500/30 transition"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Input & Action Form */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="url"
              placeholder="Вставьте URL статьи (напр. https://eldenring.wiki.fextralife.com/...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClip();
              }}
              className="w-full px-4 py-3 bg-[#14161b] border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition"
            />
          </div>

          <button
            onClick={() => handleClip()}
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm rounded-xl transition shadow-lg shrink-0"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Очистка контента...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Спарсить гайд</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Preview & Save Action */}
        {clipped && (
          <div className="bg-[#14161b]/90 border border-amber-500/30 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span>{clipped.title}</span>
                </h3>
                <span className="text-xs text-zinc-400 truncate max-w-md block font-mono">
                  {clipped.originalUrl}
                </span>
              </div>

              <button
                onClick={handleSaveToNotes}
                disabled={isSaved}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-400 text-black text-xs font-bold rounded-lg shadow transition"
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Сохранено в заметки!</span>
                  </>
                ) : (
                  <>
                    <FilePlus className="w-4 h-4" />
                    <span>Добавить в заметки</span>
                  </>
                )}
              </button>
            </div>

            {/* Markdown Code Preview */}
            <div className="max-h-96 overflow-y-auto bg-black/60 rounded-xl p-4 border border-zinc-800">
              <pre className="text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {clipped.markdown}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
