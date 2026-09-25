import React, { useEffect, useState } from 'react';
import { Copy, Check, X, Languages, PlusCircle } from 'lucide-react';
import { HoverTranslateResult } from '../types';

interface HoverTranslateTooltipProps {
  data: HoverTranslateResult | null;
  onClose: () => void;
  onInsertToActiveNote: (text: string) => void;
}

export const HoverTranslateTooltip: React.FC<HoverTranslateTooltipProps> = ({
  data,
  onClose,
  onInsertToActiveNote,
}) => {
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(7);

  useEffect(() => {
    if (!data) return;
    setTimeLeft(7);
    setCopied(false);
    setInserted(false);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [data, onClose]);

  if (!data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(data.translated_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    const formatted = `\n> 🌐 **Перевод:** ${data.translated_text}  \n> *(Оригинал: ${data.original_text})*\n`;
    onInsertToActiveNote(formatted);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-[#14161b]/95 border border-amber-500/50 rounded-xl shadow-2xl p-4 backdrop-blur-md text-white flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <Languages className="w-4 h-4" />
            <span>Hover Translate (WinRT OCR)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
              {timeLeft}с
            </span>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Translation Output */}
        <div className="flex flex-col gap-1.5">
          <div className="text-xs text-zinc-400">Перевод на русский:</div>
          <div className="bg-amber-950/20 rounded-lg p-2.5 text-sm font-medium text-amber-200 border border-amber-500/30 max-h-32 overflow-y-auto">
            {data.translated_text || 'Текст не распознан'}
          </div>
        </div>

        {/* Original Text Preview */}
        {data.original_text && (
          <div className="flex flex-col gap-1">
            <div className="text-xs text-zinc-400">Распознанный текст:</div>
            <div className="text-xs text-zinc-300 bg-black/60 rounded p-2 italic truncate border border-zinc-800 font-mono">
              "{data.original_text}"
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium rounded-lg border border-zinc-700 text-zinc-200 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400">Скопировано</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Копировать</span>
              </>
            )}
          </button>

          <button
            onClick={handleInsert}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-xs font-bold rounded-lg text-black transition shadow-sm"
          >
            {inserted ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Вставлено!</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5" />
                <span>В заметку</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
