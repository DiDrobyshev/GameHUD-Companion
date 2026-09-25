import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  X,
  RotateCcw,
  Search,
  Calculator,
  Columns,
  Eye,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  ListTodo
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { QuickSearchModal } from './QuickSearchModal';

export const NotesView: React.FC = () => {
  const {
    tabs,
    activeTabId,
    activeNoteContent,
    checkboxStats,
    isSavingNote,
    setActiveTab,
    updateContent,
    addTab,
    closeTab,
    renameTab,
    reorderTabs,
    toggleCheckboxInNote,
    resetAllCheckboxes,
    evaluateCalculations,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabTitle, setEditingTabTitle] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [calculatorTriggered, setCalculatorTriggered] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcut listener for Ctrl+F / Ctrl+Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.code === 'Space') || (e.ctrlKey && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle typing in editor: check for math expression calculation on Space or Enter
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      // Evaluate inline math before or on Space/Enter
      setTimeout(() => {
        evaluateCalculations();
      }, 10);
    }
  };

  const handleManualCalc = () => {
    evaluateCalculations();
    setCalculatorTriggered(true);
    setTimeout(() => setCalculatorTriggered(false), 1500);
  };

  const handleStartRename = (tabId: string, currentTitle: string) => {
    setEditingTabId(tabId);
    setEditingTabTitle(currentTitle);
  };

  const handleFinishRename = (tabId: string) => {
    if (editingTabTitle.trim()) {
      renameTab(tabId, editingTabTitle.trim());
    }
    setEditingTabId(null);
  };

  const moveTab = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tabs.length) return;
    const newTabs = [...tabs];
    const [moved] = newTabs.splice(index, 1);
    newTabs.splice(targetIndex, 0, moved);
    reorderTabs(newTabs);
  };

  // Render markdown lines with interactive checkboxes
  const renderInteractiveMarkdown = (text: string) => {
    const lines = text.split('\n');
    let checkboxCounter = 0;

    return (
      <div className="markdown-body space-y-1 select-text">
        {lines.map((line, lineIdx) => {
          // Check for task item: "- [ ]", "- [x]", "* [ ]", "* [x]"
          const taskMatch = line.match(/^([ \t]*[-*+]\s+\[)([ xX])(\])(.*)/);
          if (taskMatch) {
            const thisCheckboxIdx = checkboxCounter;
            checkboxCounter++;
            const isChecked = taskMatch[2].toLowerCase() === 'x';
            const labelText = taskMatch[4];

            return (
              <div
                key={lineIdx}
                className="flex items-start gap-2.5 py-1 px-2 rounded hover:bg-white/5 transition group cursor-pointer"
                onClick={() => toggleCheckboxInNote(thisCheckboxIdx)}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCheckboxInNote(thisCheckboxIdx)}
                  className="mt-1 w-4 h-4 rounded border-cyan-500/40 text-cyan-500 bg-slate-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span
                  className={`text-sm select-text ${
                    isChecked
                      ? 'line-through text-slate-500 dark:text-slate-500'
                      : 'text-slate-200'
                  }`}
                >
                  {labelText}
                </span>
              </div>
            );
          }

          // Headers
          if (line.startsWith('# ')) {
            return (
              <h1 key={lineIdx} className="text-xl font-bold text-cyan-400 mt-3 mb-2 border-b border-white/10 pb-1">
                {line.substring(2)}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={lineIdx} className="text-lg font-semibold text-indigo-300 mt-2 mb-1.5">
                {line.substring(3)}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={lineIdx} className="text-base font-medium text-emerald-400 mt-2 mb-1">
                {line.substring(4)}
              </h3>
            );
          }

          // Blockquote
          if (line.startsWith('> ')) {
            return (
              <blockquote key={lineIdx} className="border-l-4 border-cyan-500 bg-cyan-950/20 px-3 py-1.5 rounded-r my-2 text-sm text-cyan-200">
                {line.substring(2)}
              </blockquote>
            );
          }

          // Horizontal rule
          if (line.trim() === '---') {
            return <hr key={lineIdx} className="border-white/10 my-3" />;
          }

          // Empty line
          if (!line.trim()) {
            return <div key={lineIdx} className="h-2" />;
          }

          // Tables
          if (line.startsWith('|')) {
            const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
            if (cells.some((c) => c.includes('---'))) {
              return null; // separator row
            }
            return (
              <div key={lineIdx} className="grid grid-flow-col auto-cols-fr gap-2 border-b border-white/5 py-1 text-xs">
                {cells.map((c, cIdx) => (
                  <div key={cIdx} className="truncate text-slate-300 px-1 font-mono">
                    {c.trim()}
                  </div>
                ))}
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={lineIdx} className="text-sm text-slate-300 leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/60 backdrop-blur-md">
      {/* 1. Tab Bar */}
      <div className="h-9 bg-slate-900/80 border-b border-white/10 flex items-center justify-between px-2 shrink-0 select-none overflow-x-auto">
        <div className="flex items-center gap-1 overflow-x-auto max-w-[80%] py-1">
          {tabs.map((tab, idx) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group flex items-center gap-1.5 px-3 py-1 rounded-t-md text-xs font-medium cursor-pointer border-t border-x transition shrink-0 ${
                tab.id === activeTabId
                  ? 'bg-slate-800 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/10'
              }`}
            >
              {/* Move Tab Left/Right buttons */}
              {idx > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveTab(idx, 'left');
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-cyan-400 p-0.5 rounded transition"
                  title="Переместить влево"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
              )}

              {/* Title or Inline Edit */}
              {editingTabId === tab.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editingTabTitle}
                  onChange={(e) => setEditingTabTitle(e.target.value)}
                  onBlur={() => handleFinishRename(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename(tab.id);
                    if (e.key === 'Escape') setEditingTabId(null);
                  }}
                  className="bg-slate-950 text-white px-1 py-0.5 rounded outline-none border border-cyan-500 w-24 text-xs"
                />
              ) : (
                <span
                  onDoubleClick={() => handleStartRename(tab.id, tab.title)}
                  className="truncate max-w-[140px]"
                  title="Дабл-клик для переименования"
                >
                  {tab.title}
                </span>
              )}

              {idx < tabs.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveTab(idx, 'right');
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-cyan-400 p-0.5 rounded transition"
                  title="Переместить вправо"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}

              {/* Close Tab Button */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 hover:bg-rose-500/20 hover:text-rose-300 rounded text-slate-500 transition"
                  title="Закрыть вкладку"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Add New Tab */}
          <button
            onClick={() => addTab()}
            className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-cyan-400 rounded-md transition shrink-0"
            title="Добавить новую заметку"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View mode buttons & Search trigger */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-xs text-slate-300 border border-white/5 transition"
            title="Быстрый поиск (Ctrl+Space)"
          >
            <Search className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">Поиск</span>
            <kbd className="hidden lg:inline text-[9px] bg-black/40 px-1 rounded text-slate-400">Ctrl+Space</kbd>
          </button>

          <div className="flex items-center bg-slate-800 rounded p-0.5 border border-white/5">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-1 rounded text-xs transition ${
                viewMode === 'edit' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Только редактор"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1 rounded text-xs transition ${
                viewMode === 'split' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Разделенный экран (Редактор + Интерактив)"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1 rounded text-xs transition ${
                viewMode === 'preview' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Интерактивный просмотр"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Checkbox & Routine Progress Bar */}
      <div className="h-10 bg-slate-900/60 border-b border-white/5 px-3 flex items-center justify-between gap-4 select-none shrink-0">
        {/* Progress Tracker */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 shrink-0">
            <ListTodo className="w-4 h-4 text-cyan-400" />
            <span>
              Задачи: {checkboxStats.checked} из {checkboxStats.total} ({checkboxStats.percentage}%)
            </span>
          </div>

          <div className="flex-1 bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${checkboxStats.percentage}%` }}
            />
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2">
          {/* Reset All Checkboxes Button */}
          {checkboxStats.total > 0 && (
            <button
              onClick={resetAllCheckboxes}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md border border-white/10 transition"
              title="Сбросить все чекбоксы на неотмеченные для ежедневной рутины"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Сбросить всё</span>
            </button>
          )}

          {/* Calculator Trigger */}
          <button
            onClick={handleManualCalc}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border transition ${
              calculatorTriggered
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
            }`}
            title="Вычислить все выражения '12 * (4 + 18) ='"
          >
            <Calculator className="w-3 h-3 text-cyan-400" />
            <span>{calculatorTriggered ? 'Посчитано!' : 'Калькулятор'}</span>
          </button>

          {/* Save Status */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400 px-2 py-0.5 bg-black/30 rounded border border-white/5">
            {isSavingNote ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                <span>Сохранение...</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Сохранено</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Editor & Preview Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div
            className={`flex-1 flex flex-col h-full bg-slate-950/40 ${
              viewMode === 'split' ? 'border-r border-white/10' : ''
            }`}
          >
            <div className="px-3 py-1 bg-slate-900/40 border-b border-white/5 text-[11px] text-slate-500 flex justify-between select-none">
              <span>MARKDOWN РЕДАКТОР</span>
              <span className="text-slate-500">Автокалькулятор на Space/Enter</span>
            </div>
            <textarea
              ref={textareaRef}
              value={activeNoteContent}
              onChange={(e) => updateContent(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              placeholder="Пишите заметки в Markdown...
- [ ] Кликабельная задача
12 * (4 + 18) = (посчитается само)"
              className="flex-1 w-full p-4 bg-transparent text-slate-100 placeholder-slate-600 font-mono text-sm leading-relaxed resize-none outline-none overflow-y-auto selection:bg-cyan-500/30"
              spellCheck={false}
            />
          </div>
        )}

        {/* Interactive Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 flex flex-col h-full bg-slate-900/20 overflow-y-auto">
            <div className="px-3 py-1 bg-slate-900/40 border-b border-white/5 text-[11px] text-slate-500 flex justify-between select-none">
              <span>ИНТЕРАКТИВНЫЙ РЕЖИМ (Кликабельные чекбоксы)</span>
              <span className="text-cyan-400">Кликните на чекбокс для отметки</span>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {renderInteractiveMarkdown(activeNoteContent)}
            </div>
          </div>
        )}
      </div>

      {/* Quick Search Modal */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectFile={async (filePath, fileName) => {
          // Check if tab already exists, otherwise add it
          const existing = tabs.find((t) => t.filePath === filePath);
          if (existing) {
            await setActiveTab(existing.id);
          } else {
            await addTab(fileName, filePath);
          }
        }}
      />
    </div>
  );
};
