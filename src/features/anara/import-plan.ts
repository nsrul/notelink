import { BLOCK_ORDER_STEP, createBlock } from "../../core/block-tree";
import { createId } from "../../core/ids";
import { inlinePlainText } from "../../core/inline-content";
import type { Block, BlockTree } from "../../core/types";
import { markdownInlineToContent } from "../editor/inline-markdown";
import { markdownToBlockTree } from "../editor/adapters";

/** A Markdown file chosen from an Anara export. `path` is the file's place in
 *  the export — a folder picker's relative path, or just its name — which is
 *  what tells one note's folder from another's. */
export interface AnaraSourceFile {
  path: string;
  text: string;
}

/** One note, read from its Markdown: the page it becomes, and the Anara note
 *  it came from. */
export interface AnaraImportNote {
  type: "note";
  path: string;
  title: string;
  /** The Anara address the export names, when it names one. */
  source?: string;
  tree: BlockTree;
}

/** A folder in the export, which becomes a page holding the notes under it. */
export interface AnaraImportFolder {
  type: "folder";
  path: string;
  title: string;
  children: AnaraImportNode[];
}

export type AnaraImportNode = AnaraImportNote | AnaraImportFolder;

/** A page to create for the import, before it exists. `body` is the note's
 *  blocks; a folder page starts blank and gains a row for each note under it. */
export interface AnaraPageDraft {
  parentId: string | null;
  title: string;
  body?: BlockTree;
}

/** Creates one imported page and answers its id, or null when it could not. */
export type CreateAnaraPage = (draft: AnaraPageDraft) => string | null;

interface Frontmatter {
  fields: Record<string, string>;
  body: string;
}

const MARKDOWN_FILE = /\.(?:md|markdown)$/i;
const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/i;
const H1 = /^#\s+(.+?)\s*#*\s*$/;

/** Fields an export may keep a note's name under. */
const TITLE_FIELDS = ["title", "name", "note_title"];
/** Fields it may keep the note's Anara address under. */
const SOURCE_FIELDS = [
  "url",
  "source",
  "source_url",
  "note_url",
  "anara_url",
  "permalink",
  "canonical_url",
];

/** The lines an export writes its source under: "Source: …", "URL: …",
 *  "**Source:** …", "[Source](…)", "[View in Anara](…)". */
const SOURCE_LINES = [
  /^(?:>\s*)?(?:\*\*|__|_|\*)?(?:source|url|original|anara|view in anara|open in anara)(?:\*\*|__|_|\*)?\s*:\s*(.+)$/i,
  /^(?:>\s*)?\[(?:source|view in anara|open in anara|anara)[^\]]*\]\(([^)\s]+)\)\s*$/i,
  /^(?:>\s*)?<(https?:\/\/(?:www\.)?anara\.com\/[^\s>]+)>\s*$/i,
] as const;

