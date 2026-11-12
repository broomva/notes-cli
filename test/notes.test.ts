import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "../src/cli.ts";
import { addNote, deleteNote, filterByTag, formatList, NotesError, parseAddArgs, type Note } from "../src/notes.ts";

const DAY = "2026-11-06";
const tmpFile = () => join(mkdtempSync(join(tmpdir(), "notes-")), "notes.json");

describe("notes", () => {
  it("adds a note with the next id", () => {
    const notes = addNote(addNote([], "first", DAY), "second", DAY);
    expect(notes.map((n) => n.id)).toEqual([1, 2]);
  });

  it("trims text and refuses empty notes", () => {
    expect(addNote([], "  hi  ", DAY)[0].text).toBe("hi");
    expect(() => addNote([], "   ", DAY)).toThrow(NotesError);
  });

  it("deletes by id and refuses unknown ids", () => {
    const notes: Note[] = addNote([], "a", DAY);
    expect(deleteNote(notes, 1)).toEqual([]);
    expect(() => deleteNote(notes, 9)).toThrow("no note with id 9");
  });

  it("formats a list", () => {
    expect(formatList([])).toBe("No notes yet.");
    expect(formatList(addNote([], "milk", DAY))).toBe("1. milk (2026-11-06)");
  });

  it("stores tags on a new note, and leaves the field out when there are none", () => {
    expect(addNote([], "milk", DAY, ["work"])[0].tags).toEqual(["work"]);
    expect("tags" in addNote([], "milk", DAY)[0]).toBe(false);
  });

  it("trims tags and removes duplicates", () => {
    expect(addNote([], "milk", DAY, [" work", "work", "urgent"])[0].tags).toEqual(["work", "urgent"]);
  });

  it("refuses an empty tag", () => {
    expect(() => addNote([], "milk", DAY, [" "])).toThrow(NotesError);
    expect(() => addNote([], "milk", DAY, [" "])).toThrow("a tag needs a name");
  });

  it("filters by exact tag in original order, skipping notes without tags", () => {
    const notes: Note[] = [
      { id: 1, text: "a", created: DAY, tags: ["work"] },
      { id: 2, text: "b", created: DAY },
      { id: 3, text: "c", created: DAY, tags: ["work", "urgent"] },
      { id: 4, text: "d", created: DAY, tags: ["Work"] },
    ];
    expect(filterByTag(notes, "work").map((n) => n.id)).toEqual([1, 3]);
  });

  it("splits --tag pairs from the text", () => {
    expect(parseAddArgs(["--tag", "work", "--tag", "urgent", "buy", "milk"])).toEqual({
      text: "buy milk",
      tags: ["work", "urgent"],
    });
    expect(parseAddArgs(["buy", "milk"])).toEqual({ text: "buy milk", tags: [] });
  });

  it("refuses a --tag with no value", () => {
    expect(() => parseAddArgs(["buy", "--tag"])).toThrow(NotesError);
    expect(() => parseAddArgs(["buy", "--tag"])).toThrow("a tag needs a name");
  });
});

describe("cli", () => {
  it("adds and lists notes in the file", () => {
    const file = tmpFile();
    expect(run(["add", "buy", "milk"], file, DAY)).toEqual({ code: 0, out: "Added note 1." });
    expect(run(["list"], file, DAY).out).toBe("1. buy milk (2026-11-06)");
  });

  it("deletes a note", () => {
    const file = tmpFile();
    run(["add", "x"], file, DAY);
    expect(run(["delete", "1"], file, DAY).code).toBe(0);
    expect(run(["list"], file, DAY).out).toBe("No notes yet.");
  });

  it("reports errors with exit code 1", () => {
    const file = tmpFile();
    writeFileSync(file, "{ not json");
    expect(run(["list"], file, DAY).code).toBe(1);
    expect(run(["delete", "3"], tmpFile(), DAY)).toEqual({ code: 1, out: "error: no note with id 3" });
  });

  it("prints usage for unknown commands", () => {
    expect(run(["fly"], tmpFile(), DAY).code).toBe(2);
  });

  it("adds a tagged note and lists it by tag", () => {
    const file = tmpFile();
    expect(run(["add", "--tag", "work", "buy", "milk"], file, DAY)).toEqual({ code: 0, out: "Added note 1." });
    expect(run(["list", "--tag", "work"], file, DAY).out).toBe("1. buy milk (2026-11-06)");
  });

  it("shows a note under each of its tags only", () => {
    const file = tmpFile();
    run(["add", "--tag", "work", "--tag", "urgent", "a"], file, DAY);
    run(["add", "b"], file, DAY);
    run(["add", "--tag", "work", "c"], file, DAY);
    expect(run(["list", "--tag", "work"], file, DAY).out).toBe("1. a (2026-11-06)\n3. c (2026-11-06)");
    expect(run(["list", "--tag", "urgent"], file, DAY).out).toBe("1. a (2026-11-06)");
  });

  it("says so when no note has the tag", () => {
    const file = tmpFile();
    run(["add", "x"], file, DAY);
    expect(run(["list", "--tag", "nothing"], file, DAY)).toEqual({ code: 0, out: "No notes tagged nothing." });
  });

  it("refuses an add with a tag and no name, and writes nothing", () => {
    const file = tmpFile();
    expect(run(["add", "--tag"], file, DAY)).toEqual({ code: 1, out: "error: a tag needs a name" });
    expect(existsSync(file)).toBe(false);
  });

  it("lists notes from a file written without a tags field", () => {
    const file = tmpFile();
    writeFileSync(file, JSON.stringify([{ id: 1, text: "buy milk", created: DAY }]));
    expect(run(["list"], file, DAY).out).toBe("1. buy milk (2026-11-06)");
    expect(run(["list", "--tag", "work"], file, DAY).out).toBe("No notes tagged work.");
  });

  it("plain list does not show tags", () => {
    const file = tmpFile();
    run(["add", "--tag", "work", "buy", "milk"], file, DAY);
    expect(run(["list"], file, DAY).out).toBe("1. buy milk (2026-11-06)");
  });
});
