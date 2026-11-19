import { flushSync } from "react-dom";

/** Apply a state change inside a View Transition where the browser supports it, so route and
 *  wizard-step changes cross-fade instead of snapping. Elsewhere the change is immediate. */
export function withTransition(change: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced) return change();
  doc.startViewTransition(() => flushSync(change));
}
