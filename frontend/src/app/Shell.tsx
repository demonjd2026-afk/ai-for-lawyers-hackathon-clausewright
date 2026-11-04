import { clsx } from "clsx";
import { Banknote, CodeXml, FileSignature, Menu, Scale, ScrollText, ShieldCheck, Sparkles, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Meta } from "../types";
import { navigate, ROUTES, type RouteId } from "./routes";

const ICON: Record<RouteId, typeof Scale> = {
  home: Scale, draft: FileSignature, review: ScrollText, recover: Banknote, evidence: ShieldCheck,
};

export const REPO_URL = "https://github.com/demonjd2026-afk/ai-for-lawyers-hackathon-clausewright";

function Wordmark() {
  return (
    <button onClick={() => navigate("home")} className="flex items-center gap-2.5 rounded-md" aria-label="Clausewright home">
      <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-saffron-500 to-teal-500 text-ink-950 shadow-glow">
        <Scale className="size-4" strokeWidth={2.5} />
      </span>
      <span className="font-serif text-[1.25rem] font-semibold tracking-tight text-white">Clausewright</span>
    </button>
  );
}

function NavItem({ id, active, onPick }: { id: RouteId; active: boolean; onPick: () => void }) {
  const r = ROUTES.find((x) => x.id === id)!;
  const Icon = ICON[id];
  return (
    <button onClick={() => { navigate(id); onPick(); }} aria-current={active ? "page" : undefined}
      className={clsx("group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[0.9rem] font-semibold transition-colors",
        active ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]" : "text-ink-200 hover:bg-white/6 hover:text-white")}>
      <Icon className={clsx("size-4.5 shrink-0", active ? "text-saffron-400" : "text-ink-300 group-hover:text-saffron-300")} strokeWidth={2.2} />
      {r.label}
    </button>
  );
}

export function Shell({ route, meta, children }: { route: RouteId; meta: Meta | null; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rate = meta?.bank_rate.at(-1);
  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {ROUTES.map((r) => <NavItem key={r.id} id={r.id} active={route === r.id} onPick={() => setOpen(false)} />)}
    </nav>
  );
  const status = meta && (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[0.76rem]">
      <dt className="text-ink-300">AI intake</dt>
      <dd className="flex items-center gap-1.5 font-semibold text-white"><Sparkles className={clsx("size-3.5", meta.llm_enabled ? "text-saffron-400" : "text-ink-300")} />{meta.llm_enabled ? "On" : "Rules only"}</dd>
      <dt className="text-ink-300">Law as of</dt>
      <dd className="font-semibold text-white tabular-nums">{meta.kb_as_of}</dd>
      {rate && <><dt className="text-ink-300">Bank Rate</dt><dd className="font-semibold text-white tabular-nums">{rate.pct}% (s.16: {(rate.pct * 3).toFixed(2)}%)</dd></>}
      <dt className="text-ink-300">Escrow chain</dt>
      <dd className="font-semibold text-white capitalize">{meta.default_chain}</dd>
    </dl>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-ink-900 px-4 py-3 text-white lg:hidden">
        <Wordmark />
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="rounded-md p-2 hover:bg-white/10">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-14 z-40 border-t border-white/10 bg-ink-900 p-4 text-white shadow-xl lg:hidden animate-fade-in">
          {nav}
          <div className="mt-4 border-t border-white/10 pt-4">{status}</div>
        </div>
      )}

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-ink-900 px-4 py-5 text-white lg:flex">
        <div className="px-1"><Wordmark /></div>
        <p className="mt-2 px-1 text-[0.78rem] leading-snug text-ink-300">Contracts that check themselves against Indian law and pay on time.</p>
        <div className="mt-7">{nav}</div>
        <div className="mt-auto space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/4 p-3">{status ?? <span className="text-[0.76rem] text-ink-300">Connecting to the server…</span>}</div>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-1 text-[0.78rem] font-semibold text-ink-200 hover:text-white">
            <CodeXml className="size-4" /> Source on GitHub
          </a>
        </div>
      </aside>

      <div className="min-w-0">
        {children}
        <footer className="px-5 pb-8 pt-4 text-[0.76rem] leading-relaxed text-mist-500 sm:px-8">
          Clausewright drafts from fixed, tested rules and cites only authorities checked as of {meta?.kb_as_of ?? "…"}. It is not a law firm and this is
          not legal advice; have an advocate review important agreements. Escrows run on test networks with a demo token that has no value.
        </footer>
      </div>
    </div>
  );
}
