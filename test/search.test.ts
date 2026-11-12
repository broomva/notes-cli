import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "../src/cli.ts";
import { addNote, NotesError, searchNotes, type Note } from "../src/notes.ts";

const DAY = "2026-11-06";
const tmpFile = () => join(mkdtempSync(join(tmpdir(), "notes-")), "notes.json");

const sample = (): Note[] => {
  let notes: Note[] = [];
  for (const text of ["Buy milk", "call mom", "buy bread", "milk the cow"]) {
    notes = addNote(notes, text, DAY);
  }
  return notes;
};

describe("searchNotes", () => {
  it("returns only matching notes, in order, unchanged", () => {
    const notes = sample();
    expect(searchNotes(notes, "milk")).toEqual([notes[0], notes[3]]);
  });

  it("ignores case on both sides", () => {
    const notes = sample();
    expect(searchNotes(notes, "MILK")).toEqual([notes[0], notes[3]]);
    expect(searchNotes(addNote([], "buy milk", DAY), "milk")).toHaveLength(1);
  });

  it("returns an empty list when nothing matches", () => {
    expect(searchNotes(sample(), "zebra")).toEqual([]);
  });

  it("trims the query", () => {
    const notes = sample();
    expect(searchNotes(notes, "  milk ")).toEqual(searchNotes(notes, "milk"));
  });

  it("refuses an empty or blank query", () => {
    expect(() => searchNotes(sample(), "")).toThrow(NotesError);
    expect(() => searchNotes(sample(), "   ")).toThrow("a search needs some text");
  });

  it("does not change the input array", () => {
    const notes = sample();
    const before = JSON.stringify(notes);
    searchNotes(notes, "milk");
    expect(JSON.stringify(notes)).toBe(before);
  });
});

describe("search command", () => {
  const seeded = () => {
    const file = tmpFile();
    for (const text of ["Buy milk", "call mom", "buy bread", "milk the cow"]) run(["add", text], file, DAY);
    return file;
  };

  it("lists only matching notes in list format", () => {
    const file = seeded();
    expect(run(["search", "milk"], file, DAY)).toEqual({
      code: 0,
      out: "1. Buy milk (2026-11-06)\n4. milk the cow (2026-11-06)",
    });
  });

  it("joins several words into one query", () => {
    const file = seeded();
    expect(run(["search", "buy", "milk"], file, DAY)).toEqual({
      code: 0,
      out: "1. Buy milk (2026-11-06)",
    });
  });

  it("reports no matches with exit code 0", () => {
    const file = seeded();
    expect(run(["search", "zebra"], file, DAY)).toEqual({ code: 0, out: "No matching notes." });
  });

  it("requires some search text", () => {
    const file = seeded();
    expect(run(["search"], file, DAY)).toEqual({ code: 1, out: "error: a search needs some text" });
  });

  it("leaves the notes file byte-for-byte unchanged", () => {
    const file = seeded();
    const before = readFileSync(file, "utf8");
    run(["search", "milk"], file, DAY);
    expect(readFileSync(file, "utf8")).toBe(before);
  });

  it("lists search in the usage text", () => {
    const file = tmpFile();
    writeFileSync(file, "[]");
    expect(run(["fly"], file, DAY).out).toContain("notes search <text>");
  });
});
