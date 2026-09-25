import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, FileText, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { invoke } from '@tauri-apps/api/core';

interface SearchResult {
  fileName: string;
  filePath: string;
  matches: string[];
}

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (filePath: string, fileName: string) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
}) => {
  const [query, setQuery] = useState('');
  const [fileContents, setFileContents] = useState<{ [path: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { allNoteFiles, loadNotesList } = useAppStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      loadAllContents();
    }
  }, [isOpen]);

  const loadAllContents = async () => {
    setLoading(true);
    await loadNotesList();
    const contents: { [path: string]: string } = {};

    for (const file of allNoteFiles) {
      try {
        const text = await invoke<string>('read_note_file', { path: file.name });
        contents[file.name] = text;
      } catch {
        // ignore error
      }
    }
    setFileContents(contents);
    setLoading(false);
  };

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return allNoteFiles.map((f) => ({
        fileName: f.name,
        filePath: f.name,
        matches: ['Нажмите Enter чтобы открыть заметку'],
      }));
    }

    const matchesList: SearchResult[] = [];

    for (const file of allNoteFiles) {
      const content = fileContents[file.name] || '';
      const nameMatch = file.name.toLowerCase().includes(q);
      const lines = content.split('\n');
      const matchingLines: string[] = [];

      lines.forEach((line) => {
        if (line.toLowerCase().includes(q)) {
          matchingLines.push(line.trim());
        }
      });

      if (nameMatch || matchingLines.length > 0) {
        matchesList.push({
          fileName: file.name,
          filePath: file.name,
          matches: matchingLines.slice(0, 3),
        });
      }
    }

    return matchesList;
  }, [query, allNoteFiles, fileContents]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      const res = results[selectedIndex];
      onSelectFile(res.filePath, res.fileName.replace(/\.md$/, ''));
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-xl mx-4 bg-slate-900/95 border border-cyan-500/40 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3 bg-slate-950/60">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            autoFocus
            type="text"
            className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-base font-medium"
            placeholder="Поиск по всем заметкам профиля... (↑↓ навигация, Enter выбор)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-white/10">
            Esc
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Сканирование заметок...
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Ничего не найдено по запросу «{query}»
            </div>
          ) : (
            results.map((res, idx) => (
              <div
                key={res.filePath}
                onClick={() => {
                  onSelectFile(res.filePath, res.fileName.replace(/\.md$/, ''));
                  onClose();
                }}
                className={`p-3 rounded-lg cursor-pointer transition flex flex-col gap-1 ${
                  idx === selectedIndex
                    ? 'bg-cyan-500/20 border border-cyan-500/40'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>{res.fileName}</span>
                  </div>
                  {idx === selectedIndex && (
                    <span className="flex items-center gap-1 text-xs text-cyan-400">
                      Открыть <ArrowRight className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {res.matches.length > 0 && (
                  <div className="text-xs text-slate-400 pl-6 space-y-0.5">
                    {res.matches.map((line, lIdx) => (
                      <div key={lIdx} className="truncate">
                        • {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 bg-slate-950/40 flex justify-between text-xs text-slate-400">
          <span>Найдено: {results.length} заметок</span>
          <span>GameHUD Instant Search</span>
        </div>
      </div>
    </div>
  );
};