function normalizedPath(path: string): string[] {
  return path
    .replaceAll("\\", "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== ".." && !part.startsWith(".") && part !== "__MACOSX");
}

function isSourceFile(file: AnaraSourceFile): boolean {
  const parts = normalizedPath(file.path);
  return parts.length > 0 && MARKDOWN_FILE.test(parts.at(-1) ?? "");
}

/** The name a file's title falls back to: its name without the extension. */
function fileNameTitle(path: string): string {
  return (normalizedPath(path).at(-1) ?? "Untitled").replace(MARKDOWN_FILE, "").trim() || "Untitled";
}

function unquote(value: string): string {
  const trimmed = value.trim();
  const quoted = /^(['"])([\s\S]*)\1$/.exec(trimmed);
  return quoted ? quoted[2].replace(/\\(['"\\])/g, "$1") : trimmed;
}

/** A title as words: its Markdown marks dropped, its whitespace folded. */
function titleWords(value: string | undefined): string {
  if (!value) return "";
  return inlinePlainText(markdownInlineToContent(unquote(value))).replace(/\s+/g, " ").trim();
}

function firstField(fields: Record<string, string>, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = fields[name];
    if (value && value.trim()) return unquote(value);
  }
  return undefined;
}

/** An export may open with a YAML frontmatter block: read its fields and
 *  leave the body the Markdown parser sees without it. A pair of dividers
 *  with no fields is the note's own, and stays. */
export function splitFrontmatter(text: string): Frontmatter {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(source);
  if (!match || !match[1].split("\n").some((line) => /^[A-Za-z][\w.-]*\s*:/.test(line))) {
    return { fields: {}, body: source };
  }
  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const field = /^([A-Za-z][\w.-]*)\s*:\s*(.*)$/.exec(line);
    if (!field || line.trimStart().startsWith("#")) continue;
    const key = field[1].toLowerCase().replaceAll("-", "_");
    if (!(key in fields)) fields[key] = field[2];
  }
  return { fields, body: source.slice(match[0].length) };
}

function addressIn(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = URL_IN_TEXT.exec(value);
  if (!match) return undefined;
  // A sentence's full stop, not the address's. A closing bracket is kept
  // when the address opened it, as in a Wikipedia address.
  let address = match[0].replace(/[.,;:!?]+$/, "");
  for (const [open, close] of [["(", ")"], ["[", "]"]] as const) {
    while (address.endsWith(close) && address.split(open).length < address.split(close).length) {
      address = address.slice(0, -1);
    }
  }
  return address;
}

/** The source line near the top of a note, if the body writes one. */
function bodySource(lines: readonly string[]): string | undefined {
  let read = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (read >= 8) break;
    read += 1;
    for (const pattern of SOURCE_LINES) {
      const match = pattern.exec(line.trim());
      if (match) return addressIn(match[1]);
    }
  }
  return undefined;
}

function withoutLine(lines: string[], index: number): string[] {
  return lines.filter((_, at) => at !== index);
}

/** The line "Source: …" itself, linked as Markdown links a bare address. */
function sourceBlock(url: string, idFactory: () => string): Block {
  return createBlock(idFactory(), "text", {
    content: markdownInlineToContent(`Source: ${url}`),
  });
}

function withSource(tree: BlockTree, url: string, idFactory: () => string): BlockTree {
  const block = sourceBlock(url, idFactory);
  const first = Object.values(tree.by_id).map((item) => item.order).sort((left, right) => left - right)[0] ?? BLOCK_ORDER_STEP;
  return { by_id: { ...tree.by_id, [block.id]: { ...block, order: first - BLOCK_ORDER_STEP } } };
}

/** Every page needs somewhere to write: an empty export becomes one blank
 *  paragraph, as a new page does. */
function withParagraph(tree: BlockTree, idFactory: () => string): BlockTree {
  if (Object.keys(tree.by_id).length) return tree;
  const block = createBlock(idFactory());
  return { by_id: { [block.id]: block } };
}

/** The first H1 near the top of a note: its line and its words. A source line
 *  above the title does not hide it. */
function headingLine(lines: readonly string[]): { index: number; title: string } | null {
  let read = 0;
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim()) continue;
    if (read >= 3) break;
    read += 1;
    const heading = H1.exec(lines[index].trim());
    if (heading) return { index, title: titleWords(heading[1]) };
  }
  return null;
}

/** One Anara note's Markdown as the page it becomes. The title comes from
 *  frontmatter, else a leading H1, else the file name; a leading H1 that is
 *  the title would otherwise be written twice, so it is dropped. The Anara
 *  address is read from frontmatter or a source line and, when the export
 *  gives it somewhere other than the top, written as a line at the top. */
export function parseAnaraNote(
  path: string,
  text: string,
  idFactory: () => string = () => createId("block"),
): AnaraImportNote {
  const { fields, body } = splitFrontmatter(text);
  let lines = body.replace(/\r\n?/g, "\n").split("\n");
  const heading = headingLine(lines);

  const title = titleWords(firstField(fields, TITLE_FIELDS)) || heading?.title || fileNameTitle(path);
  if (heading && (!heading.title || heading.title === title)) {
    lines = withoutLine(lines, heading.index);
  }

  const address = addressIn(firstField(fields, SOURCE_FIELDS));
  const inBody = bodySource(lines);
  const source = inBody ?? address;

  let tree = markdownToBlockTree(lines.join("\n"), idFactory);
  if (source && !inBody) tree = withSource(tree, source, idFactory);
  tree = withParagraph(tree, idFactory);

  return { type: "note", path: normalizedPath(path).join("/"), title, ...(source ? { source } : {}), tree };
}

function folderIn(children: AnaraImportNode[], title: string): AnaraImportFolder | undefined {
  return children.find((node): node is AnaraImportFolder => node.type === "folder" && node.title === title);
}

/** Reads the chosen files as the pages they should become. A note chosen by
 *  itself is a top-level page; a note inside a folder export is nested under
 *  a page for each folder, as Anara's library nests it. */
export function planAnaraImport(
  files: readonly AnaraSourceFile[],
  idFactory: () => string = () => createId("block"),
): AnaraImportNode[] {
  const roots: AnaraImportNode[] = [];
  const seen = new Set<string>();
  const ordered = files
    .filter(isSourceFile)
    .map((file) => ({ ...file, parts: normalizedPath(file.path) }))
    .sort((left, right) => left.parts.join("/").localeCompare(right.parts.join("/"), undefined, { numeric: true, sensitivity: "base" }));

  for (const file of ordered) {
    const path = file.parts.join("/");
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const note = parseAnaraNote(path, file.text, idFactory);
    if (file.parts.length === 1) {
      roots.push(note);
      continue;
    }
    let children = roots;
    for (let at = 0; at < file.parts.length - 1; at += 1) {
      const name = file.parts[at];
      let folder = folderIn(children, name);
      if (!folder) {
        folder = { type: "folder", path: file.parts.slice(0, at + 1).join("/"), title: name, children: [] };
        children.push(folder);
      }
      children = folder.children;
    }
    children.push(note);
  }
  return roots;
}

/** How many notes a plan holds, however deep its folders go. */
export function countAnaraNotes(nodes: readonly AnaraImportNode[]): number {
  let count = 0;
  for (const node of nodes) count += node.type === "folder" ? countAnaraNotes(node.children) : 1;
  return count;
}

/** Creates the planned pages, parents before the notes under them, and
 *  answers the ids of the pages at the top of the import. */
export function importAnaraPlan(nodes: readonly AnaraImportNode[], create: CreateAnaraPage): string[] {
  const roots: string[] = [];
  const walk = (list: readonly AnaraImportNode[], parentId: string | null) => {
    for (const node of list) {
      const id = create(node.type === "folder"
        ? { parentId, title: node.title }
        : { parentId, title: node.title, body: node.tree });
      if (!id) continue;
      if (parentId === null) roots.push(id);
      if (node.type === "folder") walk(node.children, id);
    }
  };
  walk(nodes, null);
  return roots;
}
