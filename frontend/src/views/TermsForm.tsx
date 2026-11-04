import { useState } from "react";
import { Area, Check, Money, Num, Select, Text } from "../components/Fields";
import type { Finding, Milestone, Party, TermSheet } from "../types";
import { inr, isoToday, setPath } from "../util";

const ENTITY = [["individual", "Individual"], ["proprietorship", "Sole proprietorship"], ["partnership", "Partnership firm"],
  ["llp", "LLP"], ["company", "Company"]] as const;
const MSME = [["none", "Not an MSME"], ["micro", "Micro"], ["small", "Small"], ["medium", "Medium"]] as const;

interface Props {
  ts: TermSheet;
  states: string[];
  findings: Finding[];
  onChange: (ts: TermSheet) => void;
}

export function TermsForm({ ts, states, findings, onChange }: Props) {
  const [partyTab, setPartyTab] = useState<"client" | "provider">("client");
  const flags = new Map<string, "blocker" | "warning">();
  for (const f of findings) {
    if (f.field && f.severity !== "info" && flags.get(f.field) !== "blocker") flags.set(f.field, f.severity as "blocker" | "warning");
  }
  const flag = (p: string) => flags.get(p);
  const set = (path: string) => (v: unknown) => onChange(setPath(ts, path, v));
  const stateOpts = states.map((s) => [s, s] as const);
  const isService = ts.agreement_type === "service";
  const isNda = ts.agreement_type === "nda";
  const isEmp = ts.agreement_type === "employment";
  const roles = isEmp ? { client: "Employer", provider: "Employee" }
    : isNda ? { client: "First party", provider: "Second party" } : { client: "Client", provider: "Service provider" };

  const party = (role: "client" | "provider") => {
    const p = ts[role] as Party;
    const at = (k: string) => `${role}.${k}`;
    return (
      <div className="grid2">
        <Text label="Legal name" value={p.name} onChange={set(at("name"))} required />
        <Select label="Type" value={p.entity_type} options={ENTITY} onChange={set(at("entity_type"))} />
        <div style={{ gridColumn: "1 / -1" }}><Text label="Address" value={p.address} onChange={set(at("address"))} /></div>
        <Select label="State" value={p.state} options={stateOpts} onChange={set(at("state"))} />
        <Text label="Email for notices" type="email" value={p.email} onChange={set(at("email"))} />
        <Text label="Signatory" value={p.signatory_name} onChange={(v) => set(at("signatory_name"))(v || null)} />
        <Text label="Signatory's designation" value={p.signatory_designation} onChange={(v) => set(at("signatory_designation"))(v || null)} />
        {p.entity_type === "individual" && !(isEmp && role === "provider") && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Check label="This person is 18 or older" checked={p.is_adult_confirmed} onChange={set(at("is_adult_confirmed"))} />
          </div>
        )}
        {!isEmp && (
          <>
            <Select label="MSME category" value={p.msme_category ?? "none"} options={MSME} onChange={set(at("msme_category"))}
              hint={role === "provider" && isService ? "Micro and small suppliers get the 45-day payment rule." : undefined} />
            <Text label="Udyam number" value={p.udyam_number} flag={flag(at("udyam_number"))} placeholder="UDYAM-AP-08-0012345"
              onChange={(v) => set(at("udyam_number"))(v ? v.toUpperCase() : null)} />
            <Text label="Udyam registered on" type="date" value={p.udyam_registration_date} flag={flag(at("udyam_registration_date"))}
              onChange={(v) => set(at("udyam_registration_date"))(v || null)} />
            <Text label="GSTIN" value={p.gstin} flag={flag(at("gstin"))} onChange={(v) => set(at("gstin"))(v ? v.toUpperCase() : null)} />
          </>
        )}
      </div>
    );
  };

  const ms = ts.milestones ?? [];
  const setMs = (next: Milestone[]) => onChange({ ...ts, milestones: next });

  return (
    <form onSubmit={(e) => e.preventDefault()} aria-label="Term sheet">
      <div className="grid3">
        <Select label="Document" value={ts.agreement_type} onChange={set("agreement_type")}
          options={[["service", "Service agreement"], ["nda", "Non-disclosure agreement"], ["employment", "Appointment letter"]]} />
        <Text label={isEmp ? "Letter date" : "Effective date"} type="date" value={ts.effective_date} onChange={set("effective_date")} />
        <Select label="State of signing" value={ts.governing_state} options={stateOpts} onChange={set("governing_state")}
          hint="Decides the stamp duty." />
      </div>

      <fieldset>
        <legend>Parties</legend>
        <div className="party-tabs" role="tablist">
          {(["client", "provider"] as const).map((r) => (
            <button key={r} type="button" role="tab" aria-selected={partyTab === r} className={`btn small ${partyTab === r ? "" : "quiet"}`}
              onClick={() => setPartyTab(r)}>{roles[r]}: {(ts[r] as Party).name || "unnamed"}</button>
          ))}
        </div>
        {party(partyTab)}
      </fieldset>

      {isService && (
        <fieldset>
          <legend>Work and payment</legend>
          <Area label="Services" rows={3} value={ts.scope} onChange={set("scope")} />
          <div style={{ marginTop: "0.6rem" }}>
            {ms.map((m, i) => (
              <div className="ms" key={i}>
                <Text label={`Milestone ${i + 1}`} value={m.title} onChange={(v) => setMs(ms.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
                <Text label="Deliverable" value={m.deliverable} onChange={(v) => setMs(ms.map((x, j) => (j === i ? { ...x, deliverable: v } : x)))} />
                <Money label="Fee (₹)" paise={m.amount_paise} onChange={(v) => setMs(ms.map((x, j) => (j === i ? { ...x, amount_paise: v } : x)))} />
                <Text label="Due" type="date" value={m.due_date} flag={flag(`milestones.${i}.due_date`)}
                  onChange={(v) => setMs(ms.map((x, j) => (j === i ? { ...x, due_date: v } : x)))} />
                <button type="button" className="btn small quiet" disabled={ms.length === 1} aria-label={`Remove milestone ${i + 1}`}
                  onClick={() => setMs(ms.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
            <div className="row" style={{ marginTop: "0.4rem" }}>
              <button type="button" className="btn small quiet" disabled={ms.length >= 20}
                onClick={() => setMs([...ms, { title: "", deliverable: "", amount_paise: 100_00, due_date: isoToday(60) }])}>
                Add milestone
              </button>
              <span className="spacer" />
              <span className="hint">Total {inr(ms.reduce((a, m) => a + (m.amount_paise || 0), 0))}</span>
            </div>
          </div>
          <div className="grid3" style={{ marginTop: "0.8rem" }}>
            <Num label="Days to accept or object" value={ts.acceptance_days} min={1} max={90} flag={flag("acceptance_days")} onChange={set("acceptance_days")} />
            <Num label="Days to pay after acceptance" value={ts.payment_days} min={0} max={180} flag={flag("payment_days")} onChange={set("payment_days")} />
            <Select label="Tax treatment of fees" value={ts.fee_nature ?? "professional"} onChange={set("fee_nature")}
              options={[["professional", "Professional (TDS 10%)"], ["technical", "Technical (TDS 2%)"]]} />
          </div>
          <div className="grid2" style={{ marginTop: "0.5rem" }}>
            <Check label="Fees are plus GST" checked={ts.prices_exclusive_of_gst ?? true} onChange={set("prices_exclusive_of_gst")} />
            <Check label="Provider handles personal data for the client" checked={ts.processes_personal_data} onChange={set("processes_personal_data")} />
          </div>
        </fieldset>
      )}

      {isService && (
        <fieldset>
          <legend>Ownership and risk</legend>
          <div className="grid3">
            <Select label="Who owns the work" value={ts.ip_model ?? "assignment"} onChange={set("ip_model")}
              options={[["assignment", "Client, on payment"], ["licence", "Provider; client gets a licence"]]} />
            <Num label="Liability cap (× fee)" value={ts.liability_cap_multiple === undefined ? 1 : ts.liability_cap_multiple} nullable step={0.5} min={0} max={10}
              flag={flag("liability_cap_multiple")} onChange={set("liability_cap_multiple")} hint="Leave blank for no cap." />
            <Num label="Late delivery damages (% per week)" value={ts.liquidated_damages_pct_per_week} nullable step={0.5} min={0} max={10}
              flag={flag("liquidated_damages_pct_per_week")} onChange={set("liquidated_damages_pct_per_week")} />
          </div>
          {ts.ip_model !== "licence" && (
            <div className="grid2" style={{ marginTop: "0.5rem" }}>
              <Check label="Assignment is worldwide" checked={ts.ip_assignment_worldwide ?? true} onChange={set("ip_assignment_worldwide")} />
              <Check label="Assignment lasts the full copyright term" checked={ts.ip_assignment_full_term ?? true} onChange={set("ip_assignment_full_term")} />
            </div>
          )}
        </fieldset>
      )}

      {isNda && (
        <fieldset>
          <legend>Confidentiality</legend>
          <Area label="Purpose of sharing information" rows={3} value={ts.nda_purpose} onChange={set("nda_purpose")} />
          <div className="grid2" style={{ marginTop: "0.6rem" }}>
            <Num label="Years confidentiality lasts" value={ts.confidentiality_years ?? 3} min={1} max={10} onChange={set("confidentiality_years")} />
            <Check label="Both parties share information (mutual)" checked={ts.nda_mutual ?? true} onChange={set("nda_mutual")} />
          </div>
        </fieldset>
      )}

      {isEmp && ts.employment && <EmploymentFields ts={ts} set={set} flag={flag} />}

      <fieldset>
        <legend>Restrictions</legend>
        <div className="grid3">
          <Num label="Non-compete after it ends (months)" value={ts.non_compete_months_after_term ?? 0} min={0} max={60}
            flag={flag("non_compete_months_after_term")} onChange={set("non_compete_months_after_term")} />
          <Num label="No poaching staff after it ends (months)" value={ts.non_solicit_months_after_term ?? 12} min={0} max={24}
            flag={flag("non_solicit_months_after_term")} onChange={set("non_solicit_months_after_term")} />
          {!isEmp && <Num label="Notice period (days)" value={ts.termination_notice_days ?? 30} min={0} max={365}
            flag={flag("termination_notice_days")} onChange={set("termination_notice_days")} />}
        </div>
      </fieldset>

      {!isEmp && (
        <fieldset>
          <legend>Disputes</legend>
          <div className="grid3">
            <Select label="Resolve disputes by" value={ts.arbitration?.enabled === false ? "courts" : "arbitration"}
              onChange={(v) => set("arbitration.enabled")(v === "arbitration")} flag={flag("arbitration.enabled")}
              options={[["arbitration", "Arbitration"], ["courts", "Courts"]]} />
            {ts.arbitration?.enabled !== false && (
              <>
                <Select label="Arbitrator chosen by" value={ts.arbitration?.appointment ?? "mutual"} flag={flag("arbitration.appointment")}
                  onChange={set("arbitration.appointment")}
                  options={[["mutual", "Both parties together"], ["institution", "An arbitration centre"], ["unilateral", "One party alone"]]} />
                <Text label="Seat of arbitration" value={ts.arbitration?.seat_city} flag={flag("arbitration.seat_city")}
                  onChange={(v) => set("arbitration.seat_city")(v || null)} />
                {ts.arbitration?.appointment === "institution" && (
                  <Text label="Arbitration centre" value={ts.arbitration?.institution} flag={flag("arbitration.institution")}
                    placeholder="e.g. Mumbai Centre for International Arbitration" onChange={(v) => set("arbitration.institution")(v || null)} />
                )}
              </>
            )}
            <Text label="Courts at" value={ts.jurisdiction_city} onChange={set("jurisdiction_city")} />
          </div>
        </fieldset>
      )}

      {isService && (
        <fieldset>
          <legend>Escrow</legend>
          <Check label="Hold the fee in an escrow that pays each milestone on acceptance" checked={ts.escrow?.enabled}
            onChange={(v) => set("escrow")({ funding_days: 7, chain: "local", ...ts.escrow, enabled: v })} />
          {ts.escrow?.enabled && (
            <div className="grid2" style={{ marginTop: "0.6rem" }}>
              <Select label="Network" value={ts.escrow.chain ?? "local"} onChange={set("escrow.chain")}
                options={[["local", "Local test chain"], ["sepolia", "Sepolia test network"]]} />
              <Num label="Days for client to fund" value={ts.escrow.funding_days ?? 7} min={1} max={60} onChange={set("escrow.funding_days")} />
              <Text mono label="Client wallet" value={ts.client.wallet} flag={flag("client.wallet")} placeholder="0x…" onChange={(v) => set("client.wallet")(v || null)} />
              <Text mono label="Service provider wallet" value={ts.provider.wallet} flag={flag("provider.wallet")} placeholder="0x…" onChange={(v) => set("provider.wallet")(v || null)} />
              <Text mono label="Escrow arbiter wallet" value={ts.escrow.arbiter_wallet} flag={flag("escrow.arbiter_wallet")} placeholder="0x…"
                onChange={(v) => set("escrow.arbiter_wallet")(v || null)} hint="Held by the arbitrator; cannot be either party." />
            </div>
          )}
        </fieldset>
      )}
    </form>
  );
}

function EmploymentFields({ ts, set, flag }: { ts: TermSheet; set: (p: string) => (v: unknown) => void; flag: (p: string) => "blocker" | "warning" | undefined }) {
  const e = ts.employment!;
  const at = (k: string) => `employment.${k}`;
  const gross = (e.basic || 0) + (e.dearness_allowance || 0) + (e.retaining_allowance || 0) + (e.hra || 0) + (e.conveyance || 0) + (e.other_allowances || 0);
  return (
    <>
      <fieldset>
        <legend>The role</legend>
        <div className="grid3">
          <Text label="Designation" value={e.designation} onChange={set(at("designation"))} />
          <Select label="Type" value={e.employment_type} onChange={(v) => {
            set("employment")({ ...e, employment_type: v, fixed_term_end: v === "fixed_term" ? (e.fixed_term_end ?? isoToday(390)) : null });
          }} options={[["permanent", "Permanent"], ["fixed_term", "Fixed term"]]} />
          {e.employment_type === "fixed_term" && <Text label="Ends on" type="date" value={e.fixed_term_end} onChange={set(at("fixed_term_end"))} />}
          <Text label="Joins on" type="date" value={e.date_of_joining} flag={flag(at("date_of_joining"))} onChange={set(at("date_of_joining"))} />
          <Text label="Date of birth" type="date" value={e.employee_date_of_birth} flag={flag(at("employee_date_of_birth"))} onChange={set(at("employee_date_of_birth"))} />
          <Text label="Father's or mother's name" value={e.employee_parent_name} onChange={set(at("employee_parent_name"))} />
          <Select label="Skill category" value={e.skill_category} onChange={set(at("skill_category"))}
            options={[["unskilled", "Unskilled"], ["semi_skilled", "Semi-skilled"], ["skilled", "Skilled"], ["highly_skilled", "Highly skilled"]]} />
          <Text label="Place of work" value={e.place_of_work} onChange={set(at("place_of_work"))} />
          <Num label="Hours a week" value={e.weekly_hours ?? 48} min={1} max={80} flag={flag(at("weekly_hours"))} onChange={set(at("weekly_hours"))} />
        </div>
        <div style={{ marginTop: "0.6rem" }}><Area label="Duties" rows={2} value={e.duties} onChange={set(at("duties"))} /></div>
      </fieldset>
      <fieldset>
        <legend>Monthly pay</legend>
        <div className="grid3">
          <Money label="Basic" paise={e.basic} flag={flag(at("basic"))} onChange={set(at("basic"))} />
          <Money label="Dearness allowance" paise={e.dearness_allowance} onChange={set(at("dearness_allowance"))} />
          <Money label="House rent allowance" paise={e.hra} onChange={set(at("hra"))} />
          <Money label="Conveyance" paise={e.conveyance} onChange={set(at("conveyance"))} />
          <Money label="Other allowances" paise={e.other_allowances} onChange={set(at("other_allowances"))} />
          <div className="field"><span>Gross a month</span><strong style={{ paddingTop: "0.45rem" }}>{inr(gross)}</strong></div>
        </div>
        <div className="grid3" style={{ marginTop: "0.5rem" }}>
          <Check label="Provident fund applies" checked={e.epf_applicable ?? true} onChange={set(at("epf_applicable"))} />
          <Check label="ESI applies" checked={e.esic_applicable} onChange={set(at("esic_applicable"))} />
          <Num label="Resignation notice (days)" value={e.resignation_notice_days ?? 30} min={0} max={90} onChange={set(at("resignation_notice_days"))} />
        </div>
      </fieldset>
    </>
  );
}

