import { isSupabaseConfigured } from "./supabase";
import * as fileStorage from "./storage-file";
import * as supabaseStorage from "./storage-supabase";

const storage = isSupabaseConfigured() ? supabaseStorage : fileStorage;

export const getFolders = storage.getFolders;
export const getFolder = storage.getFolder;
export const createFolder = storage.createFolder;
export const updateFolder = storage.updateFolder;
export const deleteFolder = storage.deleteFolder;
export const getNotes = storage.getNotes;
export const getNote = storage.getNote;
export const createNote = storage.createNote;
export const updateNote = storage.updateNote;
export const deleteNote = storage.deleteNote;
export const searchNotes = storage.searchNotes;
export const getAllNotesWithFolders = storage.getAllNotesWithFolders;
export const getAllTodos = storage.getAllTodos;
export const toggleTodo = storage.toggleTodo;
