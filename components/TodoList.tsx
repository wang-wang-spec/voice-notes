"use client";

import { useState, useEffect } from "react";
import { showToast } from "./Toast";

interface TodoEntry {
  noteId: string;
  noteContent: string;
  todo: {
    id: string;
    content: string;
    done: boolean;
    dueDate?: string;
    createdAt: string;
  };
  folderIds: string[];
}

export default function TodoList() {
  const [todos, setTodos] = useState<TodoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "all" | "done">("active");

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/todos");
      if (res.ok) setTodos(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTodos(); }, []);

  const handleToggle = async (noteId: string, todoId: string) => {
    try {
      const res = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, todoId }),
      });
      if (res.ok) {
        setTodos((prev) => prev.map((t) =>
          t.todo.id === todoId ? { ...t, todo: { ...t.todo, done: !t.todo.done } } : t
        ));
      }
    } catch { showToast("操作失败", "error"); }
  };

  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.todo.done;
    if (filter === "done") return t.todo.done;
    return true;
  });
  const activeCount = todos.filter((t) => !t.todo.done).length;
  const doneCount = todos.filter((t) => t.todo.done).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#a29bfe] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#b8b0a8]">加载待办…</span>
        </div>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-sm text-[#8b8580] font-medium">暂无待办事项</p>
        <p className="text-xs text-[#b8b0a8] mt-1.5">记录想法时如果包含待办事项，AI 会自动提取</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-[#2d2a26]">📋 待办清单</h2>
        <span className="text-xs text-[#b8b0a8]">{activeCount} 项待完成</span>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-[#f0ede8] rounded-xl p-1 w-fit">
        {([
          ["active", `待完成 ${activeCount}`],
          ["all", `全部 ${todos.length}`],
          ["done", `已完成 ${doneCount}`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filter === key ? "bg-white shadow-sm text-[#2d2a26]" : "text-[#8b8580]"
            }`}
          >
            {label}
          </button>
        ))}
        <button onClick={fetchTodos} className="ml-2 px-2 py-1.5 text-xs text-[#b8b0a8] hover:text-[#6c5ce7] cursor-pointer">🔄</button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((entry) => (
          <div
            key={entry.todo.id}
            className={`glass-card rounded-2xl p-4 flex items-start gap-3.5 transition-all ${
              entry.todo.done ? "opacity-60" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={entry.todo.done}
              onChange={() => handleToggle(entry.noteId, entry.todo.id)}
              className="mt-0.5 w-5 h-5 rounded-lg border-[#d5d0ca] text-[#6c5ce7] focus:ring-[#a29bfe] cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${entry.todo.done ? "line-through text-[#b8b0a8]" : "text-[#2d2a26] font-medium"}`}>
                {entry.todo.content}
              </p>
              <p className="text-xs text-[#b8b0a8] mt-1 truncate">
                📝 {entry.noteContent.slice(0, 60)}
              </p>
            </div>
            {entry.todo.dueDate && (
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium shrink-0 ${
                entry.todo.done ? "bg-[#f0ede8] text-[#b8b0a8]" : "bg-amber-50 text-amber-600"
              }`}>
                📅 {entry.todo.dueDate.slice(5)}
              </span>
            )}
            {entry.todo.done && <span className="text-lg shrink-0">✅</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
