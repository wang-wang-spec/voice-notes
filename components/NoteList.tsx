"use client";

import { Note, Folder } from "@/lib/types";
import NoteCard from "./NoteCard";

interface NoteListProps {
  notes: Array<Note & { folders?: Folder[]; folder?: Folder | null }>;
  folders: Folder[];
  loading: boolean;
  onNoteChanged: () => void;
}

export default function NoteList({ notes, folders, loading, onNoteChanged }: NoteListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#a29bfe] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#b8b0a8]">加载中…</span>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-80">✨</div>
          <p className="text-sm text-[#8b8580] font-medium">还没有笔记</p>
          <p className="text-xs text-[#b8b0a8] mt-1.5">在上方输入框写下你的第一条笔记吧</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} allFolders={folders} onNoteChanged={onNoteChanged} />
      ))}
    </div>
  );
}
