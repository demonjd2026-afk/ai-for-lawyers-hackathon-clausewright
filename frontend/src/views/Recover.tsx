import { useState } from "react";
import { api, download, type InterestOut } from "../api";
import { Money, Num, Text } from "../components/Fields";
import { Markdown } from "../components/Markdown";
import { examples } from "../examples";
import type { Meta, Party } from "../types";
import { inr, isoToday } from "../util";

interface Inv { number: string; amount_paise: number; accepted_on: string; agreed_days: number }

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
  const [err, setErr] = useState<string | null>(null);
  const rate = meta.bank_rate[meta.bank_rate.length - 1];

  const dueOf = (i: Inv) => {
    const d = new Date(i.accepted_on + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + Math.min(i.agreed_days, 45));
    return d.toISOString().slice(0, 10);
  };

  async function compute() {
    setErr(null);
    try {
      setCalc(await Promise.all(invoices.map((i) => api.interest({ principal_paise: i.amount_paise, due_date: dueOf(i), paid_on: paidOn,
        ...(earlierRate ? { bank_rate_override_pct: earlierRate } : {}) }))));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function makeNotice() {
    setErr(null);
    try {
      const r = await api.demand({ supplier, buyer, invoices, paid_on: paidOn,
        ...(earlierRate ? { bank_rate_override_pct: earlierRate } : {}) });
      setNotice(r.text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  const total = calc?.reduce((a, c) => a + c.interest_paise, 0) ?? 0;
  const principal = invoices.reduce((a, i) => a + i.amount_paise, 0);

  return (
    <div className="bench">
      <div className="panel">
        <h2>Recover a late payment</h2>
        <p className="lede">If you are a micro or small enterprise, a buyer must pay within 45 days of accepting your work, and owes
          compound interest at three times the RBI Bank Rate after that, whatever the contract says.
          {rate && ` Bank Rate used: ${rate.pct}% from ${new Date(rate.from).toLocaleDateString("en-IN")}, so ${(rate.pct * 3).toFixed(2)}% a year.`}</p>

        <h3>Your enterprise</h3>
        <div className="grid2">
          <Text label="Name" value={supplier.name} onChange={(v) => setSupplier({ ...supplier, name: v })} />
          <Text label="Udyam number" value={supplier.udyam_number} onChange={(v) => setSupplier({ ...supplier, udyam_number: v.toUpperCase() || null })} />
          <label className="field"><span>Category</span>
            <select value={supplier.msme_category ?? "micro"} onChange={(e) => setSupplier({ ...supplier, msme_category: e.target.value as Party["msme_category"] })}>
              <option value="micro">Micro</option><option value="small">Small</option><option value="medium">Medium (not covered)</option>
            </select>
          </label>
          <Text label="Signatory" value={supplier.signatory_name} onChange={(v) => setSupplier({ ...supplier, signatory_name: v })} />
        </div>
        <h3>The buyer</h3>
        <div className="grid2">
          <Text label="Name" value={buyer.name} onChange={(v) => setBuyer({ ...buyer, name: v })} />
          <Text label="Email" value={buyer.email} onChange={(v) => setBuyer({ ...buyer, email: v })} />
          <div style={{ gridColumn: "1 / -1" }}><Text label="Address" value={buyer.address} onChange={(v) => setBuyer({ ...buyer, address: v })} /></div>
        </div>

        <h3>Unpaid invoices</h3>
        {invoices.map((inv, i) => (
          <div className="ms" key={i} style={{ gridTemplateColumns: "1fr 1fr 1fr 0.8fr auto" }}>
            <Text label="Invoice" value={inv.number} onChange={(v) => setInvoices(invoices.map((x, j) => (j === i ? { ...x, number: v } : x)))} />
            <Money label="Amount (₹)" paise={inv.amount_paise} onChange={(v) => setInvoices(invoices.map((x, j) => (j === i ? { ...x, amount_paise: v } : x)))} />
            <Text label="Accepted on" type="date" value={inv.accepted_on} onChange={(v) => setInvoices(invoices.map((x, j) => (j === i ? { ...x, accepted_on: v } : x)))} />
            <Num label="Agreed days" value={inv.agreed_days} min={0} max={45} onChange={(v) => setInvoices(invoices.map((x, j) => (j === i ? { ...x, agreed_days: Math.min(45, v ?? 0) } : x)))} />
            <button className="btn small quiet" disabled={invoices.length === 1} onClick={() => setInvoices(invoices.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <div className="row" style={{ margin: "0.5rem 0 1rem" }}>
          <button className="btn small quiet" onClick={() => setInvoices([...invoices, { number: "", amount_paise: 100_000_00, accepted_on: isoToday(-60), agreed_days: 30 }])}>Add invoice</button>
        </div>
        <div className="grid2" style={{ marginBottom: "1rem" }}>
          <Text label="Compute interest up to" type="date" value={paidOn} onChange={setPaidOn} />
          <Text label="Bank Rate before 7 Oct 2026 (%)" value={earlierRate} onChange={setEarlierRate}
            hint="Used only for days before our sourced rate history. Secondary sources give 5.50%; confirm for older periods." />
        </div>
        {err && <p className="notice err" role="alert">{err}</p>}
        <div className="row">
          <button className="btn" onClick={compute}>Calculate interest</button>
          <button className="btn quiet" onClick={makeNotice}>Draft demand notice</button>
        </div>
      </div>

      <div className="panel" aria-live="polite">
        {calc ? (
          <>
            <div className="figures">
              <div><div className="figure-label">Principal</div><div className="figure">{inr(principal)}</div></div>
              <div><div className="figure-label">Interest under section 16</div><div className="figure">{inr(total)}</div></div>
              <div><div className="figure-label">You can claim</div><div className="figure">{inr(principal + total)}</div></div>
            </div>
            <table className="map">
              <thead><tr><th>Invoice</th><th>Due</th><th>Days late</th><th>Interest</th></tr></thead>
              <tbody>{calc.map((c, i) => (
                <tr key={i}><td>{invoices[i].number}</td><td>{new Date(dueOf(invoices[i])).toLocaleDateString("en-IN")}</td>
                  <td>{Math.max(0, c.days_late)}</td><td>{inr(c.interest_paise)}</td></tr>
              ))}</tbody>
            </table>
            <p className="hint" style={{ marginTop: "0.8rem" }}>{calc[0]?.convention}</p>
          </>
        ) : (
          <p className="lede">Your claim appears here.</p>
        )}
        {notice && (
          <>
            <h3>Demand notice</h3>
            <Markdown text={notice} />
            <div className="row">
              <button className="btn small quiet" onClick={() => navigator.clipboard.writeText(notice)}>Copy notice</button>
              <button className="btn small quiet" onClick={() => download(new Blob([notice], { type: "text/markdown" }), "msme-demand-notice.md")}>Download notice</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
