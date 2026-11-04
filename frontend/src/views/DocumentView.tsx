import { clsx } from "clsx";
import { Download, FileText } from "lucide-react";
import { Body } from "../components/Markdown";
import { SealBar, type SealState } from "../components/Seal";
import { Button } from "../components/ui/Button";
import type { DraftResult } from "../types";

export function DocumentView({ draft, sealState, sealDetail, highlight, stale, onDownload }: {
  draft: DraftResult | null;
  sealState: SealState;
  sealDetail: string;
  highlight: string[];
  stale: boolean;
  onDownload?: () => Promise<void> | void;
}) {
  return (
    <article className="paper flex min-h-[60vh] flex-col px-6 py-6 sm:px-8" aria-label="Contract preview" aria-busy={stale}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><SealBar hash={draft?.document_hash} state={sealState} detail={sealDetail} /></div>
        {draft && onDownload && (
          <Button variant="ghost" size="sm" icon={<Download className="size-4" />} onClick={onDownload} className="border-paper-300 bg-white/70">Word file</Button>
        )}
      </div>
      {!draft ? (
        <div className="my-auto flex flex-col items-center gap-3 py-16 text-center text-paper-700">
          <FileText className="size-8 text-paper-300" />
          <p className="max-w-[40ch] text-[0.9rem] leading-relaxed">
            The contract appears here as soon as the terms pass the must-fix checks. Every word is generated from the terms by fixed rules, so
            the same terms always give the same text and the same fingerprint.
          </p>
        </div>
      ) : (
        <div className={clsx("mt-6 transition-opacity duration-200", stale && "opacity-50")}>
          <h1>{draft.title}</h1>
          <div className="mt-4 space-y-1">
            {draft.clauses.map((c) => (
              <section key={c.id} id={`clause-${c.id}`} className="clause" data-bound={c.binds.length > 0} data-hl={highlight.includes(c.id)} aria-label={c.heading}>
                <h3>{c.number ? `${c.number}. ` : ""}{c.heading}</h3>
                <Body body={c.body} />
              </section>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
