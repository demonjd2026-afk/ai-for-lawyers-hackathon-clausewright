// Money is integer paise end to end; these helpers only format and parse for display.

export function groupIndian(n: number): string {
  const s = String(Math.trunc(Math.abs(n)));
  if (s.length <= 3) return s;
  const head = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${head},${s.slice(-3)}`;
}

export function inr(paise: number): string {
  const r = Math.floor(paise / 100);
  const p = paise % 100;
  return `₹${groupIndian(r)}${p ? "." + String(p).padStart(2, "0") : ""}`;
}

/** "1,50,000.50" -> 15000050 paise, or null if not a valid amount. */
export function parseRupees(input: string): number | null {
  const s = input.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ""] = s.split(".");
  const v = Number(w) * 100 + Number(f.padEnd(2, "0"));
  return Number.isSafeInteger(v) && v > 0 ? v : null;
}

export function rupeesInput(paise: number | undefined): string {
  if (!paise) return "";
  const r = Math.floor(paise / 100);
  const p = paise % 100;
  return groupIndian(r) + (p ? "." + String(p).padStart(2, "0") : "");
}

/** Immutable set by dotted path ("milestones.0.amount_paise"). */
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const parts = path.split(".");
  const root: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) };
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const next = node[k];
    node[k] = Array.isArray(next) ? [...next] : { ...(next ?? {}) };
    node = node[k];
  }
  node[parts[parts.length - 1]] = value;
  return root;
}

export function getPath(obj: unknown, path: string): any {
  return path.split(".").reduce<any>((n, k) => (n == null ? undefined : n[k]), obj);
}

export const shortHash = (h: string, n = 6) => (h.length > 2 * n + 2 ? `${h.slice(0, n + 2)}…${h.slice(-n)}` : h);

/** Calendar date in India (IST), offset by whole days. */
export function isoToday(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000 + 330 * 60_000).toISOString().slice(0, 10);
}
