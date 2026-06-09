"use client";

import { useState, useEffect, useCallback } from "react";
import { Folder, Note } from "@/lib/types";
import QuickCapture from "@/components/QuickCapture";
import FolderSidebar from "@/components/FolderSidebar";
import NoteList from "@/components/NoteList";
import TodoList from "@/components/TodoList";
import SmartSearch from "@/components/SmartSearch";
import ExpenseStats from "@/components/ExpenseStats";
import { ToastContainer } from "@/components/Toast";

type ViewMode = "notes" | "todos";

export default function Home() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Array<Note & { folders: Folder[]; folder: Folder | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [noteCounts, setNoteCounts] = useState<Map<string, number>>(new Map());
  const [totalNotes, setTotalNotes] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("notes");

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const isExpenseFolder = selectedFolder
    ? selectedFolder.name.includes("账单") || selectedFolder.name.includes("记账") || selectedFolder.name.includes("消费")
    : false;

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    if (res.ok) setFolders(await res.json());
  }, []);

  const fetchNotes = useCallback(async (folderId?: string | null) => {
    setLoading(true);
    try {
      let url = "/api/notes";
      if (folderId && folderId !== "__uncategorized__") {
        url += `?folder_id=${encodeURIComponent(folderId)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        let notes = await res.json();
        if (folderId === "__uncategorized__") {
          notes = notes.filter((n: any) => !n.folders || n.folders.length === 0);
        }
        setNotes(notes);
      }
    } finally { setLoading(false); }
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const allNotes: any[] = await res.json();
        const counts = new Map<string, number>();
        allNotes.forEach((n) => {
          (n.folders || []).forEach((f: Folder) => {
            counts.set(f.id, (counts.get(f.id) ?? 0) + 1);
          });
        });
        setNoteCounts(counts);
        setTotalNotes(allNotes.length);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);
  useEffect(() => { if (viewMode === "notes") fetchNotes(selectedFolderId); }, [selectedFolderId, viewMode, fetchNotes]);
  useEffect(() => { fetchCounts(); }, [notes.length, fetchCounts]);

  const handleNoteCreated = useCallback(() => {
    fetchNotes(selectedFolderId);
    fetchFolders();
    fetchCounts();
  }, [selectedFolderId, fetchNotes, fetchFolders, fetchCounts]);

  const handleSelectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    setViewMode("notes");
    setSidebarOpen(false);
  }, []);

  const handleFoldersChanged = useCallback(() => {
    fetchFolders();
    fetchNotes(selectedFolderId);
    fetchCounts();
  }, [selectedFolderId, fetchFolders, fetchNotes, fetchCounts]);

  return (
    <div className="h-screen flex flex-col safe-area-inset bg-[#faf8f5]">
      {/* Header */}
      <header className="shrink-0 glass-card rounded-none border-b border-[#f0ede8] px-4 md:px-5 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 -ml-1 rounded-xl hover:bg-[#f0ede8] cursor-pointer"
          >
            <svg className="w-5 h-5 text-[#8b8580]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-purple-200">
            🧠
          </div>
          <h1 className="text-[15px] font-bold text-[#2d2a26] hidden md:block">记忆管家</h1>
        </div>

        {/* View tabs */}
        <div className="flex bg-[#f0ede8] rounded-xl p-0.5">
          <button
            onClick={() => { setViewMode("notes"); setSelectedFolderId(null); }}
            className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
              viewMode === "notes" ? "bg-white shadow-sm text-[#2d2a26]" : "text-[#8b8580]"
            }`}
          >
            📝 笔记
          </button>
          <button
            onClick={() => setViewMode("todos")}
            className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
              viewMode === "todos" ? "bg-white shadow-sm text-[#2d2a26]" : "text-[#8b8580]"
            }`}
          >
            📋 待办
          </button>
        </div>

        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, key: "k" }))}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8b8580] hover:text-[#6c5ce7] hover:bg-[#f0ede8] rounded-xl transition-all cursor-pointer font-medium"
        >
          🔍 <span className="hidden sm:inline">搜索</span>
          <kbd className="hidden sm:inline text-[10px] bg-[#e5e0d8] text-[#8b8580] px-1.5 py-0.5 rounded-md">⌘K</kbd>
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className={`fixed md:relative z-50 md:z-auto h-full transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}>
          <FolderSidebar
            folders={folders}
            selectedFolderId={viewMode === "notes" ? selectedFolderId : null}
            noteCounts={noteCounts}
            totalNotes={totalNotes}
            onSelectFolder={handleSelectFolder}
            onFoldersChanged={handleFoldersChanged}
          />
        </div>

        <main className="flex-1 overflow-y-auto pb-safe">
          {viewMode === "notes" && <QuickCapture onNoteCreated={handleNoteCreated} />}
          <div className="max-w-3xl mx-auto px-4 md:px-5 py-5">
            {viewMode === "todos" ? (
              <TodoList />
            ) : isExpenseFolder ? (
              <ExpenseStats />
            ) : (
              <NoteList notes={notes} folders={folders} loading={loading} onNoteChanged={handleNoteCreated} />
            )}
          </div>
        </main>
      </div>

      <SmartSearch folders={folders} onNoteChanged={handleNoteCreated} />
      <ToastContainer />
    </div>
  );
}
