import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Copy, Check, PlusCircle, X, Crop, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { translateText } from '../utils/translator';

export const SnipperWindow: React.FC = () => {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Result state
  const [ocrText, setOcrText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [showResultCard, setShowResultCard] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  const { appendNoteContent } = useAppStore();

  useEffect(() => {
    // Capture full desktop screenshot when window opens
    captureFull();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const captureFull = async () => {
    setShowResultCard(false);
    setSelection(null);

    try {
      const bytes = await invoke<number[]>('capture_screen_full');
      const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      setScreenshotUrl(url);

      const img = new Image();
      img.src = url;
      img.onload = () => {
        imgRef.current = img;
      };
    } catch (err) {
      console.error('Failed to capture desktop screenshot:', err);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (showResultCard) return;
    setIsDragging(true);
    setSelection({
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selection) return;
    setSelection((prev) => (prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null));
  };

  const handleMouseUp = async () => {
    if (!isDragging || !selection) return;
    setIsDragging(false);

    const x = Math.min(selection.startX, selection.endX);
    const y = Math.min(selection.startY, selection.endY);
    const w = Math.abs(selection.endX - selection.startX);
    const h = Math.abs(selection.endY - selection.startY);

    if (w < 15 || h < 15) {
      setSelection(null);
      return;
    }

    // Crop from screenshot canvas
    if (imgRef.current) {
      setLoadingOcr(true);
      setShowResultCard(true);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgRef.current, x, y, w, h, 0, 0, w, h);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = Array.from(new Uint8Array(arrayBuffer));

          try {
            // 1. Run native WinRT OCR
            const text = await invoke<string>('run_windows_ocr', { imageBytes: bytes });
            const cleanText = text.trim();
            setOcrText(cleanText);

            if (cleanText) {
              // 2. Translate text using client-side translator
              try {
                const translated = await translateText(cleanText, 'ru', 'auto');
                setTranslatedText(translated);
              } catch (transErr: any) {
                console.error('Translation error in snipper:', transErr);
                setTranslatedText(`[Распознано]: ${cleanText}\n[Ошибка перевода: ${transErr?.message || transErr}]`);
              }
            } else {
              setTranslatedText('Текст в выбранной области не распознан.');
            }
          } catch (err) {
            console.error('OCR / Translation error:', err);
            setTranslatedText(`Ошибка: ${err}`);
          } finally {
            setLoadingOcr(false);
          }
        }, 'image/png');
      }
    }
  };

  const handleClose = async () => {
    try {
      await invoke('hide_window', { windowLabel: 'snipper' });
      setSelection(null);
      setShowResultCard(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertIntoNote = async () => {
    const formatted = `> ✂️ **Стоп-кадр перевод:** ${translatedText}  \n> *(Распознано: ${ocrText})*`;
    appendNoteContent(formatted);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  const selX = selection ? Math.min(selection.startX, selection.endX) : 0;
  const selY = selection ? Math.min(selection.startY, selection.endY) : 0;
  const selW = selection ? Math.abs(selection.endX - selection.startX) : 0;
  const selH = selection ? Math.abs(selection.endY - selection.startY) : 0;

  return (
    <div
      className="w-screen h-screen relative overflow-hidden select-none cursor-crosshair bg-black"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Background Screenshot */}
      {screenshotUrl && (
        <img
          src={screenshotUrl}
          alt="Desktop screenshot"
          className="w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      {/* Selected Box cutout */}
      {selection && selW > 0 && selH > 0 && (
        <div
          className="absolute border-2 border-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.5)] pointer-events-none z-20"
          style={{
            left: selX,
            top: selY,
            width: selW,
            height: selH,
          }}
        >
          <span className="absolute -top-6 left-0 bg-amber-500 text-black font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
            {selW} × {selH} px
          </span>
        </div>
      )}

      {/* Top Banner instructions */}
      {!showResultCard && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#14161b]/95 border border-amber-500/40 rounded-full px-5 py-2 text-xs font-semibold text-amber-300 shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none">
          <Crop className="w-4 h-4 text-amber-400" />
          <span>Выделите мышью область с текстом для распознавания и перевода (Esc для отмены)</span>
        </div>
      )}

      {/* Floating Result Card */}
      {showResultCard && (
        <div
          className="absolute z-40 bg-[#14161b]/95 border border-amber-500/50 rounded-2xl p-5 shadow-2xl backdrop-blur-md max-w-lg w-full flex flex-col gap-3.5 text-white"
          style={{
            left: Math.min(Math.max(20, selX), window.innerWidth - 540),
            top: Math.min(Math.max(20, selY + selH + 15), window.innerHeight - 340),
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Распознавание & Перевод</span>
            </div>
            <button
              onClick={handleClose}
              className="text-zinc-400 hover:text-white p-1 rounded-md transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* OCR & Translation Content */}
          {loadingOcr ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-zinc-400">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span>Windows.Media.Ocr распознает текст...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {ocrText && (
                <div>
                  <div className="text-[11px] text-zinc-400 mb-0.5">Оригинал (OCR):</div>
                  <div className="bg-black/60 rounded-lg p-2 text-xs text-zinc-300 border border-zinc-800 font-mono max-h-24 overflow-y-auto">
                    {ocrText}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[11px] text-amber-400 font-semibold mb-0.5">Перевод:</div>
                <div className="bg-amber-950/20 rounded-lg p-3 text-sm font-medium text-amber-200 border border-amber-500/30 max-h-36 overflow-y-auto leading-relaxed">
                  {translatedText}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={loadingOcr || !translatedText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs rounded-lg border border-zinc-700 transition text-zinc-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано' : 'Копировать'}</span>
              </button>

              <button
                onClick={handleInsertIntoNote}
                disabled={loadingOcr || !translatedText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-bold rounded-lg shadow transition"
              >
                {inserted ? <Check className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                <span>В заметку</span>
              </button>
            </div>

            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Закрыть (Esc)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
