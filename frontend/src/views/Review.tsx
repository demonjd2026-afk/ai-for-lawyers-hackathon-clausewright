import { clsx } from "clsx";
import { Bot, ClipboardPaste, Gavel, ScrollText } from "lucide-react";
import { useState } from "react";
import { api, type ReviewOut } from "../api";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Field";
import { Authority, Badge, Empty, Notice, Panel, PanelHeading, Stat } from "../components/ui/Primitives";

const SAMPLE = `1. Services. The Vendor shall design and build the Company's mobile app.

2. Payment. The Company shall pay each invoice within ninety (90) days of receipt of invoice.

3. Non-compete. The Vendor shall not engage in any competing business for two years after termination of this Agreement.

4. Arbitration. Any dispute shall be decided by a sole arbitrator appointed by the Company.

5. Delay. A penalty of 2% per day applies to late delivery.

6. Intellectual property. The Vendor assigns all copyright in the deliverables to the Company.

7. Data. The Vendor will process customer data received from the Company to send order updates.`;

const RISK = {
  high: { label: "High risk", tone: "high" as const, bar: "bg-vermilion-500" },
  medium: { label: "Medium risk", tone: "medium" as const, bar: "bg-saffron-500" },
  low: { label: "Low risk", tone: "low" as const, bar: "bg-ink-300" },
};

const ROLES = [
  ["the service provider", "The service provider or freelancer"],
  ["the client", "The client"],
  ["the employee", "The employee"],
] as const;

export function Review({ llm }: { llm: boolean }) {
  const [text, setText] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number][0]>("the service provider");
  const [out, setOut] = useState<ReviewOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      setOut(await api.review(text, role, llm));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const byClause = new Map<number, ReviewOut["issues"]>();
  out?.issues.forEach((i) => byClause.set(i.clause, [...(byClause.get(i.clause) ?? []), i]));
  const high = out?.issues.filter((i) => i.risk === "high").length ?? 0;

  return (
    <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Panel className="self-start">
        <PanelHeading title="Review a contract you were sent"
          lede={llm
            ? "Paste the other side's draft. Fixed rules flag the clauses Indian law treats as void or risky; an AI reviewer then reads each clause, but it may cite only authorities from Clausewright's verified list."
            : "Paste the other side's draft. Fixed rules flag the clauses Indian law treats as void or risky. Add an AI key on the server for a clause-by-clause AI read as well."} />
        <label htmlFor="review-text" className="mb-1 block text-[0.78rem] font-semibold text-mist-700">Contract text</label>
        <textarea id="review-text" rows={14} value={text} onChange={(e) => setText(e.target.value)} className="control font-mono text-[0.82rem] leading-relaxed"
          placeholder="Paste the clauses here. Numbered clauses, 'Clause 4', 'Article 4' and headings are all recognised." />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Select label="You are" value={role} options={ROLES} onChange={setRole} />
        </div>
        {err && <Notice tone="err" role="alert" className="mt-3">{err}</Notice>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button loading={busy} disabled={text.trim().length < 20} onClick={run} icon={<Gavel className="size-4" />}>Review</Button>
          <Button variant="ghost" onClick={() => setText(SAMPLE)} icon={<ClipboardPaste className="size-4" />}>Paste a sample</Button>
        </div>
      </Panel>

      <Panel aria-live="polite" className="self-start">
        {!out ? (
          <Empty icon={<ScrollText className="size-8" />} title="Findings appear here">
            Each finding sits under the clause it concerns, with what to ask for and the authority behind it.
          </Empty>
        ) : (
          <>
            <PanelHeading title={out.issues.length ? `${out.issues.length} ${out.issues.length === 1 ? "issue" : "issues"} in ${byClause.size} of ${out.meta.clauses} clauses` : "No issues found"}
              lede={<>
                {out.meta.llm ? "Rules and AI review." : "Rule-based review."}
                {out.meta.llm && ` ${out.meta.citations_dropped} AI ${out.meta.citations_dropped === 1 ? "citation" : "citations"} outside the verified list ${out.meta.citations_dropped === 1 ? "was" : "were"} removed.`}
                {out.meta.llm_error && ` ${out.meta.llm_error}.`}
              </>} />
            <div className="mb-5 grid grid-cols-3 gap-2">
              <Stat label="Clauses read" value={out.meta.clauses} />
              <Stat label="High risk" value={high} tone={high ? "err" : "ok"} />
              <Stat label="Citations dropped" value={out.meta.llm ? out.meta.citations_dropped : "—"} />
            </div>
            <div className="space-y-4">
              {out.clauses.map((c, i) => {
                const issues = byClause.get(i);
                if (!issues) return null;
                const worst = issues.some((x) => x.risk === "high") ? "high" : issues.some((x) => x.risk === "medium") ? "medium" : "low";
                return (
                  <article key={i} className="relative overflow-hidden rounded-lg border border-mist-200 bg-white">
                    <span className={clsx("absolute inset-y-0 left-0 w-1.5", RISK[worst].bar)} aria-hidden />
                    <blockquote className="border-b border-mist-200 bg-paper-50 py-3 pr-4 pl-5 font-serif text-[0.92rem] leading-relaxed text-paper-900">
                      {c.length > 400 ? c.slice(0, 400) + "…" : c}
                    </blockquote>
                    <div className="space-y-4 py-4 pr-4 pl-5">
                      {issues.map((x, j) => (
                        <div key={j}>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={RISK[x.risk].tone}>{RISK[x.risk].label}</Badge>
                            <span className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-mist-500">
                              {x.source === "rule" ? <Gavel className="size-3.5" /> : <Bot className="size-3.5" />}
                              {x.source === "rule" ? "Fixed rule" : "AI reviewer"}
                            </span>
                          </div>
                          <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-900">{x.issue}</p>
                          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-mist-700"><span className="font-semibold text-ink-900">Ask for:</span> {x.suggested_change}</p>
                          {x.citations.length > 0 && (
                            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Authorities">
                              {x.citations.map((ct) => <li key={ct.provision + ct.authority}><Authority c={ct} /></li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
