import { NextRequest, NextResponse } from "next/server";
import { getNotes, getFolders } from "@/lib/storage";
import { Note, MonthlyStats } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const notes = await getNotes();
    const folders = await getFolders();

    // Find expense folders (name contains 账单/记账/消费)
    const expenseFolderIds = folders
      .filter(
        (f) =>
          f.name.includes("账单") ||
          f.name.includes("记账") ||
          f.name.includes("消费")
      )
      .map((f) => f.id);

    // Get all notes in expense folders
    const expenseNotes = notes.filter(
      (n) => n.folderIds.some((fid) => expenseFolderIds.includes(fid))
    );

    // Group by month
    const monthMap = new Map<string, Note[]>();

    for (const note of expenseNotes) {
      const month = note.createdAt.slice(0, 7); // "2026-06"
      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }
      monthMap.get(month)!.push(note);
    }

    // Build stats for each month
    const stats: MonthlyStats[] = [];

    for (const [month, monthNotes] of monthMap) {
      // Group by category
      const categoryMap = new Map<
        string,
        { total: number; count: number; notes: Array<{ id: string; content: string; amount: number; date: string }> }
      >();

      for (const note of monthNotes) {
        const cat = note.expenseCategory || "其他";
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, { total: 0, count: 0, notes: [] });
        }
        const entry = categoryMap.get(cat)!;
        const amt = note.amount || 0;
        entry.total += amt;
        entry.count++;
        entry.notes.push({
          id: note.id,
          content: note.content,
          amount: amt,
          date: note.createdAt.slice(0, 10),
        });
      }

      // Sort categories by total descending
      const categories = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          ...data,
        }))
        .sort((a, b) => b.total - a.total);

      const total = categories.reduce((sum, c) => sum + c.total, 0);

      stats.push({ month, total, categories });
    }

    // Sort months descending
    stats.sort((a, b) => b.month.localeCompare(a.month));

    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
