import { Banknote, Calculator, Copy, Download, FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api, download, type InterestOut } from "../api";
import { Markdown } from "../components/Markdown";
import { Button } from "../components/ui/Button";
import { Money, Num, Select, Text } from "../components/ui/Field";
import { Empty, Notice, Panel, PanelHeading, SectionTitle, Stat } from "../components/ui/Primitives";
import { examples } from "../examples";
import type { Meta, Party } from "../types";
import { inr, isoToday } from "../util";

interface Inv { number: string; amount_paise: number; accepted_on: string; agreed_days: number }

const CATEGORY = [["micro", "Micro"], ["small", "Small"], ["medium", "Medium (not covered by s.15)"]] as const;

export function Recover({ meta }: { meta: Meta }) {
  const ex = examples()[0].ts;
  const [supplier, setSupplier] = useState<Party>(ex.provider);
  const [buyer, setBuyer] = useState<Party>(ex.client);
  const [invoices, setInvoices] = useState<Inv[]>([
    { number: "PN-2026-014", amount_paise: 15_000_000, accepted_on: isoToday(-110), agreed_days: 45 },
    { number: "PN-2026-019", amount_paise: 3_500_000, accepted_on: isoToday(-60), agreed_days: 30 },
  ]);
  const [paidOn, setPaidOn] = useState(isoToday());
  // Used only for days before the earliest sourced Bank Rate; shown and editable.
  const [earlierRate, setEarlierRate] = useState("5.50");
  const [calc, setCalc] = useState<InterestOut[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"calc" | "notice" | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rate = meta.bank_rate[meta.bank_rate.length - 1];

  const dueOf = (i: Inv) => {
    const d = new Date(i.accepted_on + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + Math.min(i.agreed_days, 45));
    return d.toISOString().slice(0, 10);
  };
  const patch = (i: number, p: Partial<Inv>) => setInvoices(invoices.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const override = earlierRate ? { bank_rate_override_pct: earlierRate } : {};

  async function compute() {
    setErr(null);
    setBusy("calc");
    try {
      setCalc(await Promise.all(invoices.map((i) => api.interest({ principal_paise: i.amount_paise, due_date: dueOf(i), paid_on: paidOn, ...override }))));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function makeNotice() {
    setErr(null);
    setBusy("notice");
    try {
      const r = await api.demand({ supplier, buyer, invoices, paid_on: paidOn, ...override });
      setNotice(r.text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function copyNotice() {
    if (!notice) return;
    await navigator.clipboard.writeText(notice);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const total = calc?.reduce((a, c) => a + c.interest_paise, 0) ?? 0;
  const principal = invoices.reduce((a, i) => a + i.amount_paise, 0);
  const grid2 = "grid gap-3 sm:grid-cols-2";

  return (
    <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel className="self-start">
        <PanelHeading title="Recover a late payment"
          lede={<>
            A buyer must pay a micro or small enterprise within 45 days of accepting its work and owes compound interest at three times the RBI Bank Rate after that, whatever the contract says.
            {rate && <> Bank Rate used: <strong className="font-semibold text-ink-900">{rate.pct}%</strong> from {new Date(rate.from).toLocaleDateString("en-IN")}, so <strong className="font-semibold text-ink-900">{(rate.pct * 3).toFixed(2)}% a year</strong> with monthly rests.</>}
          </>} />

        <SectionTitle>Your enterprise</SectionTitle>
        <div className={grid2}>
          <Text label="Name" value={supplier.name} onChange={(v) => setSupplier({ ...supplier, name: v })} />
          <Text label="Udyam number" mono value={supplier.udyam_number} onChange={(v) => setSupplier({ ...supplier, udyam_number: v.toUpperCase() || null })} />
          <Select label="Category" value={(supplier.msme_category ?? "micro") as (typeof CATEGORY)[number][0]} options={CATEGORY}
            onChange={(v) => setSupplier({ ...supplier, msme_category: v as Party["msme_category"] })} />
          <Text label="Signatory" value={supplier.signatory_name} onChange={(v) => setSupplier({ ...supplier, signatory_name: v })} />
        </div>

        <SectionTitle>The buyer</SectionTitle>
        <div className={grid2}>
          <Text label="Name" value={buyer.name} onChange={(v) => setBuyer({ ...buyer, name: v })} />
          <Text label="Email" type="email" value={buyer.email} onChange={(v) => setBuyer({ ...buyer, email: v })} />
          <Text label="Address" value={buyer.address} onChange={(v) => setBuyer({ ...buyer, address: v })} className="sm:col-span-2" />
        </div>

        <SectionTitle aside={<span className="text-[0.8rem] text-mist-700">Total <strong className="font-semibold text-ink-900 tabular-nums">{inr(principal)}</strong></span>}>Unpaid invoices</SectionTitle>
        <ol className="space-y-3" aria-label="Invoices">
          {invoices.map((inv, i) => (
            <li key={i} className="rounded-lg border border-mist-200 bg-mist-50/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.8rem] font-bold text-ink-900">Invoice {i + 1}</span>
                <Button variant="ghost" size="sm" disabled={invoices.length === 1} aria-label={`Remove invoice ${i + 1}`}
                  icon={<Trash2 className="size-4" />} onClick={() => setInvoices(invoices.filter((_, j) => j !== i))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Text label="Invoice number" value={inv.number} onChange={(v) => patch(i, { number: v })} />
                <Money label="Amount" paise={inv.amount_paise} onChange={(v) => patch(i, { amount_paise: v })} />
                <Text label="Accepted on" type="date" value={inv.accepted_on} onChange={(v) => patch(i, { accepted_on: v })} />
                <Num label="Agreed payment days" value={inv.agreed_days} min={0} max={45} suffix="days" hint={inv.agreed_days >= 45 ? "Capped at 45 by s.15." : undefined}
                  onChange={(v) => patch(i, { agreed_days: Math.min(45, v ?? 0) })} />
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-3">
          <Button variant="ghost" size="sm" icon={<Plus className="size-4" />}
            onClick={() => setInvoices([...invoices, { number: "", amount_paise: 100_000_00, accepted_on: isoToday(-60), agreed_days: 30 }])}>Add invoice</Button>
        </div>

        <div className={`${grid2} mt-5`}>
          <Text label="Compute interest up to" type="date" value={paidOn} onChange={setPaidOn} />
          <Text label="Bank Rate before 7 Oct 2026 (%)" value={earlierRate} onChange={setEarlierRate}
            hint="Used only for days before the sourced rate history. Secondary sources give 5.50%; confirm for older periods." />
        </div>
        {err && <Notice tone="err" role="alert" className="mt-3">{err}</Notice>}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button loading={busy === "calc"} disabled={!!busy} onClick={compute} icon={<Calculator className="size-4" />}>Calculate interest</Button>
          <Button variant="secondary" loading={busy === "notice"} disabled={!!busy} onClick={makeNotice} icon={<FileText className="size-4" />}>Draft demand notice</Button>
        </div>
      </Panel>

      <div className="space-y-6 self-start">
        <Panel aria-live="polite">
          {calc ? (
            <>
              <PanelHeading title="Your claim" lede="Principal plus section 16 interest, invoice by invoice." />
              <div className="grid gap-2 sm:grid-cols-3">
                <Stat label="Principal" value={inr(principal)} />
                <Stat label="Interest under s.16" value={inr(total)} tone="warn" />
                <Stat label="You can claim" value={inr(principal + total)} tone="ok" />
              </div>
              <table className="mt-4 w-full border-collapse text-[0.86rem]">
                <thead>
                  <tr className="text-left text-[0.74rem] font-semibold text-mist-500">
                    <th className="border-b border-mist-200 py-2 pr-3">Invoice</th>
                    <th className="border-b border-mist-200 py-2 pr-3">Due</th>
                    <th className="border-b border-mist-200 py-2 pr-3 text-right">Days late</th>
                    <th className="border-b border-mist-200 py-2 text-right">Interest</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.map((c, i) => (
                    <tr key={i}>
                      <td className="border-b border-mist-100 py-2 pr-3 font-medium text-ink-900">{invoices[i].number || `Invoice ${i + 1}`}</td>
                      <td className="border-b border-mist-100 py-2 pr-3 tabular-nums">{new Date(dueOf(invoices[i])).toLocaleDateString("en-IN")}</td>
                      <td className="border-b border-mist-100 py-2 pr-3 text-right tabular-nums">{Math.max(0, c.days_late)}</td>
                      <td className="border-b border-mist-100 py-2 text-right font-semibold tabular-nums text-ink-900">{inr(c.interest_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[0.78rem] leading-snug text-mist-500">{calc[0]?.convention}</p>
            </>
          ) : (
            <Empty icon={<Banknote className="size-8" />} title="Your claim appears here">
              Interest is computed exactly, in paise, with monthly rests from the day each invoice fell due.
            </Empty>
          )}
        </Panel>

        {notice && (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-[0.95rem] font-bold text-ink-900">Demand notice</h3>
              <span className="ml-auto flex gap-2">
                <Button size="sm" variant="ghost" icon={<Copy className="size-4" />} onClick={copyNotice}>{copied ? "Copied" : "Copy"}</Button>
                <Button size="sm" variant="ghost" icon={<Download className="size-4" />}
                  onClick={() => download(new Blob([notice], { type: "text/markdown" }), "msme-demand-notice.md")}>Download</Button>
              </span>
            </div>
            <Markdown text={notice} />
          </div>
        )}
      </div>
    </div>
  );
}
