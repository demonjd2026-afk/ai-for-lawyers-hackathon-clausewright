import type { OnchainState } from "../chain";
import { inr } from "../util";

/** Where the fee is right now, from the escrow's own state: still held, released to the
 *  provider, or returned to the client. Widths animate as milestones settle. */
export function FundsBar({ state }: { state: OnchainState }) {
  const total = Number(state.totalAmount);
  if (!state.funded || total <= 0) return null;
  let toProvider = 0, toClient = 0;
  for (const m of state.milestones) {
    if (m.state !== 3) continue;
    const amount = Number(m.amount);
    const share = Math.floor((amount * m.payeeBps) / 10000);
    toProvider += share;
    toClient += amount - share;
  }
  const held = Math.max(0, total - toProvider - toClient);
  const parts = [
    { label: "Held in escrow", value: held, bar: "bg-warn-500", dot: "bg-warn-500" },
    { label: "Released to provider", value: toProvider, bar: "bg-ok-500", dot: "bg-ok-500" },
    { label: "Returned to client", value: toClient, bar: "bg-ink-500", dot: "bg-ink-500" },
  ];
  return (
    <div data-tour="funds" className="mb-4 rounded-lg border border-mist-200 bg-mist-50/70 p-3.5" role="img"
      aria-label={parts.map((p) => `${p.label} ${inr(p.value)}`).join(", ")}>
      <div className="flex h-3 overflow-hidden rounded-full bg-mist-200">
        {parts.map((p) => (
          <div key={p.label} className={`${p.bar} h-full transition-[width] duration-700 ease-out-expo`} style={{ width: `${(p.value / total) * 100}%` }} />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <div key={p.label} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-mist-700"><span className={`size-2 shrink-0 rounded-full ${p.dot}`} /><span className="truncate">{p.label}</span></dt>
            <dd className="mt-0.5 font-display text-[1.05rem] font-semibold tabular-nums text-ink-900">{inr(p.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
