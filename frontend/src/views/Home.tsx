import { ArrowUpRight, Banknote, FileSignature, Link2, Play, ScrollText, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { BindingLoom } from "../components/BindingLoom";
import { Guilloche } from "../components/Seal";
import { Button } from "../components/ui/Button";
import { navigate } from "../app/routes";
import { REPO_URL } from "../app/Shell";
import { startTour } from "../app/tour";
import type { Meta } from "../types";

// Figures come from evals/RESULTS.md and the test suites; keep them in step with the README.
const RESULTS = [
  { value: "30 / 30", ink: "text-ok-600", label: "seeded contract-versus-code mismatches caught by the verifier" },
  { value: "6 / 6", ink: "text-accent-600", label: "seeded legal defects blocked before a word is drafted" },
  { value: "35", ink: "text-bad-600", label: "Solidity tests on the escrow: unit, 512-run fuzz and invariants" },
  { value: "100%", ink: "text-ok-600", label: "of AI intake fields correct on the golden set, injection attempt ignored" },
];

const STEPS = [
  { Icon: FileSignature, ink: "text-accent-600 bg-accent-500/10", title: "Draft from one term sheet", body: "Service agreements with milestones, mutual NDAs and Labour-Code appointment letters. Fixed rules write every clause, so the same terms always give the same text and the same SHA-256." },
  { Icon: ShieldCheck, ink: "text-bad-600 bg-bad-500/10", title: "Checked against the law first", body: "Twelve rule families: 45-day MSME payment, void non-competes, unilateral arbitrators, penalty clauses, DPDP processor terms, stamp duty, TDS. Each finding cites a checked authority and most fix themselves in one click." },
  { Icon: Link2, ink: "text-ok-600 bg-ok-500/10", title: "Bound to an escrow that pays on time", body: "The escrow's settings are derived from the same terms and printed in the contract as Schedule B. The provider confirms the contract's fingerprint on chain before the client funds; silence past the window releases payment." },
];

export function Home({ meta }: { meta: Meta | null }) {
  const reduce = useReducedMotion();
  const rise = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.07 * i, duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } });
  const rate = meta?.bank_rate.at(-1);

  return (
    <div className="overflow-x-clip">
      {/* Hero */}
      <section className="relative mx-auto max-w-[1500px] px-4 pt-10 pb-14 sm:px-6 lg:px-8 lg:pt-16 lg:pb-20">
        <Guilloche hash="0x9f3b61c20a77e4d85b1c" spin
          className="pointer-events-none absolute -top-24 -right-40 -z-10 size-[44rem] opacity-45 [mask-image:radial-gradient(closest-side,#000_55%,transparent)] max-lg:-top-40 max-lg:-right-72 max-lg:opacity-20" />
        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <motion.p {...rise(0)} className="inline-flex items-center gap-2 rounded-full border border-mist-200 bg-white/70 px-3 py-1 text-[0.8rem] font-semibold text-ink-700 backdrop-blur">
              <span className="size-1.5 rounded-full bg-ok-500" />Built for the HackIndia AI for Lawyers Hackathon 2026
            </motion.p>
            <motion.h1 {...rise(1)} className="mt-5 max-w-[12ch] font-display text-[2.9rem] leading-[0.95] font-extrabold tracking-[-0.035em] text-ink-900 [text-wrap:balance] sm:text-[4.2rem] xl:text-[5.4rem]">
              Contracts that check themselves, then pay on time.
            </motion.h1>
            <motion.p {...rise(2)} className="mt-6 max-w-[54ch] text-[1.08rem] leading-relaxed text-ink-700">
              Clausewright drafts Indian small-business agreements from fixed, cited rules and binds each one to an escrow whose settings are
              provably the same as the words on the page.
            </motion.p>
            <motion.div {...rise(3)} className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => void startTour()} icon={<Play className="size-4 fill-current" />}>Watch it run in 60 seconds</Button>
              <Button size="lg" variant="secondary" onClick={() => navigate("draft")} icon={<FileSignature className="size-4.5" />}>Draft a contract</Button>
            </motion.div>
            <motion.p {...rise(4)} className="mt-4 text-[0.84rem] text-mist-700">No sign-up and no wallet. The demo drives the real interface on a hosted test chain.</motion.p>
          </div>
          <motion.div {...rise(3)}><BindingLoom /></motion.div>
        </div>
      </section>

      {/* Results */}
      <section className="reveal mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-mist-200 bg-mist-200 sm:grid-cols-2 lg:grid-cols-4">
          {RESULTS.map((r) => (
            <div key={r.label} className="flex flex-col bg-white/85 p-6 backdrop-blur">
              <dt className="order-last mt-2 text-[0.86rem] leading-snug text-mist-700">{r.label}</dt>
              <dd className={`font-display text-[2.6rem] leading-none font-extrabold tracking-tight tabular-nums ${r.ink}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How it works */}
      <section className="reveal mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="max-w-[22ch] font-display text-[2.1rem] leading-[1.05] font-bold tracking-tight text-ink-900 sm:text-[2.6rem]">A contract and its code should be one thing</h2>
        <p className="mt-3 max-w-[64ch] text-[1rem] leading-relaxed text-ink-700">
          Micro and small suppliers are owed ₹20,979 crore in late payments, template contracts carry clauses Indian courts will not enforce, and AI tools
          invent authorities. Clausewright answers all three with the same mechanism.
        </p>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-mist-200 bg-white/85 p-6 shadow-panel backdrop-blur">
              <span className="absolute top-5 right-6 font-display text-[2.4rem] leading-none font-extrabold text-mist-200">{i + 1}</span>
              <span className={`grid size-11 place-items-center rounded-xl ${s.ink}`}><s.Icon className="size-5.5" strokeWidth={2} /></span>
              <h3 className="mt-5 font-display text-[1.25rem] font-bold tracking-tight text-ink-900">{s.title}</h3>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-700">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Tools: a bento of the four things you can do */}
      <section className="reveal mx-auto max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-[2.1rem] leading-[1.05] font-bold tracking-tight text-ink-900 sm:text-[2.6rem]">Four tools, one rulebook</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-6 lg:grid-rows-2">
          <button onClick={() => navigate("draft")}
            className="ledger group p-7 text-left transition-transform duration-300 hover:-translate-y-1 lg:col-span-3 lg:row-span-2">
            <Guilloche hash="0x51e77a09c4d2b86f31aa" inks={["var(--color-ok-400)", "var(--color-accent-300)", "var(--color-bad-300)"]} spin
              className="pointer-events-none absolute -right-24 -bottom-28 size-[26rem] opacity-50" />
            <div className="relative flex h-full min-h-64 flex-col">
              <div className="flex items-start justify-between"><FileSignature className="size-7 text-ok-300" /><ArrowUpRight className="size-5 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" /></div>
              <h3 className="mt-auto pt-10 font-display text-[2rem] leading-tight font-bold tracking-tight">Draft a contract</h3>
              <p className="mt-2 max-w-[44ch] text-[0.95rem] leading-relaxed text-ink-200">Describe the deal in plain words or fill the terms. Get a lawful agreement, a Word file, and an escrow bound to its fingerprint.</p>
            </div>
          </button>
          <ToolCard className="lg:col-span-3" onClick={() => navigate("review")} Icon={ScrollText} ink="text-bad-600" title="Review one you were sent"
            body="Paste the other side's draft. Void and risky clauses are flagged with what to ask for and the authority behind it." />
          <ToolCard className="lg:col-span-2" onClick={() => navigate("recover")} Icon={Banknote} ink="text-ok-600" title="Recover a late payment"
            body="Section 16 interest, exact to the paisa, and a demand notice."
            figure={rate ? `${(rate.pct * 3).toFixed(2)}%` : undefined} figureLabel="a year, compounded monthly" />
          <ToolCard className="lg:col-span-1" onClick={() => navigate("evidence")} Icon={ShieldCheck} ink="text-accent-600" title="Prove a document"
            body="Hash a file and draft the BSA s.63 certificate." />
        </div>
        <p className="mt-8 text-[0.86rem] text-mist-700">
          Rules reflect Indian law as of {meta?.kb_as_of ?? "…"}. Every authority the app cites is listed with its source in the
          <a className="ml-1 font-semibold text-ink-900 underline decoration-accent-500 decoration-2 underline-offset-4" href={`${REPO_URL}/blob/main/docs/LEGAL_BASIS.md`} target="_blank" rel="noopener noreferrer">legal basis</a>.
        </p>
      </section>
    </div>
  );
}

function ToolCard({ onClick, Icon, ink, title, body, figure, figureLabel, className }: {
  onClick: () => void; Icon: typeof Banknote; ink: string; title: string; body: string; figure?: string; figureLabel?: string; className?: string;
}) {
  return (
    <button onClick={onClick}
      className={`group flex flex-col rounded-2xl border border-mist-200 bg-white/85 p-6 text-left shadow-panel backdrop-blur transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-accent-500/50 hover:shadow-glow ${className ?? ""}`}>
      <div className="flex w-full items-start justify-between">
        <Icon className={`size-6 ${ink}`} />
        <ArrowUpRight className="size-5 text-mist-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-600" />
      </div>
      {figure && (
        <div className="mt-5">
          <span className={`font-display text-[2.4rem] leading-none font-extrabold tracking-tight tabular-nums ${ink}`}>{figure}</span>
          <span className="ml-2 text-[0.8rem] text-mist-700">{figureLabel}</span>
        </div>
      )}
      <h3 className="mt-auto pt-6 font-display text-[1.25rem] font-bold tracking-tight text-ink-900">{title}</h3>
      <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-700">{body}</p>
    </button>
  );
}
