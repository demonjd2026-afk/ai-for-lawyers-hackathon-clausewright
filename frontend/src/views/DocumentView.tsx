import { Seal, type SealState } from "../components/Seal";
import type { DraftResult } from "../types";
import { Body } from "../components/Markdown";

export function DocumentView({ draft, sealState, sealDetail, highlight, stale }: {
  draft: DraftResult | null;
  sealState: SealState;
  sealDetail: string;
  highlight: string[];
  stale: boolean;
}) {
  return (
    <article className="paper" aria-label="Contract preview" aria-busy={stale}>
      <Seal hash={draft?.document_hash} state={sealState} detail={sealDetail} />
      {!draft ? (
        <p className="empty">The contract appears here as soon as the terms pass the must-fix checks. Every word is generated from the
          terms by fixed rules, so the same terms always give the same text and the same fingerprint.</p>
      ) : (
        <div style={{ opacity: stale ? 0.55 : 1, transition: "opacity 200ms" }}>
          <h1>{draft.title}</h1>
          {draft.clauses.map((c) => (
            <section key={c.id} id={`clause-${c.id}`} className="clause" data-bound={c.binds.length > 0}
              data-hl={highlight.includes(c.id)} aria-label={c.heading}>
              <h3 title={c.binds.length ? "This clause sets an escrow setting" : undefined}>{c.number ? `${c.number}. ` : ""}{c.heading}</h3>
              <Body body={c.body} />
            </section>
          ))}
        </div>
      )}
    </article>
  );
}
