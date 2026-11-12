// Notes kept in a JSON file. Pure functions take and return note lists; only load/save touch disk.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export interface Note {
  id: number;
  text: string;
  created: string; // ISO date, YYYY-MM-DD
  tags?: string[];
}

export class NotesError extends Error {}

export function parseTagName(value: string | undefined): string {
  const tag = value?.trim() ?? "";
  if (!tag) throw new NotesError("a tag needs a name");
  return tag;
}

export function parseAddArgs(args: string[]): { text: string; tags: string[] } {
  const words: string[] = [];
  const tags: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tag") tags.push(parseTagName(args[++i]));
    else words.push(args[i]);
  }
  return { text: words.join(" "), tags };
}

export function filterByTag(notes: Note[], tag: string): Note[] {
  return notes.filter((n) => n.tags?.includes(tag) ?? false);
}

export function loadNotes(file: string): Note[] {
  if (!existsSync(file)) return [];
  const data: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(data)) throw new NotesError(`${file} does not hold a list of notes`);
  return data as Note[];
}

export function saveNotes(file: string, notes: Note[]): void {
  writeFileSync(file, JSON.stringify(notes, null, 2) + "\n");
}

export function addNote(notes: Note[], text: string, today: string, tags: string[] = []): Note[] {
  const clean = text.trim();
  if (!clean) throw new NotesError("a note needs some text");
  const id = notes.reduce((max, n) => Math.max(max, n.id), 0) + 1;
  const note: Note = { id, text: clean, created: today };
  const names = [...new Set(tags.map((t) => parseTagName(t)))];
  if (names.length > 0) note.tags = names;
  return [...notes, note];
}

export function deleteNote(notes: Note[], id: number): Note[] {
  if (!notes.some((n) => n.id === id)) throw new NotesError(`no note with id ${id}`);
  return notes.filter((n) => n.id !== id);
}

export function formatList(notes: Note[]): string {
  if (notes.length === 0) return "No notes yet.";
  return notes.map((n) => `${n.id}. ${n.text} (${n.created})`).join("\n");
}
