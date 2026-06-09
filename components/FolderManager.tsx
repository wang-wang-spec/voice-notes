"use client";

import { useState } from "react";
import { Folder } from "@/lib/types";
import { showToast } from "./Toast";

const EMOJI_OPTIONS = ["📁","💼","🏠","💡","📖","✅","❤️","🎯","✈️","🍔","🎵","🏃","💰","🔧","🌟","🎨","🎮","📱","🎓","😊"];
const COLOR_OPTIONS = ["#6c5ce7","#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899","#8b5cf6","#06b6d4"];

interface FolderManagerProps {
  folders: Folder[];
  onFoldersChanged: () => void;
}

export default function FolderManager({ folders, onFoldersChanged }: FolderManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("#6c5ce7");
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => { setName(""); setIcon("📁"); setColor("#6c5ce7"); setEditingFolder(null); };

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      if (editingFolder) {
        const res = await fetch(`/api/folders/${editingFolder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), icon, color }),
        });
        if (!res.ok) throw new Error("Failed");
        showToast("文件夹已更新", "success");
      } else {
        const res = await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), icon, color }),
        });
        if (!res.ok) throw new Error("Failed");
        showToast(`文件夹「${name.trim()}」已创建`, "success");
      }
      setIsOpen(false); resetForm(); onFoldersChanged();
    } catch { showToast("操作失败", "error"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!editingFolder || !confirm(`确定删除「${editingFolder.name}」？笔记会移到未分类。`)) return;
    try {
      const res = await fetch(`/api/folders/${editingFolder.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      showToast("已删除", "info");
      setIsOpen(false); resetForm(); onFoldersChanged();
    } catch { showToast("删除失败", "error"); }
  };

  return (
    <>
      <button
        onClick={() => { resetForm(); setIsOpen(true); }}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-[#8b8580] hover:bg-white/60 hover:text-[#6c5ce7] transition-all cursor-pointer font-medium"
      >
        <span className="text-base">＋</span>
        <span>新建文件夹</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[#2d2a26] mb-4">
              {editingFolder ? "编辑文件夹" : "新建文件夹"}
            </h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="文件夹名称"
              className="w-full px-4 py-2.5 rounded-xl border border-[#e5e0d8] text-sm outline-none focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#a29bfe]/30 transition-all mb-3 bg-[#faf8f5]"
              autoFocus
            />
            <label className="text-[11px] font-medium text-[#b8b0a8] mb-1.5 block">图标</label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {EMOJI_OPTIONS.map((e) => (
                <button key={e} onClick={() => setIcon(e)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all cursor-pointer ${
                    icon === e ? "bg-[#6c5ce7]/10 ring-2 ring-[#6c5ce7]/30" : "hover:bg-[#f0ede8]"
                  }`}>{e}</button>
              ))}
            </div>
            <label className="text-[11px] font-medium text-[#b8b0a8] mb-1.5 block">颜色</label>
            <div className="flex gap-2 mb-4">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all cursor-pointer ${
                    color === c ? "ring-2 ring-offset-2 ring-[#6c5ce7]" : ""
                  }`} style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              {editingFolder && (
                <button onClick={handleDelete} className="px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer">🗑</button>
              )}
              <button onClick={() => setIsOpen(false)} className="flex-1 py-2.5 text-sm text-[#8b8580] hover:bg-[#f0ede8] rounded-xl transition-all cursor-pointer font-medium">取消</button>
              <button onClick={handleSubmit} disabled={!name.trim() || submitting}
                className="flex-1 py-2.5 text-sm btn-primary cursor-pointer disabled:opacity-40">
                {submitting ? "…" : editingFolder ? "保存" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
