import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  Globe,
  ChevronUp,
  ChevronDown,
  Send,
  FilePlus,
  Trash2,
  Settings,
  Sparkles,
  Loader2,
  Check,
  Camera,
  X
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface AIDockProps {
  onOpenSettings: () => void;
}

export const AIDock: React.FC<AIDockProps> = ({ onOpenSettings }) => {
  const {
    aiConfig,
    setAIConfig,
    chatMessages,
    isAILoading,
    isAIDockExpanded,
    setAIDockExpanded,
    sendChatMessage,
    clearChatHistory,
    appendNoteContent,
    pendingScreenshot,
    setPendingScreenshot,
    captureScreenToAIDraft,
  } = useAppStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (isAIDockExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAIDockExpanded, isAILoading]);

  // Focus input when pending screenshot is loaded
  useEffect(() => {
    if (pendingScreenshot) {
      inputRef.current?.focus();
    }
  }, [pendingScreenshot]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAILoading) return;

    if (pendingScreenshot) {
      const query =
        inputPrompt.trim() ||
        'Переведи весь текст с этого скриншота на русский язык подробно и понятно для игрока:';
      const rawBase64 = pendingScreenshot.replace(/^data:image\/[a-z]+;base64,/, '');
      setPendingScreenshot(null);
      setInputPrompt('');
      await sendChatMessage(query, rawBase64);
      return;
    }

    if (!inputPrompt.trim()) return;

    const query = inputPrompt.trim();
    setInputPrompt('');
    await sendChatMessage(query);
  };

  const handleCaptureAndTranslate = async () => {
    if (isAILoading) return;
    await captureScreenToAIDraft();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleAppendToNote = (content: string, id: string) => {
    const formatted = `\n\n> ⚡ **AI-Ассистент:**\n${content}\n`;
    appendNoteContent(formatted);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="border-t border-zinc-800/80 bg-[#101217]/95 backdrop-blur-xl shrink-0 transition-all duration-200">
      {/* 1. Expanded History Terminal (~220px) */}
      {isAIDockExpanded && (
        <div className="h-56 flex flex-col border-b border-zinc-800/60 bg-[#0e1014]/90 overflow-hidden">
          {/* Terminal Header */}
          <div className="h-8 px-3 border-b border-zinc-800/70 bg-[#14161c]/80 flex items-center justify-between text-[11px] text-zinc-400 select-none">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>AI КОНСОЛЬ</span>
              </span>
              <span className="text-zinc-600">|</span>
              <span className="font-mono text-zinc-400 text-[10px]">
                {aiConfig.provider} ({aiConfig.modelName || 'gemini-2.5-flash'})
              </span>
              {aiConfig.webSearchEnabled && (
                <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded font-mono text-[9px]">
                  <Globe className="w-2.5 h-2.5" /> Web Search
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCaptureAndTranslate}
                disabled={isAILoading}
                className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 rounded border border-amber-500/40 transition active:scale-95"
                title="Сделать скриншот экрана и перевести текст с картинки через AI Vision"
              >
                <Camera className="w-3 h-3 text-amber-400" />
                <span>Скриншот в AI</span>
              </button>

              {!aiConfig.apiKey && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30"
                >
                  <Settings className="w-3 h-3" />
                  <span>Указать ключ</span>
                </button>
              )}

              <button
                type="button"
                onClick={clearChatHistory}
                className="hover:text-zinc-200 text-zinc-400 p-1 rounded"
                title="Очистить историю"
              >
                <Trash2 className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setAIDockExpanded(false)}
                className="hover:text-zinc-200 text-zinc-400 p-1 rounded"
                title="Свернуть консоль"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
            {chatMessages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`text-xs leading-relaxed max-w-[88%] rounded-lg px-3 py-2 ${
                      isUser
                        ? 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-100 shadow-sm'
                        : 'bg-[#14161b] border border-zinc-800/80 text-zinc-200 shadow-md'
                    }`}
                  >
                    {msg.imageBase64 && (
                      <div className="mb-2 max-w-xs overflow-hidden rounded border border-zinc-700/60 bg-black/40">
                        <img
                          src={
                            msg.imageBase64.startsWith('data:')
                              ? msg.imageBase64
                              : `data:image/png;base64,${msg.imageBase64}`
                          }
                          alt="Скриншот экрана"
                          className="max-h-36 object-contain w-full"
                        />
                      </div>
                    )}

                    <div className="whitespace-pre-wrap select-text">{msg.content}</div>

                    {!isUser && msg.id !== 'ai-welcome' && (
                      <div className="mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between gap-3">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => handleAppendToNote(msg.content, msg.id)}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition active:scale-95"
                          title="Дописать этот ответ в конец текущей заметки"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Добавлено!</span>
                            </>
                          ) : (
                            <>
                              <FilePlus className="w-3 h-3" />
                              <span>В заметку</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isAILoading && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Игровой ассистент анализирует экран и базы данных...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Pending Preloaded Screenshot Preview */}
      {pendingScreenshot && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-2 text-xs select-none">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={pendingScreenshot}
              alt="Скриншот экрана"
              className="w-12 h-8 object-cover rounded border border-amber-500/50 shrink-0 bg-black"
            />
            <div className="overflow-hidden">
              <div className="text-amber-300 font-semibold text-[11px] truncate">
                Скриншот прикреплен к вопросу
              </div>
              <div className="text-zinc-400 text-[10px] truncate">
                Напишите вопрос или нажмите Enter для автоматического перевода
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPendingScreenshot(null)}
            className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60 rounded transition shrink-0"
            title="Открепить скриншот"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Compact Bottom Bar (~42px) */}
      <form
        onSubmit={handleSubmit}
        className="h-11 px-3 flex items-center justify-between gap-2 select-none"
      >
        {/* Left: AI Icon + Input */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1 text-amber-400 font-semibold text-xs shrink-0 select-none">
            <Zap className="w-4 h-4 fill-amber-400" />
            <span className="font-mono text-[11px] tracking-wider text-amber-400 hidden sm:inline">AI</span>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={
              pendingScreenshot
                ? 'Задай вопрос по скриншоту (или Enter для перевода)...'
                : 'Спроси о билде, квесте или нажми [Скриншот]...'
            }
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none border-none py-1.5 focus:ring-0 min-w-0"
          />
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Screenshot to AI Translation Button */}
          <button
            type="button"
            onClick={handleCaptureAndTranslate}
            disabled={isAILoading}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-all active:scale-95 shrink-0"
            title="Сделать стоп-кадр экрана и прикрепить к вопросу в AI (Alt+S)"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[11px]">Скриншот в AI</span>
          </button>

          {/* Web Search Toggle */}
          <button
            type="button"
            onClick={() => setAIConfig({ webSearchEnabled: !aiConfig.webSearchEnabled })}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border transition-all active:scale-95 shrink-0 ${
              aiConfig.webSearchEnabled
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
                : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
            }`}
            title={aiConfig.webSearchEnabled ? 'Поиск в сети включен (Google Search)' : 'Включить веб-поиск'}
          >
            <Globe className={`w-3.5 h-3.5 ${aiConfig.webSearchEnabled ? 'text-amber-400' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline text-[11px]">Web Search</span>
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputPrompt.trim() && !pendingScreenshot) || isAILoading}
            className="px-3 py-1 text-xs font-semibold text-zinc-950 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 disabled:opacity-40 rounded-md transition-all shadow-md shadow-amber-500/10 active:scale-95 flex items-center gap-1 shrink-0"
            title="Отправить запрос (Enter)"
          >
            {isAILoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Expand / Collapse Terminal Button */}
          <button
            type="button"
            onClick={() => setAIDockExpanded(!isAIDockExpanded)}
            className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/60 rounded-md transition-colors border border-transparent hover:border-zinc-700/50"
            title={isAIDockExpanded ? 'Свернуть историю' : 'Развернуть историю чата'}
          >
            {isAIDockExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
