import { ArrowUpRight, Banknote, FileSignature, Link2, ScrollText, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Seal } from "../components/Seal";
import { Button } from "../components/ui/Button";
import { navigate } from "../app/routes";
import { REPO_URL } from "../app/Shell";
import type { Meta } from "../types";

// Figures come from evals/RESULTS.md and the test suites; keep them in step with the README.
const RESULTS = [
  { value: "30 / 30", label: "seeded contract–code mismatches caught by the verifier" },
  { value: "6 / 6", label: "seeded legal defects blocked before a word is drafted" },
  { value: "35", label: "Solidity tests: unit, 512-run fuzz, 3 invariants" },
  { value: "100%", label: "precision on a 46-clause review corpus (96% recall)" },
];

const STEPS = [
  { Icon: FileSignature, title: "Draft from one term sheet", body: "Service agreements with milestones, mutual NDAs and Labour-Code appointment letters. Fixed rules write every clause, so the same terms always give the same text and the same SHA-256." },
  { Icon: ShieldCheck, title: "Checked against the law first", body: "Twelve rule families: 45-day MSME payment, void non-competes, unilateral arbitrators, penalty clauses, DPDP processor terms, stamp duty, TDS. Each finding cites a verified authority and most fix themselves in one click." },
  { Icon: Link2, title: "Bound to an escrow that pays on time", body: "The escrow's settings are derived from the same term sheet and printed in the contract as Schedule B. The provider confirms the contract's fingerprint on-chain before the client funds; silence past the window releases payment." },
];

const TOOLS = [
  { id: "draft", Icon: FileSignature, title: "Draft a contract", body: "Service agreement, NDA or appointment letter with escrow." },
  { id: "review", Icon: ScrollText, title: "Review one you were sent", body: "Flags void and risky clauses with authorities." },
  { id: "recover", Icon: Banknote, title: "Recover a late payment", body: "Section 16 interest and a demand notice." },
  { id: "evidence", Icon: ShieldCheck, title: "Prove a document", body: "Hash a file and draft the BSA s.63 certificate." },
] as const;

export function Home({ meta }: { meta: Meta | null }) {
  const reduce = useReducedMotion();
  const rise = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.08 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } });
  return (
    <div>
      <section className="aurora grain relative overflow-hidden px-5 pt-10 pb-12 text-white sm:px-8 lg:px-12 lg:pt-16 lg:pb-20">
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <motion.p {...rise(0)} className="text-[0.86rem] font-semibold text-saffron-300">HackIndia AI for Lawyers 2026 · PS-03 Smart Contract Creation</motion.p>
            <motion.h1 {...rise(1)} className="mt-4 max-w-[13ch] font-serif text-[2.6rem] leading-[1.02] font-semibold tracking-tight [text-wrap:balance] sm:text-[3.4rem] lg:text-[4rem]">
              Contracts that check themselves, then pay on time.
            </motion.h1>
            <motion.p {...rise(2)} className="mt-5 max-w-[52ch] text-[1.05rem] leading-relaxed text-ink-200">
              Clausewright drafts Indian small-business agreements from fixed, cited rules and binds each one to an escrow whose settings are
              provably the same as the words on the page. When the chain and the contract agree, the seal fills.
            </motion.p>
            <motion.div {...rise(3)} className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("draft")} icon={<FileSignature className="size-4.5" />}>Draft a contract</Button>
              <Button size="lg" variant="ghost" className="border-white/20 bg-white/8 text-white hover:bg-white/14 hover:border-white/30" onClick={() => navigate("review")}>Review one you were sent</Button>
            </motion.div>
            <motion.dl {...rise(4)} className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {RESULTS.map((r) => (
                <div key={r.label} className="flex flex-col">
                  <dt className="order-last mt-1 text-[0.76rem] leading-snug text-ink-200">{r.label}</dt>
                  <dd className="font-serif text-[1.7rem] leading-none font-semibold text-white tabular-nums">{r.value}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto w-full max-w-sm">
            <div className="rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-md shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)]">
              <div className="paper px-5 py-5 text-paper-900">
                <p className="text-[0.66rem] font-bold tracking-wide text-paper-700">Schedule B · Escrow parameters</p>
                <table className="doc-table mt-2">
                  <tbody>
                    <tr><td className="text-paper-700">Acceptance window</td><td className="text-right font-semibold">15 days</td></tr>
                    <tr><td className="text-paper-700">Milestone 1</td><td className="text-right font-semibold tabular-nums">₹1,50,000 · 1 Dec</td></tr>
                    <tr><td className="text-paper-700">Milestone 2</td><td className="text-right font-semibold tabular-nums">₹3,50,000 · 15 Jan</td></tr>
                    <tr><td className="text-paper-700">MSME mode</td><td className="text-right font-semibold">yes</td></tr>
                  </tbody>
                </table>
                <div className="mt-4 flex items-center gap-4">
                  <Seal hash="0x6b7f2c91d04e" state="sealed" size={88} />
                  <div className="text-[0.8rem] leading-snug text-paper-700">
                    <span className="font-semibold text-teal-600">63 of 63 checks agree</span><br />
                    text, Schedule B and the deployed escrow read back from chain
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-saffron-500/20 blur-3xl" aria-hidden />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-12">
        <h2 className="font-serif text-[1.8rem] font-semibold tracking-tight text-ink-900">Why a contract and its code should be one thing</h2>
        <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed text-mist-700">
          Micro and small suppliers are owed ₹20,979 crore in late payments, template contracts carry clauses Indian courts will not enforce, and AI tools
          invent authorities. Clausewright answers all three with the same mechanism.
        </p>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-xl border border-mist-200 bg-white p-6 shadow-panel">
              <span className="absolute top-5 right-5 font-serif text-[1.6rem] leading-none text-mist-300">{i + 1}</span>
              <s.Icon className="size-6 text-saffron-600" strokeWidth={2} />
              <h3 className="mt-4 text-[1.05rem] font-bold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-mist-700">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-8 lg:px-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => navigate(t.id)}
              className="group rounded-xl border border-mist-200 bg-white p-5 text-left shadow-panel transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-saffron-500/60 hover:shadow-glow">
              <div className="flex items-start justify-between">
                <t.Icon className="size-5 text-ink-600 group-hover:text-saffron-600" />
                <ArrowUpRight className="size-4 text-mist-300 group-hover:text-saffron-600" />
              </div>
              <div className="mt-4 font-bold text-ink-900">{t.title}</div>
              <div className="mt-1 text-[0.84rem] leading-snug text-mist-700">{t.body}</div>
            </button>
          ))}
        </div>
        <p className="mt-8 text-[0.84rem] text-mist-500">
          Rules reflect Indian law as of {meta?.kb_as_of ?? "…"}. Every authority the app cites is listed with its source in the
          <a className="ml-1 font-semibold text-ink-700 underline underline-offset-4" href={`${REPO_URL}/blob/main/docs/LEGAL_BASIS.md`} target="_blank" rel="noopener noreferrer">legal basis</a>.
        </p>
      </section>
    </div>
  );
}
