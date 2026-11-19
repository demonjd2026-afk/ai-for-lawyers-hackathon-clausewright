import { clsx } from "clsx";
import { CodeXml, Menu, Play, Search, Sparkles, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Guilloche } from "../components/Seal";
import type { Meta } from "../types";
import { CommandPalette, REPO_URL } from "./CommandPalette";
import { navigate, ROUTES, type RouteId } from "./routes";
import { startTour, useTour } from "./tour";
import { TourOverlay } from "./TourOverlay";

export { REPO_URL };

function Wordmark() {
  return (
    <button onClick={() => navigate("home")} className="flex items-center gap-2 rounded-md" aria-label="Clausewright home">
      <Guilloche hash="0xc1a05e7719470a2be4" className="size-9" />
      <span className="font-display text-[1.3rem] font-bold tracking-tight text-ink-900">Clausewright</span>
    </button>
  );
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function Shell({ route, meta, children }: { route: RouteId; meta: Meta | null; children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  const tour = useTour();
  const rate = meta?.bank_rate.at(-1);
  const chain = meta ? (meta.default_chain === "local" && meta.demo_chain.hosted ? "Hosted demo chain" : meta.default_chain === "local" ? "Local chain" : "Sepolia") : null;

  const links = ROUTES.filter((r) => r.id !== "home").map((r) => (
    <button key={r.id} onClick={() => { navigate(r.id); setMenu(false); }} aria-current={route === r.id ? "page" : undefined}
      className={clsx("rounded-full px-3.5 py-1.5 text-[0.88rem] font-semibold whitespace-nowrap transition-colors",
        route === r.id ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-900/8 hover:text-ink-900")}>
      {r.short}
    </button>
  ));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 rounded-2xl border border-white/70 bg-white/75 px-3 py-2 shadow-panel backdrop-blur-xl sm:px-4">
          <Wordmark />
          <nav aria-label="Main" className="ml-3 hidden items-center gap-1 lg:flex">{links}</nav>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setPalette(true)} aria-label="Search and commands"
              className="hidden h-9 items-center gap-2 rounded-lg border border-mist-200 bg-white/70 px-2.5 text-[0.82rem] text-mist-700 transition-colors hover:border-mist-300 hover:text-ink-900 sm:flex">
              <Search className="size-4" /><span className="hidden xl:inline">Go to…</span>
              <kbd className="rounded border border-mist-200 bg-mist-50 px-1.5 font-mono text-[0.68rem]">{isMac ? "⌘" : "Ctrl"} K</kbd>
            </button>
            <button type="button" onClick={() => void startTour()} disabled={tour.running}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-accent-500 px-3 text-[0.84rem] font-semibold text-white shadow-[0_8px_18px_-8px_rgb(106_85_232/0.9)] transition-colors hover:bg-accent-400 disabled:opacity-60">
              <Play className="size-3.5 fill-current" /><span className="hidden sm:inline">Watch the demo</span><span className="sm:hidden">Demo</span>
            </button>
            <button onClick={() => setMenu((o) => !o)} aria-expanded={menu} aria-label="Menu" className="rounded-lg p-2 text-ink-800 hover:bg-ink-900/8 lg:hidden">
              {menu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menu && (
          <nav aria-label="Main" className="mx-auto mt-2 flex max-w-[1500px] flex-wrap gap-1 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-panel backdrop-blur-xl animate-fade-in lg:hidden">
            {links}
          </nav>
        )}
      </header>

      <main className="min-w-0 flex-1">{children}</main>

      <footer className="mx-auto w-full max-w-[1500px] px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {meta && (
          <dl className="mb-4 flex flex-wrap gap-2 text-[0.76rem]">
            {[
              ["AI intake and review", <span key="ai" className="inline-flex items-center gap-1"><Sparkles className={clsx("size-3.5", meta.llm_enabled ? "text-accent-500" : "text-mist-500")} />{meta.llm_enabled ? "On" : "Rules only"}</span>],
              ["Law as of", meta.kb_as_of],
              ...(rate ? [["RBI Bank Rate", `${rate.pct}% (s.16 interest ${(rate.pct * 3).toFixed(2)}%)`]] : []),
              ["Escrow network", chain],
            ].map(([k, v]) => (
              <div key={k as string} className="flex items-center gap-2 rounded-full border border-mist-200 bg-white/70 px-3 py-1.5">
                <dt className="text-mist-700">{k}</dt><dd className="font-semibold text-ink-900 tabular-nums">{v}</dd>
              </div>
            ))}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-mist-200 bg-white/70 px-3 py-1.5 font-semibold text-ink-900 hover:border-mist-300">
              <CodeXml className="size-3.5" />Source on GitHub
            </a>
          </dl>
        )}
        <p className="max-w-[110ch] text-[0.76rem] leading-relaxed text-mist-700">
          Clausewright drafts from fixed, tested rules and cites only authorities checked as of {meta?.kb_as_of ?? "…"}. It is not a law firm and this is
          not legal advice; have an advocate review important agreements. Escrows run on test networks with a demo token that has no value.
        </p>
      </footer>

      <CommandPalette open={palette} onOpenChange={setPalette} />
      <TourOverlay />
    </div>
  );
}
