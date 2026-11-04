import { useState } from "react";
import { api, type ReviewOut } from "../api";

const SAMPLE = `1. Services. The Vendor shall design and build the Company's mobile app.

2. Payment. The Company shall pay each invoice within ninety (90) days of receipt of invoice.

3. Non-compete. The Vendor shall not engage in any competing business for two years after termination of this Agreement.

4. Arbitration. Any dispute shall be decided by a sole arbitrator appointed by the Company.

5. Delay. A penalty of 2% per day applies to late delivery.

6. Intellectual property. The Vendor assigns all copyright in the deliverables to the Company.

7. Data. The Vendor will process customer data received from the Company to send order updates.`;

const RISK = { high: "High risk", medium: "Medium risk", low: "Low risk" } as const;

export function Review({ llm }: { llm: boolean }) {
  const [text, setText] = useState("");
  const [role, setRole] = useState("the service provider");
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

  return (
    <div className="bench">
      <div className="panel">
        <h2>Review a contract you were sent</h2>
        <p className="lede">Paste the other side's draft. Fixed rules flag the clauses Indian law treats as void or risky; {llm
          ? "an AI reviewer then reads each clause, but it may cite only authorities from Clausewright's verified list."
          : "add an AI key on the server for a clause-by-clause AI read as well."}</p>
        <label className="field">
          <span>Contract text</span>
          <textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <div className="grid2" style={{ marginTop: "0.6rem" }}>
          <label className="field">
            <span>You are</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="the service provider">The service provider or freelancer</option>
              <option value="the client">The client</option>
              <option value="the employee">The employee</option>
            </select>
          </label>
        </div>
        {err && <p className="notice err" role="alert">{err}</p>}
        <div className="row" style={{ marginTop: "0.8rem" }}>
          <button className="btn" disabled={busy || text.trim().length < 20} onClick={run}>{busy ? "Reviewing…" : "Review"}</button>
          <button className="btn quiet" onClick={() => setText(SAMPLE)}>Paste a sample</button>
        </div>
      </div>

      <div className="panel" aria-live="polite">
        {!out ? (
          <p className="lede">Findings appear here next to the clause they concern.</p>
        ) : (
          <>
            <h2>{out.issues.length ? `${out.issues.length} issues in ${byClause.size} of ${out.meta.clauses} clauses` : "No issues found"}</h2>
            <p className="lede">
              {out.meta.llm ? "Rules and AI review." : "Rule-based review."}
              {out.meta.llm && ` ${out.meta.citations_dropped} AI citations outside the verified list were removed.`}
              {out.meta.llm_error && ` ${out.meta.llm_error}.`}
            </p>
            {out.clauses.map((c, i) => {
              const issues = byClause.get(i);
              if (!issues) return null;
              const worst = issues.some((x) => x.risk === "high") ? "high" : issues.some((x) => x.risk === "medium") ? "medium" : "low";
              return (
                <article key={i} className="review-clause" data-risk={worst}>
                  <blockquote>{c.length > 400 ? c.slice(0, 400) + "…" : c}</blockquote>
                  {issues.map((x, j) => (
                    <div key={j} style={{ marginTop: j ? "0.6rem" : 0 }}>
                      <strong>{RISK[x.risk]}.</strong> {x.issue}
                      <div><em>Ask for:</em> {x.suggested_change}</div>
                      <ul className="cites">{x.citations.map((ct) => (
                        <li key={ct.provision + ct.authority}>{ct.url
                          ? <a href={ct.url} target="_blank" rel="noopener noreferrer" title={ct.note ?? undefined}>{ct.authority}, {ct.provision}</a>
                          : <span title={ct.note ?? undefined}>{ct.authority}, {ct.provision}</span>}</li>
                      ))}</ul>
                      <div className="src">{x.source === "rule" ? "Found by a fixed rule" : "Found by the AI reviewer"}</div>
                    </div>
                  ))}
                </article>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
