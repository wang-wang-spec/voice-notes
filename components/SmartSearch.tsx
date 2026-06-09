"use client";

import { useState, useRef, useEffect } from "react";
import { Note, Folder } from "@/lib/types";
import NoteCard from "./NoteCard";

interface SmartSearchProps {
  folders: Folder[];
  onNoteChanged: () => void;
}

interface SearchResultItem {
  note: Note & { folders?: Folder[]; folder?: Folder | null };
  reason: string;
}

export default function SmartSearch({ folders, onNoteChanged }: SmartSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape to close
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setHasSearched(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) setIsOpen(false);
      }}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <span className="text-lg">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索你的笔记，如「上周关于产品的讨论」…"
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-300"
          />
          <kbd className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-3">
          {searching && (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-400">AI 正在搜索…</span>
            </div>
          )}

          {!searching && hasSearched && results.length === 0 && (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">🔎</div>
              <p className="text-sm text-gray-400">没有找到相关笔记</p>
            </div>
          )}

          {!searching &&
            results.map((r) => (
              <div key={r.note.id} className="mb-2">
                <div className="text-xs text-indigo-500 font-medium mb-1 px-1">
                  {r.reason}
                </div>
                <NoteCard
                  note={r.note}
                  allFolders={folders}
                  onNoteChanged={() => {
                    onNoteChanged();
                    handleSearch();
                  }}
                />
              </div>
            ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex items-center gap-3">
          <span>⌘K 打开搜索</span>
          <span>Enter 搜索</span>
          <span>ESC 关闭</span>
        </div>
      </div>
    </div>
  );
}
