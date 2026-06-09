"use client";

import { useState, useEffect } from "react";
import { MonthlyStats } from "@/lib/types";

const CATEGORY_ICONS: Record<string, string> = {
  餐饮:"🍔", 购物:"🛒", 交通:"🚇", 住房:"🏠", 娱乐:"🎮", 服饰:"👗",
  数码:"📱", 教育:"📚", 医疗:"🏥", 人情:"🎁", 日用:"🧴", 其他:"💰",
};
const CATEGORY_COLORS: Record<string, string> = {
  餐饮:"#ef4444", 购物:"#f59e0b", 交通:"#10b981", 住房:"#6366f1",
  娱乐:"#ec4899", 服饰:"#8b5cf6", 数码:"#06b6d4", 教育:"#3b82f6",
  医疗:"#14b8a6", 人情:"#f97316", 日用:"#84cc16", 其他:"#9ca3af",
};

export default function ExpenseStats() {
  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.length > 0 && !selectedMonth) setSelectedMonth(data[0].month);
      }
    } catch {} finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#a29bfe] border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-[#b8b0a8]">加载统计…</span>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📊</div>
        <p className="text-sm text-[#8b8580] font-medium">暂无账单数据</p>
        <p className="text-xs text-[#b8b0a8] mt-1.5">在账单文件夹中记录消费，如「买了件T恤199元」</p>
      </div>
    );
  }

  const current = stats.find((s) => s.month === selectedMonth) || stats[0];
  const maxTotal = Math.max(...current.categories.map((c) => c.total), 1);

  return (
    <div className="space-y-5 animate-fade-in">
      <h2 className="text-lg font-bold text-[#2d2a26]">💰 账单统计</h2>

      {/* Month selector */}
      <div className="flex gap-1 bg-[#f0ede8] rounded-xl p-1 w-fit">
        {stats.map((s) => (
          <button
            key={s.month}
            onClick={() => setSelectedMonth(s.month)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedMonth === s.month ? "bg-white shadow-sm text-[#2d2a26]" : "text-[#8b8580]"
            }`}
          >
            {monthLabel(s.month)}
          </button>
        ))}
        <button onClick={fetchStats} className="ml-1 px-2 py-1.5 text-xs text-[#b8b0a8] hover:text-[#6c5ce7] cursor-pointer">🔄</button>
      </div>

      {/* Total card */}
      <div className="rounded-2xl p-6 bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] text-white shadow-lg shadow-purple-200">
        <p className="text-xs text-white/70 font-medium mb-1">{monthLabel(current.month)} · 总支出</p>
        <p className="text-4xl font-bold tracking-tight">¥{current.total.toLocaleString()}</p>
        <p className="text-xs text-white/70 mt-2">共 {current.categories.reduce((s, c) => s + c.count, 0)} 笔记录</p>
      </div>

      {/* Category breakdown */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#2d2a26] mb-4">分类明细</h3>
        <div className="space-y-4">
          {current.categories.map((cat) => {
            const pct = current.total > 0 ? Math.round((cat.total / current.total) * 100) : 0;
            return (
              <div key={cat.category}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-[#5c5650] font-medium">
                    {CATEGORY_ICONS[cat.category] || "💰"} {cat.category}
                    <span className="text-xs text-[#b8b0a8]">{cat.count}笔</span>
                  </span>
                  <span className="font-bold text-[#2d2a26]">¥{cat.total.toLocaleString()} <span className="text-xs text-[#b8b0a8] font-normal">({pct}%)</span></span>
                </div>
                <div className="h-2 bg-[#f0ede8] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.max((cat.total / maxTotal) * 100, 2)}%`, backgroundColor: CATEGORY_COLORS[cat.category] || "#9ca3af" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail list */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#2d2a26] mb-3">消费记录</h3>
        <div className="space-y-1">
          {current.categories.flatMap((cat) =>
            cat.notes.map((n) => (
              <div key={n.id} className="flex items-center justify-between text-sm py-2 px-2 -mx-2 rounded-lg hover:bg-[#f8f5f0] transition-colors">
                <span className="text-[#5c5650] truncate flex-1 mr-3">{n.content}</span>
                <span className="text-xs text-[#b8b0a8] mr-3">{n.date.slice(5)}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: (CATEGORY_COLORS[cat.category] || "#9ca3af") + "18", color: CATEGORY_COLORS[cat.category] }}>
                  {CATEGORY_ICONS[cat.category]} {n.amount}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function monthLabel(m: string) { const [y, mo] = m.split("-"); return `${y}年${parseInt(mo)}月`; }
