import { useSyncExternalStore } from "react";
import { navigate } from "./routes";

/** The guided demo: a script that drives the real interface, one highlighted control at a time.
 *  It clicks the same buttons a person would, so what it shows is the product, not a recording. */
export interface TourStep {
  /** `data-tour` value of the element to point at. */
  target: string;
  /** What to say while pointing. Empty keeps the previous caption (used for role switches). */
  caption: string;
  /** Click the element after the pause; otherwise only point at it. */
  click?: boolean;
  /** How long to hold before acting, in ms. */
  hold?: number;
}

export const DEMO: TourStep[] = [
  { target: "step-describe", click: true, hold: 900, caption: "A micro design studio is building a website for a client. We start from that deal." },
  { target: "example-service", click: true, caption: "The worked example loads, and Clausewright checks its terms against Indian law at once." },
  { target: "findings-summary", hold: 3200, caption: "Six must-fix problems, such as 60-day payment to a micro supplier, a void non-compete and a one-sided arbitrator." },
  { target: "fix-all", click: true, caption: "Every finding cites its authority and carries a fix. Apply them all." },
  { target: "seal", hold: 3200, caption: "With no blockers left, the contract is drafted and fingerprinted. This rosette is engraved from its SHA-256." },
  { target: "go-escrow", click: true, caption: "Now bind the contract to an escrow." },
  { target: "deploy", click: true, caption: "The escrow's settings come from the same terms and are printed in the contract as Schedule B. Deploy it." },
  { target: "verified", hold: 3400, caption: "Read back from chain: every check agrees, the proof matrix fills and the seal turns to three inks." },
  { target: "role-payee", click: true, hold: 700, caption: "" },
  { target: "ack", click: true, caption: "The provider confirms the fingerprint of the contract they actually read." },
  { target: "role-payer", click: true, hold: 700, caption: "" },
  { target: "fund", click: true, caption: "The client deposits the full fee into escrow." },
  { target: "role-payee", click: true, hold: 700, caption: "" },
  { target: "deliver-0", click: true, caption: "The provider marks the first milestone delivered. The client now has ten days to accept or object." },
  { target: "role-payer", click: true, hold: 700, caption: "" },
  { target: "accept-0", click: true, caption: "The client accepts and the money is released. Had the client stayed silent, the escrow would release it by itself after the window." },
  { target: "role-payee", click: true, hold: 700, caption: "" },
  { target: "withdraw-payee", click: true, caption: "The provider withdraws. Paid on time, by code." },
  { target: "funds", hold: 3600, caption: "That is the whole loop: one term sheet, a lawful contract, and an escrow proven to match it. Now try your own terms." },
];

export interface TourState { running: boolean; index: number; caption: string; target: string | null; error: string | null }
const IDLE: TourState = { running: false, index: 0, caption: "", target: null, error: null };

let state: TourState = IDLE;
let token = 0;
const listeners = new Set<() => void>();
const set = (next: TourState) => { state = next; listeners.forEach((l) => l()); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const findTarget = (id: string) => document.querySelector<HTMLElement>(`[data-tour="${id}"]`);

async function waitFor(id: string, my: number, timeout = 45_000): Promise<HTMLElement | null> {
  const end = Date.now() + timeout;
  while (Date.now() < end && my === token) {
    const el = findTarget(id);
    if (el && !(el as HTMLButtonElement).disabled && el.getClientRects().length) return el;
    await sleep(150);
  }
  return null;
}

export async function startTour(steps: TourStep[] = DEMO) {
  const my = ++token;
  navigate("draft");
  let caption = "";
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const el = await waitFor(step.target, my);
    if (my !== token) return;
    if (!el) {
      set({ ...state, running: false, target: null, error: "The demo stopped because the next control did not appear. You can carry on by hand from here." });
      return;
    }
    caption = step.caption || caption;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    set({ running: true, index: i, caption, target: step.target, error: null });
    await sleep(step.hold ?? 2600);
    if (my !== token) return;
    if (step.click) findTarget(step.target)?.click();
    await sleep(350);
  }
  if (my === token) set(IDLE);
}

export function stopTour() {
  token++;
  set(IDLE);
}

export function useTour(): TourState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}
