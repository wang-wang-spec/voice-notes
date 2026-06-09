"use client";

import { Folder } from "@/lib/types";
import FolderManager from "./FolderManager";

interface FolderSidebarProps {
  folders: Folder[];
  selectedFolderId: string | null;
  noteCounts: Map<string, number>;
  totalNotes: number;
  onSelectFolder: (folderId: string | null) => void;
  onFoldersChanged: () => void;
}

export default function FolderSidebar({
  folders, selectedFolderId, noteCounts, totalNotes,
  onSelectFolder, onFoldersChanged,
}: FolderSidebarProps) {
  const uncategorizedCount = totalNotes - folders.reduce((sum, f) => sum + (noteCounts.get(f.id) ?? 0), 0);

  const btnClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
      active
        ? "bg-white shadow-sm text-[#6c5ce7] font-semibold ring-1 ring-[#e5e0d8]"
        : "text-[#6b6560] hover:bg-white/60 hover:text-[#2d2a26]"
    }`;

  return (
    <aside className="w-56 shrink-0 border-r border-[#f0ede8] bg-[#f5f3f0]/50 flex flex-col h-full">
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-[11px] font-bold text-[#b8b0a8] uppercase tracking-widest">文件夹</h2>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        <button onClick={() => onSelectFolder(null)} className={btnClass(selectedFolderId === null)}>
          <span className="text-base">📝</span>
          <span className="flex-1 text-left">全部笔记</span>
          <span className="text-xs text-[#b8b0a8] font-medium">{totalNotes}</span>
        </button>

        {uncategorizedCount > 0 && (
          <button onClick={() => onSelectFolder("__uncategorized__")} className={btnClass(selectedFolderId === "__uncategorized__")}>
            <span className="text-base">📋</span>
            <span className="flex-1 text-left">未分类</span>
            <span className="text-xs text-[#b8b0a8] font-medium">{uncategorizedCount}</span>
          </button>
        )}

        <div className="my-2 mx-3 border-t border-[#e5e0d8]" />

        {folders.map((folder) => (
          <button key={folder.id} onClick={() => onSelectFolder(folder.id)} className={btnClass(selectedFolderId === folder.id)}>
            <span className="text-base">{folder.icon}</span>
            <span className="flex-1 text-left truncate">{folder.name}</span>
            <span className="text-xs text-[#b8b0a8] font-medium">{noteCounts.get(folder.id) ?? 0}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-[#f0ede8]">
        <FolderManager folders={folders} onFoldersChanged={onFoldersChanged} />
      </div>
    </aside>
  );
}
