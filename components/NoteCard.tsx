"use client";

import { Note, Folder, TodoItem } from "@/lib/types";
import { showToast } from "./Toast";

interface NoteCardProps {
  note: Note & { folders?: Folder[]; folder?: Folder | null };
  allFolders: Folder[];
  onNoteChanged: () => void;
}

export default function NoteCard({ note, allFolders, onNoteChanged }: NoteCardProps) {
  const timeStr = formatTime(note.recordedAt || note.createdAt);
  const folders = note.folders || (note.folder ? [note.folder] : []);

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("已删除", "info");
      onNoteChanged();
    } catch { showToast("删除失败", "error"); }
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    try {
      const newFolderIds = folderId ? [folderId] : [];
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderIds: newFolderIds }),
      });
      if (!res.ok) throw new Error("Move failed");
      showToast("已移动", "success");
      onNoteChanged();
    } catch { showToast("移动失败", "error"); }
  };

  const handleToggleTodo = async (todoId: string) => {
    try {
      const res = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id, todoId }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      onNoteChanged();
    } catch { showToast("操作失败", "error"); }
  };

  return (
    <div className="glass-card rounded-2xl p-5 transition-all duration-200 group animate-scale-in">
      {/* Content */}
      <p className="text-[15px] text-[#2d2a26] whitespace-pre-wrap leading-relaxed">
        {note.content}
      </p>

      {/* Todos */}
      {note.todos && note.todos.length > 0 && (
        <div className="mt-3 space-y-1">
          {note.todos.map((todo: TodoItem) => (
            <label
              key={todo.id}
              className="flex items-start gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-[#f8f5f0] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => handleToggleTodo(todo.id)}
                className="mt-0.5 w-4 h-4 rounded border-[#d5d0ca] text-[#6c5ce7] focus:ring-[#a29bfe] cursor-pointer"
              />
              <span className={`text-sm flex-1 ${todo.done ? "line-through text-[#b8b0a8]" : "text-[#5c5650]"}`}>
                {todo.content}
              </span>
              {todo.dueDate && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  todo.done ? "bg-[#f0ede8] text-[#b8b0a8]" : "bg-amber-50 text-amber-600"
                }`}>
                  📅 {todo.dueDate.slice(5)}
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center gap-2 text-xs text-[#b8b0a8] flex-wrap">
        {folders.map((f) => (
          <span key={f.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0ede8] text-[#6b6560] text-[11px] font-medium">
            {f.icon} {f.name}
          </span>
        ))}
        {note.source === "voice" && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-medium">🎤</span>
        )}
        {note.amount && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[11px] font-medium">
            ¥{note.amount}
          </span>
        )}
        <span className="ml-auto">{timeStr}</span>
        <div className="hidden group-hover:flex items-center gap-1">
          <select
            onChange={(e) => handleMoveToFolder(e.target.value || null)}
            value={note.folderIds?.[0] ?? ""}
            className="text-[11px] border border-[#e5e0d8] rounded-lg px-2 py-1 bg-white cursor-pointer text-[#8b8580]"
          >
            <option value="">未分类</option>
            {allFolders.map((f) => (
              <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
            ))}
          </select>
          <button onClick={handleDelete} className="text-[#b8b0a8] hover:text-red-500 px-1 py-1 transition-colors cursor-pointer">🗑</button>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (date.getFullYear() === now.getFullYear()) return `${month}月${day}日`;
  return `${date.getFullYear()}/${month}/${day}`;
}
