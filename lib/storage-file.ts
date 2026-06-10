import fs from "fs/promises";
import path from "path";
import { Folder, Note, TodoItem, LegacyNote } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");
const FOLDERS_FILE = path.join(DATA_DIR, "folders.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJSON<T>(filepath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filepath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJSON<T>(filepath: string, data: T): Promise<void> {
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
}

function migrateNote(raw: LegacyNote): Note {
  let folderIds: string[] = [];
  if (raw.folderIds && Array.isArray(raw.folderIds)) {
    folderIds = raw.folderIds;
  } else if (raw.folderId) {
    folderIds = [raw.folderId];
  }
  return {
    id: raw.id,
    content: raw.content,
    folderIds,
    source: raw.source || "text",
    amount: raw.amount,
    expenseCategory: raw.expenseCategory,
    recordedAt: raw.recordedAt,
    todos: raw.todos || [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export async function getFolders(): Promise<Folder[]> {
  await ensureDataDir();
  return readJSON<Folder[]>(FOLDERS_FILE, []);
}

export async function getFolder(id: string): Promise<Folder | null> {
  const folders = await getFolders();
  return folders.find((f) => f.id === id) ?? null;
}

export async function createFolder(input: {
  name: string;
  color?: string;
  icon?: string;
}): Promise<Folder> {
  const folders = await getFolders();
  const folder: Folder = {
    id: generateId(),
    name: input.name,
    color: input.color ?? "#6366f1",
    icon: input.icon ?? "📁",
    createdAt: new Date().toISOString(),
  };
  folders.push(folder);
  await writeJSON(FOLDERS_FILE, folders);
  return folder;
}

export async function updateFolder(
  id: string,
  updates: Partial<Pick<Folder, "name" | "color" | "icon">>
): Promise<Folder | null> {
  const folders = await getFolders();
  const idx = folders.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  folders[idx] = { ...folders[idx], ...updates };
  await writeJSON(FOLDERS_FILE, folders);
  return folders[idx];
}

export async function deleteFolder(id: string): Promise<boolean> {
  const folders = await getFolders();
  const filtered = folders.filter((f) => f.id !== id);
  if (filtered.length === folders.length) return false;
  await writeJSON(FOLDERS_FILE, filtered);

  const notes = await getNotes();
  const updated = notes.map((n) => ({
    ...n,
    folderIds: n.folderIds.filter((fid) => fid !== id),
    updatedAt: new Date().toISOString(),
  }));
  await writeJSON(NOTES_FILE, updated);
  return true;
}

export async function getNotes(folderId?: string | null): Promise<Note[]> {
  await ensureDataDir();
  const rawNotes = await readJSON<LegacyNote[]>(NOTES_FILE, []);
  const notes = rawNotes.map(migrateNote);
  notes.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (folderId !== undefined && folderId !== null) {
    return notes.filter((n) => n.folderIds.includes(folderId));
  }
  return notes;
}

export async function getNote(id: string): Promise<Note | null> {
  const notes = await getNotes();
  return notes.find((n) => n.id === id) ?? null;
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
  const rawNotes = await readJSON<LegacyNote[]>(NOTES_FILE, []);
  const notes = rawNotes.map(migrateNote);
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
  notes.push(note);
  await writeJSON(NOTES_FILE, notes);
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
  const notes = await getNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  notes[idx] = {
    ...notes[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await writeJSON(NOTES_FILE, notes);
  return notes[idx];
}

export async function deleteNote(id: string): Promise<boolean> {
  const notes = await getNotes();
  const filtered = notes.filter((n) => n.id !== id);
  if (filtered.length === notes.length) return false;
  await writeJSON(NOTES_FILE, filtered);
  return true;
}

export async function searchNotes(query: string): Promise<Note[]> {
  const notes = await getNotes();
  const lower = query.toLowerCase();
  return notes.filter((n) => n.content.toLowerCase().includes(lower));
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
  const notes = await getNotes();
  const note = notes.find((n) => n.id === noteId);
  if (!note) return false;
  const todo = note.todos.find((t) => t.id === todoId);
  if (!todo) return false;
  todo.done = !todo.done;
  await writeJSON(NOTES_FILE, notes);
  return true;
}
