export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
}

export interface TodoItem {
  id: string;
  content: string;
  done: boolean;
  dueDate?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  content: string;
  folderIds: string[];          // 支持多分类
  source: "text" | "voice";
  amount?: number;
  expenseCategory?: string;
  recordedAt?: string;          // AI 提取的实际时间
  todos: TodoItem[];            // AI 提取的待办事项
  createdAt: string;
  updatedAt: string;
}

/** Legacy note format (folderId string|null → folderIds string[]) */
export type LegacyNote = Omit<Note, "folderIds"> & { folderId?: string | null; folderIds?: string[]; todos?: TodoItem[] };

export interface MonthlyStats {
  month: string;
  total: number;
  categories: Array<{
    category: string;
    total: number;
    count: number;
    notes: Array<{ id: string; content: string; amount: number; date: string }>;
  }>;
}

export interface SearchResult {
  note: Note;
  folders: Folder[];
  relevance: string;
}

export interface NoteAnalysis {
  folderIds: string[];
  newFolders: Array<{ name: string; icon: string; color: string }>;
  recordedAt: string | null;
  timeSummary: string;
  todos: Array<{ content: string; dueDate: string | null }>;
  sentiment: "positive" | "neutral" | "negative";
  comfortMessage?: string;  // 消极情绪时的安慰/笑话
}
