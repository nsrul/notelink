import { describe, expect, it } from "vitest";
import { inlinePlainText } from "../../core/inline-content";
import type { Block, BlockTree } from "../../core/types";
import {
  countAnaraNotes,
  importAnaraPlan,
  parseAnaraNote,
  planAnaraImport,
  type AnaraImportNode,
  type AnaraPageDraft,
} from "./import-plan";

function ids() {
  let next = 0;
  return () => `block_${(next += 1)}`;
}

function blocks(tree: BlockTree): Block[] {
  return Object.values(tree.by_id).sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function textOf(block: Block): string {
  return inlinePlainText(block.content);
}

function ofKind(tree: BlockTree, kind: Block["kind"]): Block[] {
  return blocks(tree).filter((block) => block.kind === kind);
}

function links(tree: BlockTree): string[] {
  return Object.values(tree.by_id).flatMap((block) => block.content.flatMap((run) => run.marks?.link ?? []));
}

describe("an Anara Markdown note", () => {
  it("takes its title from the leading H1 and keeps the structure below it", () => {
    const note = parseAnaraNote("field-notes.md", [
      "# Field Notes",
      "",
      "Intro with [a source](https://example.com/paper).",
      "",
      "## Methods",
      "",
      "- one",
      "- two",
      "",
      "1. first",
      "2. second",
      "",
      "- [x] done",
      "- [ ] later",
      "",
      "> quoted",
      "",
      "```ts",
      "const x = 1;",
      "```",
      "",
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
    ].join("\n"), ids());

    expect(note.title).toBe("Field Notes");
    expect(ofKind(note.tree, "heading1")).toHaveLength(0);
    expect(ofKind(note.tree, "heading2").map(textOf)).toEqual(["Methods"]);
    expect(ofKind(note.tree, "bullet").map(textOf)).toEqual(["one", "two"]);
    expect(ofKind(note.tree, "numbered").map(textOf)).toEqual(["first", "second"]);
    expect(ofKind(note.tree, "todo").map((block) => [textOf(block), block.checked])).toEqual([["done", true], ["later", false]]);
    expect(ofKind(note.tree, "quote").map(textOf)).toEqual(["quoted"]);
    expect(ofKind(note.tree, "code").map(textOf)).toEqual(["const x = 1;"]);
    expect(ofKind(note.tree, "code")[0].language).toBe("ts");
    expect(ofKind(note.tree, "table")).toHaveLength(1);
    expect(links(note.tree)).toContain("https://example.com/paper");
  });

  it("reads a title and source from frontmatter", () => {
    const note = parseAnaraNote("export.md", [
      "---",
      'title: "A cited note"',
      "url: https://anara.com/notes/abc",
      "---",
      "",
      "The note. [A citation](https://example.com/cited).",
    ].join("\n"), ids());

    expect(note.title).toBe("A cited note");
    expect(note.source).toBe("https://anara.com/notes/abc");
    const first = blocks(note.tree)[0];
    expect(textOf(first)).toBe("Source: https://anara.com/notes/abc");
    expect(first.content.find((run) => run.marks?.link)?.marks?.link).toBe("https://anara.com/notes/abc");
    expect(links(note.tree)).toContain("https://example.com/cited");
  });

  it("keeps a source line the export already writes, and does not repeat it", () => {
    const note = parseAnaraNote("export.md", [
      "Source: https://anara.com/notes/abc",
      "",
      "# A note",
      "",
      "Words.",
    ].join("\n"), ids());

    expect(note.title).toBe("A note");
    expect(note.source).toBe("https://anara.com/notes/abc");
    expect(blocks(note.tree).filter((block) => textOf(block).startsWith("Source:"))).toHaveLength(1);
    expect(ofKind(note.tree, "heading1")).toHaveLength(0);
  });

  it("falls back to the file name, and gives an empty note one blank paragraph", () => {
    const note = parseAnaraNote("Reading list.md", "", ids());
    expect(note.title).toBe("Reading list");
    expect(note.tree.by_id).toHaveProperty("block_1");
    expect(blocks(note.tree).map((block) => [block.kind, textOf(block)])).toEqual([["text", ""]]);
  });
});

describe("an Anara folder export", () => {
  const files = [
    { path: "Research/Beta.md", text: "# Beta\n\nBeta body." },
    { path: "Research/Sub/Gamma.md", text: "# Gamma\n\nGamma body." },
    { path: "Research/Alpha.md", text: "# Alpha\n\nAlpha body." },
    { path: "Loose.md", text: "# Loose" },
  ];

  it("becomes pages nested under a page for each folder", () => {
    const plan = planAnaraImport(files, ids());
    expect(countAnaraNotes(plan)).toBe(4);
    expect(plan.filter((node) => node.type === "note").map((node) => node.title)).toEqual(["Loose"]);

    const research = plan.find((node): node is Extract<AnaraImportNode, { type: "folder" }> => node.type === "folder")!;
    expect(research.title).toBe("Research");
    expect(research.children.flatMap((node) => node.type === "note" ? [node.title] : []).sort()).toEqual(["Alpha", "Beta"]);
    const sub = research.children.find((node): node is Extract<AnaraImportNode, { type: "folder" }> => node.type === "folder")!;
    expect(sub.children.map((node) => node.title)).toEqual(["Gamma"]);
  });

  it("creates each folder before the notes it holds", () => {
    const plan = planAnaraImport(files, ids());
    const created: Array<AnaraPageDraft & { id: string }> = [];
    const roots = importAnaraPlan(plan, (draft) => {
      const id = `page_${created.length + 1}`;
      created.push({ ...draft, id });
      return id;
    });

    const idOf = (title: string) => created.find((page) => page.title === title)!.id;
    expect(roots).toHaveLength(2);
    expect(created[0].title).toBe("Loose");
    expect(created[0].parentId).toBeNull();
    expect(created.find((page) => page.title === "Alpha")?.parentId).toBe(idOf("Research"));
    expect(created.find((page) => page.title === "Beta")?.parentId).toBe(idOf("Research"));
    expect(created.find((page) => page.title === "Sub")?.parentId).toBe(idOf("Research"));
    expect(created.find((page) => page.title === "Gamma")?.parentId).toBe(idOf("Sub"));
    const alpha = created.find((page) => page.title === "Alpha")!;
    expect(alpha.body ? blocks(alpha.body).map(textOf) : []).toContain("Alpha body.");
    // A folder page starts blank: its notes become rows there.
    expect(created.find((page) => page.title === "Research")?.body).toBeUndefined();
  });

  it("leaves out what is not a note, and reads a note twice only once", () => {
    const plan = planAnaraImport([
      ...files,
      { path: "Research/Alpha.md", text: "# Alpha again" },
      { path: "Research/.hidden.md", text: "# Hidden" },
      { path: "__MACOSX/Research/._Alpha.md", text: "resource fork" },
      { path: "Research/cover.png", text: "not markdown" },
      { path: "notes.txt", text: "not a note" },
    ], ids());
    expect(countAnaraNotes(plan)).toBe(4);
  });
});
