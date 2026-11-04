import { clsx } from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { shortHash } from "../util";

export type SealState = "open" | "drafted" | "sealed";

const RING: Record<SealState, string> = {
  open: "NOT YET DRAFTED",
  drafted: "DOCUMENT FINGERPRINT",
  sealed: "BOUND TO ESCROW ON CHAIN",
};

/** The document's SHA-256, pressed as a seal. Grey while terms are incomplete, ink once the
 *  text exists, and teal with a short press when the chain read-back agrees with the text. */
export function Seal({ hash, state, size = 104 }: { hash?: string; state: SealState; size?: number }) {
  const reduce = useReducedMotion();
  const short = hash ? hash.slice(2, 8).toUpperCase() : "······";
  const color = state === "sealed" ? "text-teal-500" : state === "drafted" ? "text-ink-800" : "text-mist-500";
  return (
    <motion.div
      key={state}
      initial={reduce ? false : { scale: state === "open" ? 1 : 1.12, rotate: state === "open" ? 0 : -6, opacity: 0.4 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.6 }}
      className={clsx("relative shrink-0 select-none", color)} style={{ width: size, height: size }} aria-hidden
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <path id="seal-arc" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
        </defs>
        <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeDasharray={state === "open" ? "3 3" : undefined} />
        <circle cx="50" cy="50" r="42" fill={state === "sealed" ? "currentColor" : "none"} fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.8" />
        <text fontSize="7.2" letterSpacing="1.4" fontFamily="var(--font-sans)" fontWeight="700" fill="currentColor">
          <textPath href="#seal-arc" startOffset="0">{`${RING[state]} ✦ SHA-256 ✦`}</textPath>
        </text>
        <text x="50" y="55" textAnchor="middle" fontSize="13" fontFamily="var(--font-mono)" fontWeight="500" fill="currentColor">{short}</text>
      </svg>
      {state === "sealed" && !reduce && (
        <motion.span initial={{ scale: 0.6, opacity: 0.7 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border-2 border-teal-500" />
      )}
    </motion.div>
  );
}

export function SealBar({ hash, state, detail }: { hash?: string; state: SealState; detail: string }) {
  return (
    <div className={clsx("flex items-center gap-4 rounded-lg border px-4 py-3",
      state === "sealed" ? "border-teal-500/40 bg-teal-500/6" : state === "drafted" ? "border-paper-300 bg-white/60" : "border-dashed border-paper-300 bg-white/40")}
      role="group" aria-label="Document fingerprint">
      <Seal hash={hash} state={state} size={76} />
      <div className="min-w-0">
        <div className="font-mono text-[0.8rem] font-medium text-paper-900 break-all" title={hash}>{hash ? shortHash(hash, 12) : "No fingerprint yet"}</div>
        <p className="mt-0.5 text-[0.82rem] leading-snug text-paper-700">{detail}</p>
      </div>
    </div>
  );
}
