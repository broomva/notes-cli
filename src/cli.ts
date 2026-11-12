// notes add <text> | notes list | notes delete <id>. Run with: node src/cli.ts <command>
import { addNote, deleteNote, filterByTag, formatList, loadNotes, NotesError, parseAddArgs, parseTagName, saveNotes } from "./notes.ts";

export interface Result {
  code: number;
  out: string;
}

const USAGE = "usage: notes add [--tag <t>] <text> | notes list [--tag <t>] | notes delete <id>";

export function run(argv: string[], file: string, today: string): Result {
  const [command, ...rest] = argv;
  try {
    const notes = loadNotes(file);
    if (command === "add") {
      const parsed = parseAddArgs(rest);
      const next = addNote(notes, parsed.text, today, parsed.tags);
      saveNotes(file, next);
      return { code: 0, out: `Added note ${next[next.length - 1].id}.` };
    }
    if (command === "list" && rest[0] === "--tag") {
      const tag = parseTagName(rest[1]);
      const found = filterByTag(notes, tag);
      return { code: 0, out: found.length > 0 ? formatList(found) : `No notes tagged ${tag}.` };
    }
    if (command === "list") return { code: 0, out: formatList(notes) };
    if (command === "delete") {
      saveNotes(file, deleteNote(notes, Number(rest[0])));
      return { code: 0, out: `Deleted note ${rest[0]}.` };
    }
    return { code: 2, out: USAGE };
  } catch (err) {
    if (err instanceof NotesError || err instanceof SyntaxError) return { code: 1, out: `error: ${err.message}` };
    throw err;
  }
}

if (import.meta.main) {
  const result = run(process.argv.slice(2), process.env.NOTES_FILE ?? "notes.json", new Date().toISOString().slice(0, 10));
  console.log(result.out);
  process.exitCode = result.code;
}
