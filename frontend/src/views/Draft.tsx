import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, download } from "../api";
import { examples } from "../examples";
import type { DraftResult, Finding, Meta, TermSheet, Verification } from "../types";
import { setPath } from "../util";
import { DocumentView } from "./DocumentView";
import type { Deployment } from "./Escrow";
import { Findings } from "./Findings";
import { Intake } from "./Intake";
import { TermsForm } from "./TermsForm";

// The chain library is large; load it only when someone opens the escrow step.
const Escrow = lazy(() => import("./Escrow").then((m) => ({ default: m.Escrow })));

type Step = "describe" | "terms" | "checks" | "escrow";
const STORE = "clausewright.termsheet.v1";

function load(): TermSheet | null {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as TermSheet) : null;
  } catch {
    return null;
  }
}

/** Switching document type keeps the parties and fills type-specific fields from the worked example. */
function withTypeDefaults(next: TermSheet, prev: TermSheet): TermSheet {
  if (next.agreement_type === prev.agreement_type) return next;
  const base = examples().find((e) => e.id === next.agreement_type)!.ts;
  return { ...base, client: next.client, provider: next.provider, effective_date: next.effective_date, governing_state: next.governing_state };
}

export function Draft({ meta }: { meta: Meta }) {
  const [ts, setTs] = useState<TermSheet | null>(load);
  const [step, setStep] = useState<Step>(ts ? "terms" : "describe");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ loc: string[]; msg: string }[]>([]);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [chainOk, setChainOk] = useState<Verification | null>(null);
  const [highlight, setHighlight] = useState<string[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    if (!ts) return;
    try { localStorage.setItem(STORE, JSON.stringify(ts)); } catch { /* storage unavailable */ }
    setStale(true);
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const { findings } = await api.check(ts);
        if (my !== seq.current) return;
        setFindings(findings);
        setFieldErrors([]);
        setError(null);
        if (findings.some((f) => f.severity === "blocker")) {
          setDraft(null);
        } else {
          const d = await api.draft(ts);
          if (my !== seq.current) return;
          setDraft(d);
        }
      } catch (e) {
        if (my !== seq.current) return;
        if (e instanceof ApiError && e.status === 422) {
          setFieldErrors(e.fieldErrors);
          setError(e.fieldErrors.length ? "Some terms are incomplete or invalid." : e.message);
        } else setError(e instanceof Error ? e.message : String(e));
        setDraft(null);
      } finally {
        if (my === seq.current) setStale(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [ts]);

  // A new fingerprint means any earlier deployment no longer matches this contract.
  useEffect(() => { setChainOk(null); }, [draft?.document_hash]);

  const update = (next: TermSheet) => setTs((prev) => (prev ? withTypeDefaults(next, prev) : next));
  const blockers = findings.filter((f) => f.severity === "blocker").length;

  const sealState = !draft ? "open" : chainOk?.ok && deployment ? "sealed" : "drafted";
  const sealDetail = !draft
    ? blockers ? `${blockers} must-fix ${blockers === 1 ? "issue" : "issues"} before drafting.` : "Waiting for complete terms."
    : sealState === "sealed"
      ? `Escrow at ${deployment!.address.slice(0, 10)}… holds this exact fingerprint; ${chainOk!.total} checks agree.`
      : `SHA-256 of the text below. ${draft.verification.passed}/${draft.verification.total} internal consistency checks pass.`;

  const fixOne = (f: Finding) => f.autofix && ts && setTs(setPath(ts, f.autofix.path, f.autofix.value));
  const fixAll = () => {
    if (!ts) return;
    let next = ts;
    for (const f of findings) if (f.autofix && f.severity !== "info") next = setPath(next, f.autofix.path, f.autofix.value);
    setTs(next);
  };
  const jump = () => setStep("terms");

  const steps: { id: Step; label: string; enabled: boolean; done: boolean }[] = useMemo(() => [
    { id: "describe", label: "Describe the deal", enabled: true, done: !!ts },
    { id: "terms", label: "Terms", enabled: !!ts, done: !!ts && !fieldErrors.length },
    { id: "checks", label: "Legal checks", enabled: !!ts, done: !!ts && blockers === 0 && findings.length > 0 },
    { id: "escrow", label: "Escrow", enabled: !!draft?.escrow, done: !!chainOk?.ok },
  ], [ts, fieldErrors.length, blockers, findings.length, draft, chainOk]);

  return (
    <div className="bench">
      <div>
        <ol className="steps" aria-label="Steps">
          {steps.map((s) => (
            <li key={s.id}>
              <button aria-current={step === s.id ? "step" : undefined} data-done={s.done && step !== s.id}
                disabled={!s.enabled} onClick={() => setStep(s.id)}>{s.label}</button>
            </li>
          ))}
        </ol>

        {error && (
          <div className="notice err" role="alert">
            {error}
            {fieldErrors.length > 0 && <ul>{fieldErrors.slice(0, 6).map((e, i) => (
              <li key={i}>{e.loc.filter((x) => x !== "body" && x !== "term_sheet").join(" › ")}: {e.msg}</li>
            ))}</ul>}
          </div>
        )}

        <div className="panel">
          {step === "describe" && (
            <Intake llm={meta.llm_enabled} current={ts}
              onTermSheet={(t, next) => { setTs(t); setDeployment(null); setStep(next); }} />
          )}
          {step === "terms" && ts && <TermsForm ts={ts} states={meta.states} findings={findings} onChange={update} />}
          {step === "checks" && ts && <Findings findings={findings} onFix={fixOne} onFixAll={fixAll} onJump={jump} />}
          {step === "escrow" && ts && draft?.escrow && (
            <Suspense fallback={<p className="lede">Loading the escrow tools…</p>}>
            <Escrow ts={ts} draft={draft} deployment={deployment} onDeployed={setDeployment} onVerified={setChainOk}
              onHighlight={setHighlight}
              onUseWallets={(w) => setTs({ ...ts, client: { ...ts.client, wallet: w.client }, provider: { ...ts.provider, wallet: w.provider },
                escrow: { ...ts.escrow!, arbiter_wallet: w.arbiter } })} />
            </Suspense>
          )}
          {step === "escrow" && ts && !draft?.escrow && <p className="lede">Turn on escrow in the terms and clear the must-fix checks to continue.</p>}
        </div>

        {ts && step !== "describe" && (
          <div className="row" style={{ marginTop: "1rem" }}>
            {step === "terms" && <button className="btn" onClick={() => setStep("checks")}>
              Review {findings.length} {findings.length === 1 ? "check" : "checks"}{blockers ? ` (${blockers} must fix)` : ""}</button>}
            {step === "checks" && draft?.escrow && <button className="btn" onClick={() => setStep("escrow")}>Set up escrow</button>}
            {draft && (
              <button className="btn quiet" onClick={async () => download(await api.docx(ts), `${draft.title.toLowerCase().replace(/ /g, "-")}.docx`)}>
                Download Word file
              </button>
            )}
          </div>
        )}
      </div>

      <DocumentView draft={draft} sealState={sealState} sealDetail={sealDetail} highlight={highlight} stale={stale} />
    </div>
  );
}
