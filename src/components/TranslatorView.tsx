import React, { useState } from 'react';
import {
  Languages,
  ArrowRightLeft,
  Copy,
  Check,
  PlusCircle,
  Sparkles,
  Trash2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { translateText } from '../utils/translator';

const LANGUAGES = [
  { code: 'auto', name: 'Автоопределение' },
  { code: 'en', name: 'Английский (EN)' },
  { code: 'ru', name: 'Русский (RU)' },
  { code: 'ja', name: 'Японский (JA)' },
  { code: 'ko', name: 'Корейский (KO)' },
  { code: 'zh-CN', name: 'Китайский (ZH)' },
  { code: 'de', name: 'Немецкий (DE)' },
  { code: 'fr', name: 'Французский (FR)' },
  { code: 'es', name: 'Испанский (ES)' },
];

export const TranslatorView: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('ru');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);

  const { appendNoteContent } = useAppStore();

  const handleTranslate = async (customText?: string) => {
    const textToTranslate = customText !== undefined ? customText : sourceText;
    if (!textToTranslate || !textToTranslate.trim()) {
      setTranslatedText('');
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await translateText(textToTranslate, targetLang, sourceLang);
      setTranslatedText(result);
    } catch (err: any) {
      console.error('Translation error:', err);
      const errMsg = err?.message || 'Ошибка сети при переводе';
      setError(errMsg);
      setTranslatedText(`Ошибка перевода: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Debounced translation (450ms)
  React.useEffect(() => {
    if (!sourceText.trim()) {
      setTranslatedText('');
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      handleTranslate(sourceText);
    }, 450);
    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang]);

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') return;
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertIntoNote = () => {
    if (!translatedText) return;
    const formatted = `\n> 🌐 **Перевод (${targetLang}):** ${translatedText}  \n> *(Исходный текст: ${sourceText})*\n`;
    appendNoteContent(formatted);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0c0e] p-4 sm:p-6 overflow-y-auto text-zinc-100 select-none">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-4">
        {/* Header Title */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Languages className="w-4 h-4 text-amber-400" />
            <span>Переводчик текста</span>
          </div>
          <span className="text-[11px] text-zinc-500">Автономный Google Translate</span>
        </div>

        {/* Dual-Pane Translator */}
        <div className="bg-[#14161b]/90 border border-zinc-800/80 rounded-xl p-5 shadow-lg flex flex-col gap-4">
          {/* Controls Bar: Source Lang <-> Target Lang */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            {/* Source selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">С языка:</span>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="bg-[#0e1014] border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/60"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwapLanguages}
              disabled={sourceLang === 'auto'}
              className="p-1.5 hover:bg-zinc-800 disabled:opacity-30 rounded-lg text-zinc-400 hover:text-amber-300 transition"
              title="Поменять языки местами"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            {/* Target selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">На язык:</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-[#0e1014] border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/60"
              >
                {LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Left & Right Text Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Input Text */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Исходный текст</span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-[11px]">{sourceText.length} симв.</span>
                  {sourceText && (
                    <button
                      onClick={() => setSourceText('')}
                      className="hover:text-red-400 flex items-center gap-1 text-[11px]"
                      title="Очистить поле ввода"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Очистить</span>
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleTranslate();
                  }
                }}
                placeholder="Введите текст или скопируйте диалог из игры... (Ctrl+Enter для перевода)"
                className="w-full h-56 p-3 bg-[#0e1014] border border-zinc-800 rounded-lg text-zinc-200 text-xs placeholder-zinc-600 outline-none focus:border-amber-500/60 resize-none font-sans leading-relaxed select-text"
              />
            </div>

            {/* Right: Output Text */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Результат перевода</span>
                {translatedText && (
                  <button onClick={handleCopy} className="hover:text-amber-300 text-zinc-400 flex items-center gap-1 text-[11px]">
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                )}
              </div>
              <div className="w-full h-56 p-3 bg-[#0e1014] border border-zinc-800 rounded-lg text-amber-200/90 text-xs overflow-y-auto leading-relaxed font-sans select-text">
                {translatedText || (
                  <span className="text-zinc-600 italic">Здесь появится результат перевода...</span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-red-950/40 border border-red-800/40 rounded-lg text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <button
              onClick={() => handleTranslate(sourceText)}
              disabled={loading || !sourceText.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 disabled:opacity-40 text-zinc-950 font-semibold text-xs rounded-lg shadow-md shadow-amber-500/10 active:scale-95 transition"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                  <span>Перевод...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Перевести (Ctrl+Enter)</span>
                </>
              )}
            </button>

            {translatedText && (
              <button
                onClick={handleInsertIntoNote}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/30 shadow active:scale-95 transition"
              >
                {inserted ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Вставлено в заметку!</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 text-amber-400" />
                    <span>Вставить в активную заметку</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default TranslatorView;
