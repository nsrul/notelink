import { FileDown, FolderOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../../app/workspace-context";
import { useUi } from "../../app/ui-context";
import { MenuItem } from "../../components/Menu";
import {
  countAnaraNotes,
  importAnaraPlan,
  planAnaraImport,
  type AnaraSourceFile,
} from "./import-plan";

/** The path a chosen file came by: a folder picker gives each file its place
 *  in the folder, while a file picker gives only its name. */
function chosenPath(file: File): string {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

/** "Import from Anara" in the settings menu. It reads the Markdown Anara
 *  exports — one note, several notes, or a whole folder — and makes a page
 *  for each, with folders becoming pages that hold the notes under them.
 *  Nothing leaves the browser: the files are read where they are chosen. */
export function AnaraImport({ onImported }: { onImported?(): void }) {
  const { createPage, selectPage } = useWorkspace();
  const { toast } = useUi();
  const notesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // A directory picker is still a browser extension of the file input, and
  // React has no prop for it.
  useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
    folderInput.current?.setAttribute("directory", "");
  }, []);

  const run = async (files: File[]) => {
    if (!files.length || busy) return;
    setBusy(true);
    try {
      const sources: AnaraSourceFile[] = await Promise.all(files.map(async (file) => ({
        path: chosenPath(file),
        text: await file.text(),
      })));
      const plan = planAnaraImport(sources);
      const notes = countAnaraNotes(plan);
      if (!notes) throw new Error("No Markdown notes were found in what you chose.");
      const roots = importAnaraPlan(plan, (draft) => createPage(draft.parentId, "document", {
        title: draft.title,
        body: draft.body,
        block: draft.parentId !== null,
        select: false,
      }));
      if (!roots.length) throw new Error("Those notes could not be imported.");
      selectPage(roots[0]);
      onImported?.();
      toast(notes === 1 ? "Imported 1 note from Anara" : `Imported ${notes} notes from Anara`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "The import failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <MenuItem
        icon={<FileDown size={16} />}
        label={busy ? "Importing…" : "Import from Anara…"}
        description="Markdown notes exported from Anara"
        disabled={busy}
        onSelect={() => notesInput.current?.click()}
      />
      <MenuItem
        icon={<FolderOpen size={16} />}
        label="Import an Anara folder…"
        description="A folder export, as pages under a page"
        disabled={busy}
        onSelect={() => folderInput.current?.click()}
      />
      <input
        ref={notesInput}
        type="file"
        accept=".md,.markdown,text/markdown"
        multiple
        hidden
        aria-label="Choose Anara Markdown notes"
        onChange={(event) => {
          const chosen = [...(event.currentTarget.files ?? [])];
          event.currentTarget.value = "";
          void run(chosen);
        }}
      />
      <input
        ref={folderInput}
        type="file"
        accept=".md,.markdown,text/markdown"
        multiple
        hidden
        aria-label="Choose an Anara folder export"
        onChange={(event) => {
          const chosen = [...(event.currentTarget.files ?? [])];
          event.currentTarget.value = "";
          void run(chosen);
        }}
      />
    </>
  );
}
