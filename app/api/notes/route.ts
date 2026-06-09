import { NextRequest, NextResponse } from "next/server";
import { getNotes, createNote, getFolders, createFolder } from "@/lib/storage";
import { analyzeNote, extractExpenseInfo } from "@/lib/ai";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folder_id");

    const notes = await getNotes(folderId || undefined);
    const folders = await getFolders();
    const folderMap = new Map(folders.map((f) => [f.id, f]));

    const enriched = notes.map((n) => ({
      ...n,
      folders: n.folderIds
        .map((fid) => folderMap.get(fid))
        .filter(Boolean),
      // backward compat: single folder
      folder: n.folderIds.length > 0
        ? folderMap.get(n.folderIds[0]) ?? null
        : null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, source } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // === 1. Get existing folders ===
    const folders = await getFolders();

    // === 2. AI Analysis (one call for everything) ===
    let analysis: {
      folderIds: string[];
      newFolders: Array<{ name: string; icon: string; color: string }>;
      recordedAt: string | null;
      timeSummary: string;
      todos: Array<{ content: string; dueDate: string | null }>;
      sentiment: "positive" | "neutral" | "negative";
      comfortMessage?: string;
    } | null = null;

    try {
      analysis = await analyzeNote(content.trim(), folders);
    } catch (err) {
      console.warn("AI analysis failed:", err);
      analysis = null;
    }

    // === 3. Auto-create new folders if AI suggested any ===
    const createdFolders: Array<{ id: string; name: string }> = [];
    let folderIds: string[] = analysis?.folderIds || [];

    if (analysis?.newFolders?.length) {
      // Only create if name doesn't already exist
      const existingNames = new Set(
        folders.map((f) => f.name.toLowerCase())
      );
      for (const nf of analysis.newFolders) {
        if (!existingNames.has(nf.name.toLowerCase())) {
          const newFolder = await createFolder({
            name: nf.name,
            icon: nf.icon,
            color: nf.color,
          });
          createdFolders.push({ id: newFolder.id, name: newFolder.name });
          folderIds.push(newFolder.id);
        }
      }
    }

    // Deduplicate folder IDs
    folderIds = [...new Set(folderIds)];

    // === 4. Check if any matched folder is an expense folder ===
    let isExpenseFolder = false;
    for (const fid of folderIds) {
      const f = folders.find((x) => x.id === fid);
      if (f && (f.name.includes("账单") || f.name.includes("记账") || f.name.includes("消费"))) {
        isExpenseFolder = true;
        break;
      }
    }

    // === 5. Extract expense info if applicable ===
    let amount: number | undefined;
    let expenseCategory: string | undefined;
    if (isExpenseFolder) {
      try {
        const expenseInfo = await extractExpenseInfo(content.trim());
        if (expenseInfo) {
          amount = expenseInfo.amount;
          expenseCategory = expenseInfo.category;
        }
      } catch (err) {
        console.warn("Expense extraction failed:", err);
      }
    }

    // === 6. Create the note ===
    const note = await createNote({
      content: content.trim(),
      folderIds,
      source: source ?? "text",
      amount,
      expenseCategory,
      recordedAt: analysis?.recordedAt || undefined,
      todos: analysis?.todos || [],
    });

    // Build folder info for response
    const allFolders = await getFolders();
    const folderMap = new Map(allFolders.map((f) => [f.id, f]));

    return NextResponse.json(
      {
        ...note,
        folders: note.folderIds.map((fid) => folderMap.get(fid)).filter(Boolean),
        folder: note.folderIds.length > 0 ? folderMap.get(note.folderIds[0]) ?? null : null,
        isExpense: isExpenseFolder,
        newFoldersCreated: createdFolders,
        timeSummary: analysis?.timeSummary || "刚刚",
        sentiment: analysis?.sentiment || "neutral",
        comfortMessage: analysis?.comfortMessage || null,
        todoCount: note.todos.length,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
