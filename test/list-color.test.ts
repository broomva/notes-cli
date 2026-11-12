import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { styleText, stripVTControlCharacters } from "node:util";
import { describe, expect, it } from "vitest";
import { formatList, type Note } from "../src/notes.ts";
import { run } from "../src/cli.ts";

const notes: Note[] = [
  { id: 1, text: "buy milk", created: "2026-11-01" },
  { id: 2, text: "call mom", created: "2026-11-02" },
];
const plain = "1. buy milk (2026-11-01)\n2. call mom (2026-11-02)";

function tempFile(name: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "notes-color-"));
  const file = join(dir, "notes.json");
  writeFileSync(file, content);
  return file;
}

const seed = JSON.stringify(notes);

describe("formatList colour", () => {
  it("default output is the plain text", () => {
    expect(formatList(notes)).toBe(plain);
  });

  it("colour adds codes only", () => {
    expect(stripVTControlCharacters(formatList(notes, true))).toBe(plain);
  });

  it("wraps the id in gray and the text in green", () => {
    const out = formatList(notes, true);
    const gray = styleText("gray", "1", { validateStream: false });
    const green = styleText("green", "buy milk", { validateStream: false });
    expect(out).toContain(gray);
    expect(out).toContain(green);
  });

  it("empty list stays a plain message", () => {
    expect(formatList([], true)).toBe("No notes yet.");
    expect(stripVTControlCharacters(formatList([], true))).toBe("No notes yet.");
  });
});

describe("run colour", () => {
  it("list with colour matches plain list once stripped", () => {
    const today = "2026-11-11";
    const plainOut = run(["list"], tempFile("a", seed), today).out;
    const colourOut = run(["list"], tempFile("b", seed), today, true).out;
    expect(stripVTControlCharacters(colourOut)).toBe(plainOut);
  });

  it("default list has no escape characters", () => {
    const out = run(["list"], tempFile("c", seed), "2026-11-11").out;
    expect(out).not.toContain("\u001b");
  });

  it("add and delete ignore the colour flag", () => {
    const today = "2026-11-11";
    const addPlain = run(["add", "x"], tempFile("d", seed), today).out;
    const addColour = run(["add", "x"], tempFile("e", seed), today, true).out;
    expect(addColour).toBe(addPlain);
    const delPlain = run(["delete", "1"], tempFile("f", seed), today).out;
    const delColour = run(["delete", "1"], tempFile("g", seed), today, true).out;
    expect(delColour).toBe(delPlain);
  });
});
