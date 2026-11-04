import { clsx } from "clsx";
import { ArrowRight, Check, Download, Link2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, download } from "../api";
import { Button } from "../components/ui/Button";
import { Notice, Panel } from "../components/ui/Primitives";
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

function Steps({ steps, current, onPick }: {
  steps: { id: Step; label: string; enabled: boolean; done: boolean }[]; current: Step; onPick: (s: Step) => void;
}) {
  return (
    <ol className="flex items-stretch gap-1 overflow-x-auto rounded-xl border border-mist-200 bg-white p-1 shadow-panel" aria-label="Steps">
      {steps.map((s, i) => {
        const active = s.id === current;
        return (
          <li key={s.id} className={clsx("flex min-w-0", active ? "flex-[3] sm:flex-1" : "flex-1")}>
            <button type="button" disabled={!s.enabled} aria-current={active ? "step" : undefined} onClick={() => onPick(s.id)}
              className={clsx("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[0.84rem] font-semibold whitespace-nowrap transition-colors",
                active ? "bg-ink-900 text-white" : s.enabled ? "text-ink-800 hover:bg-mist-100" : "text-mist-300")}>
              <span className={clsx("grid size-5 shrink-0 place-items-center rounded-full text-[0.68rem] font-bold tabular-nums",
                active ? "bg-saffron-500 text-ink-950" : s.done ? "bg-teal-500 text-white" : s.enabled ? "bg-mist-200 text-ink-700" : "bg-mist-100 text-mist-300")}>
                {s.done && !active ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className={clsx(!active && "hidden sm:inline")}>{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
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
  const saveDocx = async () => { if (ts && draft) download(await api.docx(ts), `${draft.title.toLowerCase().replace(/ /g, "-")}.docx`); };

  const steps: { id: Step; label: string; enabled: boolean; done: boolean }[] = useMemo(() => [
    { id: "describe", label: "Describe", enabled: true, done: !!ts },
    { id: "terms", label: "Terms", enabled: !!ts, done: !!ts && !fieldErrors.length },
    { id: "checks", label: "Legal checks", enabled: !!ts, done: !!ts && blockers === 0 && findings.length > 0 },
    { id: "escrow", label: "Escrow", enabled: !!draft?.escrow, done: !!chainOk?.ok },
  ], [ts, fieldErrors.length, blockers, findings.length, draft, chainOk]);

  return (
    <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <Steps steps={steps} current={step} onPick={setStep} />

        {error && (
          <Notice tone="err" role="alert">
            <strong>{error}</strong>
            {fieldErrors.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {fieldErrors.slice(0, 6).map((e, i) => (
                  <li key={i}>{e.loc.filter((x) => x !== "body" && x !== "term_sheet").join(" › ")}: {e.msg}</li>
                ))}
              </ul>
            )}
          </Notice>
        )}

        <Panel>
          {step === "describe" && (
            <Intake llm={meta.llm_enabled} current={ts}
              onTermSheet={(t, next) => { setTs(t); setDeployment(null); setStep(next); }} />
          )}
          {step === "terms" && ts && <TermsForm ts={ts} states={meta.states} findings={findings} onChange={update} />}
          {step === "checks" && ts && <Findings findings={findings} onFix={fixOne} onFixAll={fixAll} onJump={jump} />}
          {step === "escrow" && ts && draft?.escrow && (
            <Suspense fallback={<p className="text-[0.9rem] text-mist-700" role="status">Loading the escrow tools…</p>}>
              <Escrow ts={ts} draft={draft} deployment={deployment} onDeployed={setDeployment} onVerified={setChainOk}
                onHighlight={setHighlight}
                onUseWallets={(w) => setTs({ ...ts, client: { ...ts.client, wallet: w.client }, provider: { ...ts.provider, wallet: w.provider },
                  escrow: { ...ts.escrow!, arbiter_wallet: w.arbiter } })} />
            </Suspense>
          )}
          {step === "escrow" && ts && !draft?.escrow && (
            <Notice tone="info">Turn on escrow in the terms and clear the must-fix checks to continue.</Notice>
          )}

          {ts && step !== "describe" && (
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-mist-200 pt-5">
              {step === "terms" && (
                <Button onClick={() => setStep("checks")} icon={<ArrowRight className="size-4" />}>
                  Review {findings.length} {findings.length === 1 ? "check" : "checks"}{blockers ? ` · ${blockers} must fix` : ""}
                </Button>
              )}
              {step === "checks" && draft?.escrow && (
                <Button onClick={() => setStep("escrow")} icon={<Link2 className="size-4" />}>Set up escrow</Button>
              )}
              {step === "checks" && !draft?.escrow && blockers === 0 && draft && (
                <Button variant="secondary" onClick={saveDocx} icon={<Download className="size-4" />}>Download Word file</Button>
              )}
              {draft && step !== "checks" && (
                <Button variant="ghost" onClick={saveDocx} icon={<Download className="size-4" />}>Download Word file</Button>
              )}
              <span className="ml-auto text-[0.78rem] text-mist-500" aria-live="polite">
                {stale ? "Checking the terms…" : draft ? "Draft is up to date." : blockers ? "Fix the must-fix items to draft." : ""}
              </span>
            </div>
          )}
        </Panel>
      </div>

      <div className="min-w-0 xl:sticky xl:top-5 xl:self-start xl:max-h-[calc(100dvh-2.5rem)] xl:overflow-y-auto xl:rounded-xl">
        <DocumentView draft={draft} sealState={sealState} sealDetail={sealDetail} highlight={highlight} stale={stale} onDownload={saveDocx} />
      </div>
    </div>
  );
}
