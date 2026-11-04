import { useEffect, useState } from "react";
import { api } from "./api";
import type { Meta } from "./types";
import { Draft } from "./views/Draft";
import { Evidence } from "./views/Evidence";
import { Recover } from "./views/Recover";
import { Review } from "./views/Review";

const VIEWS = [
  ["draft", "Draft a contract"],
  ["review", "Review a contract"],
  ["recover", "Recover a late payment"],
  ["evidence", "Prove a document"],
] as const;
type View = (typeof VIEWS)[number][0];

function fromHash(): View {
  const h = location.hash.slice(1);
  return (VIEWS.find(([v]) => v === h)?.[0] ?? "draft") as View;
}

export function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>(fromHash);

  useEffect(() => {
    api.meta().then(setMeta).catch((e) => setErr(e.message));
    const on = () => setView(fromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  return (
    <>
      <header className="masthead">
        <h1 className="wordmark">Clausewright<small>Contracts that check themselves against Indian law and pay on time</small></h1>
        <nav className="nav" aria-label="Main">
          {VIEWS.map(([v, label]) => (
            <button key={v} aria-current={view === v ? "page" : undefined} onClick={() => { location.hash = v; setView(v); }}>{label}</button>
          ))}
        </nav>
      </header>
      <main>
        {err && <p className="notice err" role="alert">Cannot reach the Clausewright server: {err}</p>}
        {meta && view === "draft" && <Draft meta={meta} />}
        {meta && view === "review" && <Review llm={meta.llm_enabled} />}
        {meta && view === "recover" && <Recover meta={meta} />}
        {meta && view === "evidence" && <Evidence />}
      </main>
      <footer className="foot">
        Clausewright drafts from fixed, tested rules and cites only authorities checked as of {meta?.kb_as_of ?? "…"}. It is not a law firm and
        this is not legal advice; have an advocate review important agreements. Escrows run on test networks with a demo token that has no value.
      </footer>
    </>
  );
}
