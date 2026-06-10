import { getSupabase } from "./supabase";
import { Folder, Note, TodoItem } from "./types";

interface FolderRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

interface NoteRow {
  id: string;
  content: string;
  folder_ids: string[];
  source: "text" | "voice";
  amount: number | null;
  expense_category: string | null;
  recorded_at: string | null;
  todos: TodoItem[];
  created_at: string;
  updated_at: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function rowToFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
  };
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    content: row.content,
    folderIds: row.folder_ids ?? [],
    source: row.source,
    amount: row.amount ?? undefined,
    expenseCategory: row.expense_category ?? undefined,
    recordedAt: row.recorded_at ?? undefined,
    todos: row.todos ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getFolders(): Promise<Folder[]> {
  const { data, error } = await getSupabase()
    .from("folders")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as FolderRow[]).map(rowToFolder);
}

export async function getFolder(id: string): Promise<Folder | null> {
  const { data, error } = await getSupabase()
    .from("folders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToFolder(data as FolderRow) : null;
}

export async function createFolder(input: {
  name: string;
  color?: string;
  icon?: string;
}): Promise<Folder> {
  const folder: Folder = {
    id: generateId(),
    name: input.name,
    color: input.color ?? "#6366f1",
    icon: input.icon ?? "📁",
    createdAt: new Date().toISOString(),
  };

  const { error } = await getSupabase().from("folders").insert({
    id: folder.id,
    name: folder.name,
    color: folder.color,
    icon: folder.icon,
    created_at: folder.createdAt,
  });

  if (error) throw error;
  return folder;
}

export async function updateFolder(
  id: string,
  updates: Partial<Pick<Folder, "name" | "color" | "icon">>
): Promise<Folder | null> {
  const existing = await getFolder(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates };
  const { error } = await getSupabase()
    .from("folders")
    .update({
      name: updated.name,
      color: updated.color,
      icon: updated.icon,
    })
    .eq("id", id);

  if (error) throw error;
  return updated;
}

export async function deleteFolder(id: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("folders")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) throw error;
  if (!data?.length) return false;

  const notes = await getNotes();
  const affected = notes.filter((n) => n.folderIds.includes(id));
  for (const note of affected) {
    await updateNote(note.id, {
      folderIds: note.folderIds.filter((fid) => fid !== id),
    });
  }

  return true;
}

export async function getNotes(folderId?: string | null): Promise<Note[]> {
  let query = getSupabase().from("notes").select("*");

  if (folderId !== undefined && folderId !== null) {
    query = query.contains("folder_ids", [folderId]);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data as NoteRow[]).map(rowToNote);
}

export async function getNote(id: string): Promise<Note | null> {
  const { data, error } = await getSupabase()
    .from("notes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToNote(data as NoteRow) : null;
}

export async function createNote(input: {
  content: string;
  folderIds?: string[];
  source?: "text" | "voice";
  amount?: number;
  expenseCategory?: string;
  recordedAt?: string;
  todos?: Array<{ content: string; dueDate?: string | null }>;
}): Promise<Note> {
  const now = new Date().toISOString();
  const todoItems: TodoItem[] = (input.todos || []).map((t) => ({
    id: generateId(),
    content: t.content,
    done: false,
    dueDate: t.dueDate || undefined,
    createdAt: now,
  }));

  const note: Note = {
    id: generateId(),
    content: input.content,
    folderIds: input.folderIds || [],
    source: input.source ?? "text",
    amount: input.amount,
    expenseCategory: input.expenseCategory,
    recordedAt: input.recordedAt || now,
    todos: todoItems,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await getSupabase().from("notes").insert({
    id: note.id,
    content: note.content,
    folder_ids: note.folderIds,
    source: note.source,
    amount: note.amount ?? null,
    expense_category: note.expenseCategory ?? null,
    recorded_at: note.recordedAt ?? null,
    todos: note.todos,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  });

  if (error) throw error;
  return note;
}

export async function updateNote(
  id: string,
  updates: Partial<
    Pick<
      Note,
      "content" | "folderIds" | "amount" | "expenseCategory" | "recordedAt" | "todos"
    >
  >
): Promise<Note | null> {
  const existing = await getNote(id);
  if (!existing) return null;

  const updated: Note = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await getSupabase()
    .from("notes")
    .update({
      content: updated.content,
      folder_ids: updated.folderIds,
      amount: updated.amount ?? null,
      expense_category: updated.expenseCategory ?? null,
      recorded_at: updated.recordedAt ?? null,
      todos: updated.todos,
      updated_at: updated.updatedAt,
    })
    .eq("id", id);

  if (error) throw error;
  return updated;
}

export async function deleteNote(id: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("notes")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) throw error;
  return !!data?.length;
}

export async function searchNotes(query: string): Promise<Note[]> {
  const { data, error } = await getSupabase()
    .from("notes")
    .select("*")
    .ilike("content", `%${query}%`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as NoteRow[]).map(rowToNote);
}

export async function getAllNotesWithFolders(): Promise<
  (Note & { folders: Folder[] })[]
> {
  const [notes, folders] = await Promise.all([getNotes(), getFolders()]);
  const folderMap = new Map(folders.map((f) => [f.id, f]));
  return notes.map((n) => ({
    ...n,
    folders: n.folderIds.map((fid) => folderMap.get(fid)).filter(Boolean) as Folder[],
  }));
}

export async function getAllTodos(): Promise<
  Array<{ noteId: string; noteContent: string; todo: TodoItem; folderIds: string[] }>
> {
  const notes = await getNotes();
  const result: Array<{
    noteId: string;
    noteContent: string;
    todo: TodoItem;
    folderIds: string[];
  }> = [];

  for (const note of notes) {
    for (const todo of note.todos) {
      result.push({
        noteId: note.id,
        noteContent: note.content,
        todo,
        folderIds: note.folderIds,
      });
    }
  }

  result.sort((a, b) => {
    if (a.todo.done !== b.todo.done) return a.todo.done ? 1 : -1;
    if (a.todo.dueDate && b.todo.dueDate) return a.todo.dueDate.localeCompare(b.todo.dueDate);
    if (a.todo.dueDate) return -1;
    if (b.todo.dueDate) return 1;
    return b.todo.createdAt.localeCompare(a.todo.createdAt);
  });

  return result;
}

export async function toggleTodo(
  noteId: string,
  todoId: string
): Promise<boolean> {
  const note = await getNote(noteId);
  if (!note) return false;

  const todo = note.todos.find((t) => t.id === todoId);
  if (!todo) return false;

  todo.done = !todo.done;
  await updateNote(noteId, { todos: note.todos });
  return true;
}
