import * as Dialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { Banknote, BookOpen, CodeXml, CornerDownLeft, FileSignature, Play, Scale, ScrollText, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { navigate } from "./routes";
import { startTour } from "./tour";

export const REPO_URL = "https://github.com/HackIndiaXYZ/ai-for-lawyers-hackathon-clausewright";

interface Command { id: string; label: string; hint: string; Icon: typeof Scale; run: () => void }

const COMMANDS: Command[] = [
  { id: "demo", label: "Watch the guided demo", hint: "Plays the whole flow on the real interface", Icon: Play, run: () => void startTour() },
  { id: "draft", label: "Draft a contract", hint: "Service agreement, NDA or appointment letter", Icon: FileSignature, run: () => navigate("draft") },
  { id: "review", label: "Review a contract you were sent", hint: "Flags void and risky clauses", Icon: ScrollText, run: () => navigate("review") },
  { id: "recover", label: "Recover a late payment", hint: "Section 16 interest and a demand notice", Icon: Banknote, run: () => navigate("recover") },
  { id: "evidence", label: "Prove a document", hint: "Hash a file and draft the BSA s.63 certificate", Icon: ShieldCheck, run: () => navigate("evidence") },
  { id: "home", label: "Overview", hint: "What Clausewright does", Icon: Scale, run: () => navigate("home") },
  { id: "law", label: "Read the legal basis", hint: "Every authority the app cites, with sources", Icon: BookOpen, run: () => window.open(`${REPO_URL}/blob/main/docs/LEGAL_BASIS.md`, "_blank", "noopener") },
  { id: "source", label: "Open the source on GitHub", hint: "Code, tests and evaluations", Icon: CodeXml, run: () => window.open(REPO_URL, "_blank", "noopener") },
];

/** Keyboard-first way around the app: Ctrl/⌘ K opens it, typing filters, Enter runs. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COMMANDS.filter((c) => `${c.label} ${c.hint}`.toLowerCase().includes(q)) : COMMANDS;
  }, [query]);

  useEffect(() => { setCursor(0); }, [query, open]);
  useEffect(() => { if (!open) setQuery(""); }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); onOpenChange(!open); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const run = (c: Command | undefined) => { if (!c) return; onOpenChange(false); c.run(); };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink-950/40 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content aria-describedby={undefined}
          className="fixed top-[14vh] left-1/2 z-[90] w-[min(36rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-[0_40px_100px_-30px_rgb(8_17_13/0.6)] animate-fade-in">
          <Dialog.Title className="sr-only">Go to or run</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-mist-200 px-4">
            <Search className="size-4.5 shrink-0 text-mist-500" aria-hidden />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Where to, or what to run?"
              aria-label="Search commands" role="combobox" aria-expanded aria-controls="cmd-list" aria-activedescendant={matches[cursor] ? `cmd-${matches[cursor].id}` : undefined}
              className="h-13 min-w-0 flex-1 bg-transparent text-[1rem] text-ink-900 placeholder:text-mist-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(matches.length - 1, c + 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
                else if (e.key === "Enter") { e.preventDefault(); run(matches[cursor]); }
              }} />
            <kbd className="rounded border border-mist-200 bg-mist-50 px-1.5 py-0.5 font-mono text-[0.68rem] text-mist-700">esc</kbd>
          </div>
          <ul id="cmd-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
            {matches.length === 0 && <li className="px-3 py-6 text-center text-[0.9rem] text-mist-700">Nothing matches "{query}".</li>}
            {matches.map((c, i) => (
              <li key={c.id} id={`cmd-${c.id}`} role="option" aria-selected={i === cursor}>
                <button type="button" onMouseEnter={() => setCursor(i)} onClick={() => run(c)}
                  className={clsx("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", i === cursor ? "bg-accent-500/10" : "hover:bg-mist-50")}>
                  <span className={clsx("grid size-8 shrink-0 place-items-center rounded-lg", i === cursor ? "bg-accent-500 text-white" : "bg-mist-100 text-ink-700")}><c.Icon className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.92rem] font-semibold text-ink-900">{c.label}</span>
                    <span className="block truncate text-[0.78rem] text-mist-700">{c.hint}</span>
                  </span>
                  {i === cursor && <CornerDownLeft className="size-4 shrink-0 text-accent-600" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
