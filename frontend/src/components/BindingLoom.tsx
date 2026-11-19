import { clsx } from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Seal } from "./Seal";

/** The product's idea as a picture: each value in the contract's prose is tied to the same value
 *  in the deployed escrow. Threads draw one by one, then the seal presses. Values are from the
 *  worked example (website build, three milestones). */
const PAIRS = [
  { clause: "Fees and Payment", prose: "₹1,50,000.00", words: "Rupees One Lakh Fifty Thousand", field: "milestone[0].amount", chain: "15000000 paise" },
  { clause: "Delivery and Acceptance", prose: "ten (10) days", words: "to accept or object", field: "acceptanceWindow", chain: "864000 s" },
  { clause: "Escrow of Fees", prose: "0x7099…79C8", words: "the Client's wallet", field: "payer", chain: "0x7099…79C8" },
  { clause: "Schedule B", prose: "0x3403…1612", words: "SHA-256 of this Agreement", field: "documentHash", chain: "0x3403…1612" },
] as const;

// Where each prose row lands on the chain side. Not in order, so the threads weave.
const LANDS = [2, 0, 3, 1];
const ROW = 62, GAP = 10, H = PAIRS.length * ROW + (PAIRS.length - 1) * GAP;
const y = (i: number) => i * (ROW + GAP) + ROW / 2;
const STEP = 0.45, START = 0.7;

export function BindingLoom() {
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const [bound, setBound] = useState(!!reduce);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (reduce) return;
    setBound(false);
    const t = setTimeout(() => setBound(true), (START + PAIRS.length * STEP + 0.25) * 1000);
    return () => clearTimeout(t);
  }, [run, reduce]);

  const chainRows = PAIRS.map((_, slot) => LANDS.indexOf(slot));
  const dim = (i: number) => active !== null && active !== i;

  return (
    <div className="relative mx-auto w-full max-w-[34rem]">
      <div className="ledger p-4 shadow-[0_40px_90px_-40px_rgb(8_17_13/0.75)] sm:p-6">
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_16%_minmax(0,1fr)] text-[0.7rem] font-bold text-ink-200">
          <span>What the contract says</span><span />
          <span className="text-right">What the escrow holds</span>
        </div>

        <div className="relative grid grid-cols-[minmax(0,1fr)_16%_minmax(0,1fr)]" style={{ height: H }}>
          {/* Prose side */}
          <ul className="flex min-w-0 flex-col" style={{ gap: GAP }}>
            {PAIRS.map((p, i) => (
              <li key={p.field} tabIndex={0} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                style={{ height: ROW }}
                className={clsx("flex min-w-0 cursor-default flex-col justify-center rounded-lg bg-paper-100 px-2.5 sm:px-3 text-paper-900 transition-opacity duration-200", dim(i) && "opacity-40")}>
                <span className="truncate text-[0.62rem] font-semibold text-paper-700">{p.clause}</span>
                <span className="truncate font-serif text-[1.02rem] leading-tight font-semibold">{p.prose}</span>
                <span className="truncate text-[0.66rem] text-paper-700">{p.words}</span>
              </li>
            ))}
          </ul>

          {/* Threads */}
          <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
            {PAIRS.map((p, i) => {
              const d = `M0,${y(i)} C50,${y(i)} 50,${y(LANDS[i])} 100,${y(LANDS[i])}`;
              return (
                <g key={`${p.field}-${run}`} className={clsx("transition-opacity duration-200", dim(i) && "opacity-15")}>
                  <motion.path d={d} fill="none" stroke="var(--color-accent-400)" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                    strokeWidth={active === i ? 3 : 1.8}
                    initial={reduce ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: START + i * STEP, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
                  {bound && <path d={d} fill="none" stroke="var(--color-ok-400)" strokeWidth={active === i ? 3 : 1.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" className="animate-fade-in" />}
                </g>
              );
            })}
          </svg>

          {/* Chain side */}
          <ul className="flex min-w-0 flex-col" style={{ gap: GAP }}>
            {chainRows.map((i) => {
              const p = PAIRS[i];
              return (
                <li key={p.field} tabIndex={0} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                  style={{ height: ROW }}
                  className={clsx("flex min-w-0 cursor-default flex-col justify-center rounded-lg border px-2.5 sm:px-3 transition-[opacity,border-color,background-color] duration-300",
                    bound ? "border-ok-400/50 bg-ok-500/12" : "border-white/14 bg-ink-950/50", dim(i) && "opacity-40")}>
                  <span className="truncate font-mono text-[0.62rem] text-ink-200">{p.field}</span>
                  <span className={clsx("truncate font-mono text-[0.84rem] font-medium", bound ? "text-ok-300" : "text-white")}>{p.chain}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-4">
          <div className="rounded-full bg-paper-100 p-1"><Seal hash="0x34032ab6dadd" state={bound ? "sealed" : "drafted"} size={64} /></div>
          <p className="min-w-0 flex-1 text-[0.8rem] leading-snug text-ink-200" aria-live="polite">
            {bound
              ? <><span className="font-semibold text-ok-300">Bound.</span> These four are among 63 checks that must agree before the seal fills.</>
              : "Reading the escrow back from chain and comparing it with the page…"}
          </p>
          {!reduce && (
            <button type="button" onClick={() => setRun((r) => r + 1)} aria-label="Replay the binding"
              className="grid size-8 shrink-0 place-items-center rounded-md text-ink-200 transition-colors hover:bg-white/10 hover:text-white">
              <RotateCcw className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
