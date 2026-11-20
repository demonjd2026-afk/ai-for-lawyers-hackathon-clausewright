import { useSyncExternalStore } from "react";
import { navigate, type RouteId } from "./routes";

/** A guided demo is a script that drives the real interface, one highlighted control at a time.
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

export interface Tour { route: RouteId; steps: TourStep[] }

const DRAFT: TourStep[] = [
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
  { target: "funds", hold: 3600, caption: "That is the whole loop: one term sheet, a lawful contract, and an escrow proven to match it. Review, Recover and Prove each have a short demo too." },
];

const REVIEW: TourStep[] = [
  { target: "review-sample", click: true, hold: 2200, caption: "The other side has sent you their draft. This sample has the traps small suppliers meet most often." },
  { target: "review-run", click: true, caption: "Say which side you are on, then have every clause read against Indian law." },
  { target: "review-summary", hold: 3400, caption: "The clauses are split and counted, and the risky ones are flagged by how serious they are." },
  { target: "review-clause", hold: 4200, caption: "Each finding sits under the clause it concerns: what is wrong, what to ask for instead, and the authority behind it." },
];

const RECOVER: TourStep[] = [
  { target: "recover-invoices", hold: 3200, caption: "A micro studio has two invoices the buyer accepted months ago and never paid." },
  { target: "recover-calc", click: true, caption: "The MSMED Act caps credit at 45 days, then adds compound interest at three times the RBI Bank Rate. Calculate it." },
  { target: "recover-claim", hold: 3800, caption: "Interest is worked out to the paisa, invoice by invoice, from the day each one fell due." },
  { target: "recover-notice", click: true, caption: "Now put the claim in writing." },
  { target: "recover-letter", hold: 4200, caption: "A demand notice ready to send, citing sections 15 and 16 and stating the exact sum owed." },
];

const EVIDENCE: TourStep[] = [
  { target: "prove-sample", click: true, hold: 2400, caption: "A dispute starts with one question: is this the contract we both agreed? Load a sample: a mutual NDA drafted here." },
  { target: "prove-match", hold: 3600, caption: "Its SHA-256 is compared with the fingerprint on record. Identical, so not one character has changed." },
  { target: "prove-draft", click: true, caption: "A court needs that hash in a certificate under section 63 of the Bharatiya Sakshya Adhiniyam. Draft it." },
  { target: "prove-cert", hold: 4200, caption: "Part A, ready for signature. Your own file never leaves the browser; only its hash is sent." },
];

export const TOURS = {
  draft: { route: "draft", steps: DRAFT },
  review: { route: "review", steps: REVIEW },
  recover: { route: "recover", steps: RECOVER },
  evidence: { route: "evidence", steps: EVIDENCE },
} satisfies Partial<Record<RouteId, Tour>>;

export type TourId = keyof typeof TOURS;

export interface TourState { running: boolean; index: number; total: number; caption: string; target: string | null; error: string | null }
const IDLE: TourState = { running: false, index: 0, total: 0, caption: "", target: null, error: null };

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

export async function startTour(id: TourId = "draft") {
  const { route, steps } = TOURS[id];
  const my = ++token;
  navigate(route);
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
    // Centre small controls; show tall results from their top, clear of the floating header.
    if (el.offsetHeight > innerHeight * 0.55) scrollTo({ top: el.getBoundingClientRect().top + scrollY - 96, behavior: "smooth" });
    else el.scrollIntoView({ block: "center", behavior: "smooth" });
    set({ running: true, index: i, total: steps.length, caption, target: step.target, error: null });
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
