import { clsx } from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { shortHash } from "../util";

export type SealState = "open" | "drafted" | "sealed";

const INKS = ["var(--color-ok-500)", "var(--color-accent-500)", "var(--color-bad-500)"];

/** Bytes of a hex hash; a fixed pattern when there is no hash yet. */
function bytes(hash?: string): number[] {
  const hex = (hash ?? "").replace(/^0x/, "");
  const out: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16) || 0);
  while (out.length < 12) out.push((out.length * 53 + 17) % 256);
  return out;
}

/** One guilloche band: `strands` sine-modulated rings sharing a petal count, phase-shifted
 *  against each other so their crossings make the engraved lattice. */
function band(radius: number, amplitude: number, petals: number, strands: number, phase: number): string[] {
  const paths: string[] = [];
  const steps = 240;
  for (let s = 0; s < strands; s++) {
    const shift = phase + (s / strands) * Math.PI * 2;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const r = radius + amplitude * Math.sin(petals * t + shift);
      d += `${i ? "L" : "M"}${(50 + r * Math.cos(t)).toFixed(2)},${(50 + r * Math.sin(t)).toFixed(2)}`;
    }
    paths.push(d + "Z");
  }
  return paths;
}

/** A rosette engraved from a hash, in the manner of stamp paper and banknotes. Petal counts,
 *  depths and phases are taken from the hash's bytes, so two documents that differ by one
 *  character have visibly different rosettes. `spin` turns the bands slowly against each other. */
export function Guilloche({ hash, inks = INKS, spin = false, className }: { hash?: string; inks?: string[]; spin?: boolean; className?: string }) {
  const bands = useMemo(() => {
    const b = bytes(hash);
    return [
      { paths: band(40, 4.5 + (b[0] % 30) / 10, 9 + (b[1] % 12), 6, (b[2] / 255) * 6.28), ink: inks[0] },
      { paths: band(30, 4 + (b[3] % 30) / 10, 7 + (b[4] % 10), 6, (b[5] / 255) * 6.28), ink: inks[1 % inks.length] },
      { paths: band(20.5, 3 + (b[6] % 25) / 10, 5 + (b[7] % 8), 5, (b[8] / 255) * 6.28), ink: inks[2 % inks.length] },
    ];
  }, [hash, inks]);
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {bands.map((bd, i) => (
        <g key={i} className={clsx(spin && "origin-center animate-spin-slow")}
          style={spin ? { animationDirection: i % 2 ? "reverse" : "normal", animationDuration: `${70 + i * 30}s`, transformBox: "fill-box" } : undefined}>
          {bd.paths.map((d, j) => <path key={j} d={d} fill="none" stroke={bd.ink} strokeWidth={0.32} strokeOpacity={0.9} />)}
        </g>
      ))}
    </svg>
  );
}

/** The document's SHA-256 as a seal. Dashed and grey while terms are incomplete; engraved in a
 *  single ink once the text exists; in all three inks, with a press, when the chain read-back
 *  agrees with the text. */
export function Seal({ hash, state, size = 104 }: { hash?: string; state: SealState; size?: number }) {
  const reduce = useReducedMotion();
  const short = hash ? hash.slice(2, 8).toUpperCase() : "······";
  const inks = state === "sealed" ? INKS : state === "drafted" ? ["var(--color-ink-700)"] : ["var(--color-mist-300)"];
  return (
    <motion.div
      key={state}
      initial={reduce ? false : { scale: state === "open" ? 1 : 1.12, rotate: state === "open" ? 0 : -6, opacity: 0.4 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.6 }}
      className="relative shrink-0 select-none" style={{ width: size, height: size }} aria-hidden
    >
      <Guilloche hash={state === "open" ? undefined : hash} inks={inks} className="h-full w-full" />
      <span className={clsx("absolute inset-0 grid place-items-center font-mono font-semibold",
        state === "sealed" ? "text-ok-600" : state === "drafted" ? "text-ink-800" : "text-mist-500")}
        style={{ fontSize: Math.max(8, size * 0.125) }}>
        <span className="rounded-full bg-paper-100/90 px-1.5 py-0.5 leading-none">{short}</span>
      </span>
      {state === "sealed" && !reduce && (
        <motion.span initial={{ scale: 0.6, opacity: 0.7 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border-2 border-ok-500" />
      )}
    </motion.div>
  );
}

const STATE_LABEL: Record<SealState, string> = {
  open: "Not yet drafted",
  drafted: "Document fingerprint",
  sealed: "Bound to escrow on chain",
};

export function SealBar({ hash, state, detail }: { hash?: string; state: SealState; detail: string }) {
  return (
    <div className={clsx("flex items-center gap-4 rounded-lg border px-4 py-3",
      state === "sealed" ? "border-ok-500/40 bg-ok-500/6" : state === "drafted" ? "border-paper-300 bg-white/60" : "border-dashed border-paper-300 bg-white/40")}
      role="group" aria-label="Document fingerprint">
      <Seal hash={hash} state={state} size={84} />
      <div className="min-w-0">
        <div className={clsx("text-[0.72rem] font-bold", state === "sealed" ? "text-ok-600" : "text-paper-700")}>{STATE_LABEL[state]}</div>
        <div className="font-mono text-[0.8rem] font-medium text-paper-900 break-all" title={hash}>{hash ? shortHash(hash, 12) : "No fingerprint yet"}</div>
        <p className="mt-0.5 text-[0.82rem] leading-snug text-paper-700">{detail}</p>
      </div>
    </div>
  );
}
