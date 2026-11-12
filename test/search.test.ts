import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "../src/cli.ts";
import { addNote, formatList, NotesError, searchNotes, type Note } from "../src/notes.ts";

const DAY = "2026-11-06";
const tmpFile = () => join(mkdtempSync(join(tmpdir(), "notes-")), "notes.json");

function build(texts: string[], day = DAY): Note[] {
  return texts.reduce<Note[]>((notes, t) => addNote(notes, t, day), []);
}

describe("searchNotes", () => {
  it("returns only notes whose text contains the query, in order", () => {
    const notes = build(["Buy milk", "call mom", "milk tea"]);
    expect(searchNotes(notes, "milk").map((n) => n.text)).toEqual(["Buy milk", "milk tea"]);
  });

  it("matches regardless of case", () => {
    expect(searchNotes(build(["buy milk"]), "MILK")).toHaveLength(1);
    expect(searchNotes(build(["Milk"]), "milk")).toHaveLength(1);
  });

  it("trims the query", () => {
    expect(searchNotes(build(["buy milk", "tea"]), "  milk  ")).toEqual(searchNotes(build(["buy milk", "tea"]), "milk"));
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchNotes(build(["buy milk"]), "zzz")).toEqual([]);
  });

  it("does not match on the date or id", () => {
    expect(searchNotes(build(["buy milk"], "2026-01-01"), "2026")).toEqual([]);
    expect(searchNotes(build(["buy milk"]), "1")).toEqual([]);
  });

  it("throws NotesError for an empty or whitespace-only query", () => {
    expect(() => searchNotes(build(["a"]), "")).toThrow(NotesError);
    expect(() => searchNotes(build(["a"]), "   ")).toThrow("a search needs some text");
  });
});

describe("cli search", () => {
  it("prints only the matching notes", () => {
    const file = tmpFile();
    run(["add", "Buy milk"], file, DAY);
    run(["add", "call mom"], file, DAY);
    run(["add", "milk tea"], file, DAY);
    expect(run(["search", "milk"], file, DAY)).toEqual({
      code: 0,
      out: "1. Buy milk (2026-11-06)\n3. milk tea (2026-11-06)",
    });
  });

  it("prints a message when nothing matches", () => {
    const file = tmpFile();
    run(["add", "buy milk"], file, DAY);
    expect(run(["search", "zzz"], file, DAY)).toEqual({ code: 0, out: "No matching notes." });
  });

  it("joins the words of the query", () => {
    const file = tmpFile();
    run(["add", "buy milk"], file, DAY);
    run(["add", "milk buy"], file, DAY);
    expect(run(["search", "buy", "milk"], file, DAY).out).toBe("1. buy milk (2026-11-06)");
  });

  it("reports an empty query as an error", () => {
    expect(run(["search"], tmpFile(), DAY)).toEqual({ code: 1, out: "error: a search needs some text" });
  });
});
