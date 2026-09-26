import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  Code,
  Quote,
  Minus,
  Calculator,
  Zap
} from 'lucide-react';
import { autoCalculateExpressions } from '../utils/mathCalc';

interface NotepadEditorProps {
  noteId: string;
  content: string;
  onChange: (value: string) => void;
}

export const NotepadEditor: React.FC<NotepadEditorProps> = ({
  noteId,
  content,
  onChange,
}) => {
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [calcFlash, setCalcFlash] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  // Split lines for line numbers
  const lines = useMemo(() => {
    return content.split('\n');
  }, [content]);

  const totalLines = lines.length;
  const charCount = content.length;
  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [content]);

  // Update cursor position line & col
  const updateCursorPosition = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const textBefore = el.value.substring(0, el.selectionStart);
    const lineList = textBefore.split('\n');
    const curLine = lineList.length;
    const curCol = lineList[lineList.length - 1].length + 1;
    setCursorPos({ line: curLine, col: curCol });
  }, []);

  // Sync scroll between textarea and line numbers gutter
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Helper to insert or wrap text at selection
  const insertText = useCallback(
    (prefix: string, suffix: string = '', defaultText: string = '') => {
      const el = textareaRef.current;
      if (!el) return;

      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = el.value.substring(start, end);
      const textToWrap = selected || defaultText;
      const replacement = `${prefix}${textToWrap}${suffix}`;

      const newContent =
        el.value.substring(0, start) + replacement + el.value.substring(end);

      onChange(newContent);

      setTimeout(() => {
        el.focus();
        if (selected) {
          el.setSelectionRange(start, start + replacement.length);
        } else {
          el.setSelectionRange(
            start + prefix.length,
            start + prefix.length + textToWrap.length
          );
        }
        updateCursorPosition();
      }, 0);
    },
    [onChange, updateCursorPosition]
  );

  // Helper to prepend to current line (e.g. for '# ', '- ')
  const prependToCurrentLine = useCallback(
    (prefix: string) => {
      const el = textareaRef.current;
      if (!el) return;

      const pos = el.selectionStart;
      const textBefore = el.value.substring(0, pos);
      const lastNewline = textBefore.lastIndexOf('\n');
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

      const currentLineText = el.value.substring(
        lineStart,
        el.value.indexOf('\n', lineStart) === -1
          ? el.value.length
          : el.value.indexOf('\n', lineStart)
      );

      // If already starts with prefix, remove it (toggle off)
      let newContent: string;
      let newPos: number;
      if (currentLineText.startsWith(prefix)) {
        newContent =
          el.value.substring(0, lineStart) +
          currentLineText.substring(prefix.length) +
          el.value.substring(lineStart + currentLineText.length);
        newPos = Math.max(lineStart, pos - prefix.length);
      } else {
        newContent =
          el.value.substring(0, lineStart) +
          prefix +
          currentLineText +
          el.value.substring(lineStart + currentLineText.length);
        newPos = pos + prefix.length;
      }

      onChange(newContent);

      setTimeout(() => {
        el.focus();
        el.setSelectionRange(newPos, newPos);
        updateCursorPosition();
      }, 0);
    },
    [onChange, updateCursorPosition]
  );

  // Handle calculator formula insertion: output "[ ] =" with cursor in middle
  const handleInsertCalculator = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end).trim();

    if (selected) {
      const cleanExpr = selected
        .replace(/^\[\s*/, '')
        .replace(/\s*\](?:\s*=\s*[\d\.\-]+)?$/, '');
      const replacement = `[ ${cleanExpr} ] = `;
      const newContent =
        el.value.substring(0, start) + replacement + el.value.substring(end);
      onChange(newContent);

      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + replacement.length, start + replacement.length);
        updateCursorPosition();
      }, 0);
      return;
    }

    // Default: output empty space "[ ] = " with cursor right in the middle
    const replacement = '[  ] = ';
    const newContent =
      el.value.substring(0, start) + replacement + el.value.substring(end);
    onChange(newContent);

    setTimeout(() => {
      el.focus();
      // Place cursor between the brackets: [ | ] =
      el.setSelectionRange(start + 2, start + 2);
      updateCursorPosition();
    }, 0);
  }, [onChange, updateCursorPosition]);

  // Compute all formulas across the note
  const handleCalculateAll = useCallback(() => {
    const { newText, replaced } = autoCalculateExpressions(content);
    if (replaced) {
      onChange(newText);
    }
    setCalcFlash(true);
    setTimeout(() => setCalcFlash(false), 1200);
  }, [content, onChange]);

  // Smart keyboard shortcuts & auto-indent
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    if (!el) return;

    // Ctrl+B: Bold
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertText('**', '**', 'жирный текст');
      return;
    }

    // Ctrl+I: Italic
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertText('*', '*', 'курсив');
      return;
    }

    // Tab key: Insert 2 spaces (or unindent with Shift)
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = el.selectionStart;
      const end = el.selectionEnd;

      if (!e.shiftKey) {
        const val = el.value;
        const newContent = val.substring(0, start) + '  ' + val.substring(end);
        onChange(newContent);
        setTimeout(() => {
          el.setSelectionRange(start + 2, start + 2);
          updateCursorPosition();
        }, 0);
      } else {
        const textBefore = el.value.substring(0, start);
        const lastNewline = textBefore.lastIndexOf('\n');
        const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
        const lineText = el.value.substring(lineStart, end);

        if (lineText.startsWith('  ')) {
          const newContent =
            el.value.substring(0, lineStart) +
            lineText.substring(2) +
            el.value.substring(end);
          onChange(newContent);
          setTimeout(() => {
            el.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2));
            updateCursorPosition();
          }, 0);
        }
      }
      return;
    }

    // Enter key: Auto-indent & list continuation
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      const pos = el.selectionStart;
      const textBefore = el.value.substring(0, pos);
      const lastNewline = textBefore.lastIndexOf('\n');
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
      const currentLine = el.value.substring(lineStart, pos);

      // Bullet list continuation: - or *
      const bulletMatch = currentLine.match(/^(\s*[-*+]\s+)/);
      if (bulletMatch) {
        e.preventDefault();
        const prefix = bulletMatch[1];
        if (currentLine.trim() === '-' || currentLine.trim() === '*' || currentLine.trim() === '+') {
          const newContent =
            el.value.substring(0, lineStart) + el.value.substring(pos);
          onChange(newContent);
          setTimeout(() => {
            el.setSelectionRange(lineStart, lineStart);
            updateCursorPosition();
          }, 0);
          return;
        }

        const newPrefix = '\n' + prefix;
        const newContent =
          el.value.substring(0, pos) + newPrefix + el.value.substring(pos);
        onChange(newContent);
        setTimeout(() => {
          el.setSelectionRange(pos + newPrefix.length, pos + newPrefix.length);
          updateCursorPosition();
        }, 0);
        return;
      }

      // Preserve indentation spaces
      const indentMatch = currentLine.match(/^(\s+)/);
      if (indentMatch) {
        e.preventDefault();
        const spaces = '\n' + indentMatch[1];
        const newContent =
          el.value.substring(0, pos) + spaces + el.value.substring(pos);
        onChange(newContent);
        setTimeout(() => {
          el.setSelectionRange(pos + spaces.length, pos + spaces.length);
          updateCursorPosition();
        }, 0);
        return;
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e1014] text-zinc-100 overflow-hidden select-none">
      {/* 1. Tactical Notepad++ Toolbar */}
      <div className="h-9 px-2 bg-[#14161b] border-b border-zinc-800/80 flex items-center justify-between gap-1 select-none shrink-0 overflow-x-auto no-scrollbar">
        {/* Formatting Tools */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => prependToCurrentLine('# ')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition"
            title="Заголовок H1 (# )"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => prependToCurrentLine('## ')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition"
            title="Заголовок H2 (## )"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

          <button
            type="button"
            onClick={() => insertText('**', '**', 'жирный')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition font-bold"
            title="Жирный текст (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertText('*', '*', 'курсив')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition italic"
            title="Курсив (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertText('~~', '~~', 'зачёркнутый')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition"
            title="Зачёркнутый текст"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

          <button
            type="button"
            onClick={() => prependToCurrentLine('- ')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition"
            title="Маркированный список (- )"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertText('`', '`', 'код')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition font-mono"
            title="Код (inline)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => prependToCurrentLine('> ')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition"
            title="Цитата (> )"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertText('\n---\n', '', '')}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition"
            title="Разделительная линия (---)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

          {/* Calculator Formula Button with Hover Tooltip */}
          <div className="relative group/calc">
            <button
              type="button"
              onClick={handleInsertCalculator}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[11px] font-mono transition active:scale-95 cursor-pointer"
              title="[18*36+(12+26)] = 686"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              <span>[ ] =</span>
            </button>

            {/* Tactical Tooltip on Hover */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/calc:flex flex-col items-center pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-[#14161b] border border-amber-500/40 text-amber-300 text-[10px] font-mono py-1 px-2 rounded shadow-2xl whitespace-nowrap">
                [18*36+(12+26)] = 686
              </div>
              <div className="w-1.5 h-1.5 bg-[#14161b] border-r border-b border-amber-500/40 rotate-45 -mt-1"></div>
            </div>
          </div>

          {/* Calculate All Formulas Button */}
          <button
            type="button"
            onClick={handleCalculateAll}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium transition active:scale-95 ml-1"
            title="Вычислить все выражения в квадратных скобках [ ... ]"
          >
            <Zap className={`w-3.5 h-3.5 ${calcFlash ? 'text-emerald-400 animate-bounce' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">{calcFlash ? 'Посчитано!' : 'Посчитать'}</span>
          </button>
        </div>

        {/* Right Info Label */}
        <div className="text-[11px] font-mono text-zinc-500 pr-1 select-none">
          Notepad++
        </div>
      </div>

      {/* 2. Central Pure Text Editor Workspace (No mode switches, zero double-text) */}
      <div className="flex-1 flex overflow-hidden relative bg-[#0c0d11]">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          className="w-11 py-3 px-1 bg-[#101216] border-r border-zinc-800/80 text-right font-mono text-xs text-zinc-600 select-none overflow-hidden shrink-0 flex flex-col leading-[22px]"
        >
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const isCurrent = lineNum === cursorPos.line;
            return (
              <div
                key={lineNum}
                className={`pr-1 ${
                  isCurrent
                    ? 'text-amber-400 font-bold bg-amber-500/10 rounded-l'
                    : 'text-zinc-600'
                }`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Native OS Textarea (100% stable, zero duplicate text) */}
        <textarea
          key={noteId}
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            onChange(e.target.value);
            updateCursorPosition();
          }}
          onKeyUp={updateCursorPosition}
          onClick={updateCursorPosition}
          onSelect={updateCursorPosition}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          placeholder="Пишите заметки, гайды, квесты или формулы [18*36+(12+26)]..."
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="flex-1 h-full py-3 px-4 bg-transparent text-zinc-100 font-mono text-[14px] leading-[22px] outline-none border-none resize-none overflow-y-auto selection:bg-amber-500/30 selection:text-amber-200"
          style={{
            fontFamily: "'Consolas', 'Courier New', monospace",
            tabSize: 2,
          }}
        />
      </div>

      {/* 3. Tactical Status Bar */}
      <div className="h-6 px-2.5 bg-[#101217] border-t border-zinc-800/80 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-zinc-500 select-none shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <span className="text-zinc-400 shrink-0">
            Стр: <strong className="text-amber-400 font-semibold">{cursorPos.line}</strong>, Кол:{' '}
            <strong className="text-amber-400 font-semibold">{cursorPos.col}</strong>
          </span>
          <span className="text-zinc-700">|</span>
          <span className="shrink-0">Строк: {totalLines}</span>
          <span className="text-zinc-700 hidden md:inline">|</span>
          <span className="hidden md:inline">Слов: {wordCount}</span>
          <span className="text-zinc-700 hidden lg:inline">|</span>
          <span className="hidden lg:inline">Символов: {charCount}</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="text-zinc-400">UTF-8</span>
          <span className="text-zinc-700">|</span>
          <span className="text-amber-400/80">GameHUD</span>
        </div>
      </div>
    </div>
  );
};

export default NotepadEditor;
