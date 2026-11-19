import { clsx } from "clsx";
import { motion, useReducedMotion } from "motion/react";
import type { Verification } from "../types";

/** One cell per verification check. Text-and-schedule checks exist as soon as the contract is
 *  drafted; the on-chain checks join when a deployed escrow has been read back. A failed check
 *  shows red, so "63 of 63" is something you can see rather than take on trust. */
export function ProofMatrix({ text, chain }: { text: Verification; chain: Verification | null }) {
  const reduce = useReducedMotion();
  const full = chain ?? text;
  const onChain = chain ? Math.max(0, chain.total - text.total) : 0;
  const textCells = full.total - onChain;
  const failed = full.total - full.passed;
  // The API reports which checks failed but not their position; mark the count at the end of each group.
  const chainFailed = chain ? Math.min(onChain, chain.failed.filter((f) => f.id.startsWith("chain")).length) : 0;
  const textFailed = Math.max(0, failed - chainFailed);

  const cell = (kind: "text" | "chain", bad: boolean, i: number) => (
    <motion.span key={`${kind}-${i}`}
      initial={reduce || kind === "text" ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: kind === "chain" ? i * 0.035 : 0, type: "spring", stiffness: 500, damping: 24 }}
      className={clsx("size-2.5 rounded-[3px]", bad ? "bg-bad-500" : kind === "chain" ? "bg-ok-500" : "bg-paper-900/70")} />
  );

  return (
    <div className="mt-3 rounded-lg border border-paper-300 bg-white/50 px-4 py-3" role="img"
      aria-label={`${full.passed} of ${full.total} consistency checks pass${chain ? `, including ${onChain} read back from chain` : ""}`}>
      <div className="flex flex-wrap gap-[3px]">
        {Array.from({ length: textCells }, (_, i) => cell("text", i >= textCells - textFailed, i))}
        {Array.from({ length: onChain }, (_, i) => cell("chain", i >= onChain - chainFailed, i))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.74rem] text-paper-700">
        <span className="font-semibold text-paper-900 tabular-nums">{full.passed} of {full.total} checks agree</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-paper-900/70" />{textCells} text and Schedule B</span>
        {chain
          ? <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-ok-500" />{onChain} read back from chain</span>
          : <span>On-chain checks join after the escrow is deployed.</span>}
        {failed > 0 && <span className="inline-flex items-center gap-1.5 font-semibold text-bad-600"><span className="size-2 rounded-[2px] bg-bad-500" />{failed} disagree</span>}
      </div>
    </div>
  );
}
