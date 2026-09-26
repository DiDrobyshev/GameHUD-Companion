import React, { useState } from 'react';
import {
  Keyboard,
  Gamepad2,
  Sliders,
  Plus,
  Check,
  Zap,
  Eye,
  EyeOff,
  ShieldCheck,
  Server,
  Globe,
  Bot,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { DEFAULT_AI_SYSTEM_INSTRUCTION } from '../services/aiService';

export const SettingsView: React.FC = () => {
  const {
    activeProfile,
    availableProfiles,
    switchProfile,
    createProfile,
    deleteProfile,
    mainOpacity,
    setMainOpacity,
    pipOpacity,
    setPipOpacity,
    hotkeys,
    aiConfig,
    setAIConfig,
  } = useAppStore();

  const [newProfileName, setNewProfileName] = useState('');
  const [createdMsg, setCreatedMsg] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [aiSavedMsg, setAiSavedMsg] = useState(false);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    await createProfile(newProfileName.trim());
    setNewProfileName('');
    setCreatedMsg(true);
    setTimeout(() => setCreatedMsg(false), 2000);
  };

  const handleSaveAi = () => {
    setAiSavedMsg(true);
    setTimeout(() => setAiSavedMsg(false), 2000);
  };

  // Determine normalized active provider
  const currentProvider =
    aiConfig.provider === 'Gemini' || aiConfig.provider === 'Gemini 2.5 Flash'
      ? 'Gemini'
      : aiConfig.provider === 'OpenRouter' || aiConfig.provider === 'OpenRouter (Любая модель)'
      ? 'OpenRouter'
      : 'Кастомный OpenAI';

  const HOTKEYS_LIST = [
    { label: 'Ghost Mode (Основной HUD)', key: hotkeys.ghostModeMain, desc: 'Сквозные клики мыши сквозь оверлей в игру' },
    { label: 'Ghost Mode (PiP плеер)', key: hotkeys.ghostModePip, desc: 'Сквозные клики сквозь окно видео в игру' },
    { label: 'Плавающая кнопка (Виджет)', key: hotkeys.toggleFloatingBubble || 'Alt+B', desc: 'Свернуть программу в мини-кнопку на экране или развернуть (Alt+B)' },
    { label: 'Стоп-кадр в чат с ИИ', key: hotkeys.snipperTool || 'Alt+S', desc: 'Снимок экрана для вопроса или перевода в чате ИИ (Alt+S)' },
    { label: 'Boss Key (PiP плеер)', key: hotkeys.bossKey, desc: 'Моментальное скрытие видео и отключение звука' },
    { label: 'Воспроизведение / Пауза (PiP)', key: hotkeys.playPausePip, desc: 'Управление видео без потери фокуса игры' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0c0e] p-6 overflow-y-auto text-zinc-100 select-none">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-6">

        {/* 1. AI Assistant Configuration (Simplified: Gemini, OpenRouter, Custom OpenAI) */}
        <div className="bg-[#14161b]/90 border border-zinc-800/80 rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Интеграция AI API & Нейросети</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-amber-300">
              Поддержка Vision / Скриншотов
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {/* Provider Selector Tabs */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-300 font-medium">Провайдер API:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAIConfig({
                      provider: 'Gemini',
                      modelName: 'gemini-2.5-flash',
                    })
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition text-center ${
                    currentProvider === 'Gemini'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-[#0e1014] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  Gemini
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAIConfig({
                      provider: 'OpenRouter',
                      modelName: aiConfig.modelName.includes('gemini') ? 'deepseek/deepseek-chat' : aiConfig.modelName,
                    })
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition text-center ${
                    currentProvider === 'OpenRouter'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-[#0e1014] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  OpenRouter
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAIConfig({
                      provider: 'Кастомный OpenAI',
                      modelName: aiConfig.modelName || 'gpt-4o-mini',
                      customEndpoint: aiConfig.customEndpoint || 'https://api.openai.com/v1',
                    })
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition text-center ${
                    currentProvider === 'Кастомный OpenAI'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-[#0e1014] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  Кастомный OpenAI
                </button>
              </div>
            </div>

            {/* Provider-Specific Configuration */}
            {currentProvider === 'Gemini' && (
              <div className="flex flex-col gap-3 p-3 bg-[#0e1014]/60 border border-zinc-800/80 rounded-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Модель:</span>
                  <span className="font-mono text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Gemini 2.5 Flash (Бесплатно)
                  </span>
                </div>
              </div>
            )}

            {currentProvider === 'OpenRouter' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <label className="font-medium">Модель:</label>
                  <a
                    href="https://openrouter.ai/models"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 text-[11px] underline"
                  >
                    Каталог моделей OpenRouter ↗
                  </a>
                </div>
                <input
                  type="text"
                  value={aiConfig.modelName}
                  onChange={(e) => setAIConfig({ modelName: e.target.value })}
                  placeholder="deepseek/deepseek-chat"
                  className="bg-[#0e1014] border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 outline-none focus:border-amber-500/60 font-mono"
                />
              </div>
            )}

            {currentProvider === 'Кастомный OpenAI' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-300 font-medium flex items-center gap-1">
                    <Server className="w-3.5 h-3.5 text-amber-400" />
                    <span>Base URL:</span>
                  </label>
                  <input
                    type="text"
                    value={aiConfig.customEndpoint || ''}
                    onChange={(e) => setAIConfig({ customEndpoint: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="bg-[#0e1014] border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-300 font-medium">Модель:</label>
                  <input
                    type="text"
                    value={aiConfig.modelName}
                    onChange={(e) => setAIConfig({ modelName: e.target.value })}
                    placeholder="gpt-4o-mini"
                    className="bg-[#0e1014] border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>
              </div>
            )}

            {/* API Key Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span className="font-medium">API-ключ:</span>
                <a
                  href={
                    currentProvider === 'Gemini'
                      ? 'https://aistudio.google.com/app/apikey'
                      : currentProvider === 'OpenRouter'
                      ? 'https://openrouter.ai/keys'
                      : 'https://platform.openai.com/api-keys'
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 text-[11px] underline"
                >
                  Получить ключ ↗
                </a>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={aiConfig.apiKey}
                  onChange={(e) => setAIConfig({ apiKey: e.target.value })}
                  placeholder={
                    currentProvider === 'Gemini'
                      ? 'AIzaSy...'
                      : currentProvider === 'OpenRouter'
                      ? 'sk-or-v1-...'
                      : 'sk-...'
                  }
                  className="w-full bg-[#0e1014] border border-zinc-800 rounded-lg p-2.5 pr-10 text-xs text-zinc-200 outline-none focus:border-amber-500/60 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 text-zinc-500 hover:text-zinc-300"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* AI System Instruction Section (Collapsible) */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#0e1014]/60">
              <button
                type="button"
                onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-zinc-800/40 transition"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">
                      Инструкция для ИИ (Роль игрового напарника / System Prompt)
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Специализация по играм, гайдам, билдам и автоматический уход от роли при системных вопросах
                    </div>
                  </div>
                </div>
                {showSystemPrompt ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {showSystemPrompt && (
                <div className="p-3 pt-0 flex flex-col gap-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-zinc-400">Текст инструкции:</span>
                    <button
                      type="button"
                      onClick={() => setAIConfig({ systemPrompt: DEFAULT_AI_SYSTEM_INSTRUCTION })}
                      className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                      title="Восстановить заводскую инструкцию"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Сбросить по умолчанию</span>
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={
                      aiConfig.systemPrompt !== undefined
                        ? aiConfig.systemPrompt
                        : DEFAULT_AI_SYSTEM_INSTRUCTION
                    }
                    onChange={(e) => setAIConfig({ systemPrompt: e.target.value })}
                    className="w-full p-2.5 bg-[#0b0c0e] border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none focus:border-amber-500/60 font-mono leading-relaxed resize-y select-text"
                  />
                </div>
              )}
            </div>

            {/* Web Search Toggle & Save confirmation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiConfig.webSearchEnabled}
                  onChange={(e) => setAIConfig({ webSearchEnabled: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>Поиск в сети (Google Search / Grounding)</span>
                </div>
              </label>

              <button
                onClick={handleSaveAi}
                className="px-4 py-1.5 text-xs font-semibold text-zinc-950 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 rounded-md transition-all shadow-md shadow-amber-500/10 active:scale-95 flex items-center gap-1.5 self-end"
              >
                {aiSavedMsg ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Сохранено!</span>
                  </>
                ) : (
                  <span>Сохранить настройки AI</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Global Hotkeys Cheatsheet */}
        <div className="bg-[#14161b]/90 border border-zinc-800/80 rounded-xl p-5 shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
              <Keyboard className="w-4 h-4" />
              <span>Глобальные горячие клавиши (Hotkeys)</span>
            </div>
            <span className="text-[11px] text-zinc-400">Работают поверх любых игр</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {HOTKEYS_LIST.map((hk) => (
              <div
                key={hk.label}
                className="flex items-center justify-between p-3 bg-[#0e1014] rounded-lg border border-zinc-800/80 hover:border-amber-500/30 transition"
              >
                <div>
                  <div className="text-xs font-semibold text-zinc-200">{hk.label}</div>
                  <div className="text-[10px] text-zinc-500">{hk.desc}</div>
                </div>
                <kbd className="px-2 py-1 bg-zinc-900 border border-amber-500/30 text-amber-300 text-xs font-mono rounded shadow-inner">
                  {hk.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Game Profiles Manager */}
        <div className="bg-[#14161b]/90 border border-zinc-800/80 rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
              <Gamepad2 className="w-4 h-4" />
              <span>Игровые профили заметок</span>
            </div>
            <span className="text-[11px] text-zinc-400">
              Автономные наборы вкладок для каждой игры
            </span>
          </div>

          {/* Active Profile Selection */}
          <div className="flex flex-wrap items-center gap-2">
            {availableProfiles.map((p) => {
              const isActive = p === activeProfile;
              return (
                <div
                  key={p}
                  className={`flex items-center rounded-lg text-xs font-medium border transition ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm'
                      : 'bg-[#0e1014] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => switchProfile(p)}
                    className="px-3 py-1.5 cursor-pointer"
                  >
                    {p}
                  </button>
                  {p !== 'default' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProfile(p);
                      }}
                      className="pr-2 pl-0.5 py-1.5 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                      title={`Удалить профиль "${p}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Create Profile Form */}
          <form onSubmit={handleCreateProfile} className="flex gap-2 pt-2 border-t border-zinc-800/80">
            <input
              type="text"
              placeholder="Название новой игры (напр. cyberpunk2077)..."
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#0e1014] border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-amber-500/60 font-mono"
            />
            <button
              type="submit"
              disabled={!newProfileName.trim()}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-950 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 disabled:opacity-40 rounded-lg transition-all shadow-md shadow-amber-500/10 active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать</span>
            </button>
          </form>
          {createdMsg && <div className="text-xs text-amber-400">Профиль успешно создан и активирован!</div>}
        </div>

        {/* 4. Overlay Transparency Sliders */}
        <div className="bg-[#14161b]/90 border border-zinc-800/80 rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-400 border-b border-zinc-800 pb-2.5">
            <Sliders className="w-4 h-4" />
            <span>Прозрачность окон HUD</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Прозрачность главного окна:</span>
                <span className="font-mono text-amber-400 font-bold">{mainOpacity}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={mainOpacity}
                onChange={(e) => setMainOpacity(Number(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Прозрачность мини-плеера PiP:</span>
                <span className="font-mono text-amber-400 font-bold">{pipOpacity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={pipOpacity}
                onChange={(e) => setPipOpacity(Number(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 5. System Tray Notice */}
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-3 text-xs text-zinc-400">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            При закрытии на крестик <strong className="text-zinc-200">✕</strong> приложение бесшумно
            сворачивается в системный трей Windows. Клик по иконке в трее открывает этот Центр
            Управления.
          </span>
        </div>
      </div>
    </div>
  );
};
export default SettingsView;
