import { NextRequest, NextResponse } from "next/server";
import { getAllNotesWithFolders } from "@/lib/storage";
import { searchNotesWithAI } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const allNotes = await getAllNotesWithFolders();

    // 1. Try AI-powered search first
    let results: Array<{
      note: (typeof allNotes)[number];
      reason: string;
    }> = [];

    try {
      const aiResults = await searchNotesWithAI(query.trim(), allNotes);

      // Map back to full note data
      const noteMap = new Map(allNotes.map((n) => [n.id, n]));
      results = aiResults
        .map((r) => {
          const note = noteMap.get(r.noteId);
          return note ? { note, reason: r.reason } : null;
        })
        .filter(Boolean) as typeof results;
    } catch (err) {
      console.warn("AI search failed, falling back to text search:", err);
    }

    // 2. Fallback: also do simple text search and merge dedup
    if (results.length === 0) {
      const lower = query.toLowerCase();
      results = allNotes
        .filter(
          (n) => n.content.toLowerCase().includes(lower)
        )
        .slice(0, 10)
        .map((n) => ({ note: n, reason: "关键词匹配" }));
    }

    // Merge AI + text search (deduplicate)
    const seenIds = new Set<string>();
    const merged: typeof results = [];

    for (const r of results) {
      if (!seenIds.has(r.note.id)) {
        seenIds.add(r.note.id);
        merged.push(r);
      }
    }

    // Also add any text matches that AI missed
    const lower = query.toLowerCase();
    for (const n of allNotes) {
      if (!seenIds.has(n.id) && n.content.toLowerCase().includes(lower)) {
        merged.push({ note: n, reason: "关键词匹配" });
        seenIds.add(n.id);
      }
    }

    return NextResponse.json({
      query: query.trim(),
      results: merged.slice(0, 20),
      total: merged.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
