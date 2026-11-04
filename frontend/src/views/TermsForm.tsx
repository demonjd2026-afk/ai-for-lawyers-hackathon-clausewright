import { clsx } from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "../components/ui/Button";
import { Area, Check, Money, Num, Select, Text } from "../components/ui/Field";
import { PanelHeading } from "../components/ui/Primitives";
import type { Finding, Milestone, Party, TermSheet } from "../types";
import { inr, isoToday, setPath } from "../util";

const ENTITY = [["individual", "Individual"], ["proprietorship", "Sole proprietorship"], ["partnership", "Partnership firm"],
  ["llp", "LLP"], ["company", "Company"]] as const;
const MSME = [["none", "Not an MSME"], ["micro", "Micro"], ["small", "Small"], ["medium", "Medium"]] as const;

type Flag = "blocker" | "warning" | undefined;

/** A titled group of fields. The count of open findings in the group shows in the heading. */
function Group({ title, flags, children, hint }: { title: string; flags?: number; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-lg border border-mist-200 bg-mist-50/60 p-4 sm:p-5">
      <legend className="flex items-center gap-2 px-1.5 text-[0.95rem] font-bold text-ink-900">
        {title}
        {!!flags && <span className="rounded-full bg-saffron-500 px-1.5 text-[0.68rem] font-bold leading-4 text-ink-950" aria-label={`${flags} open checks`}>{flags}</span>}
      </legend>
      {hint && <p className="mb-3 text-[0.8rem] leading-snug text-mist-700">{hint}</p>}
      {children}
    </fieldset>
  );
}

const grid2 = "grid gap-3 sm:grid-cols-2";
const grid3 = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

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
  const flag = (p: string): Flag => flags.get(p);
  const flagsIn = (prefix: string) => [...flags.keys()].filter((k) => k.startsWith(prefix)).length;
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
      <div className={grid2}>
        <Text label="Legal name" value={p.name} onChange={set(at("name"))} required />
        <Select label="Type" value={p.entity_type} options={ENTITY} onChange={set(at("entity_type"))} />
        <Text label="Address" value={p.address} onChange={set(at("address"))} className="sm:col-span-2" />
        <Select label="State" value={p.state} options={stateOpts} onChange={set(at("state"))} />
        <Text label="Email for notices" type="email" value={p.email} onChange={set(at("email"))} />
        <Text label="Signatory" value={p.signatory_name} onChange={(v) => set(at("signatory_name"))(v || null)} />
        <Text label="Signatory's designation" value={p.signatory_designation} onChange={(v) => set(at("signatory_designation"))(v || null)} />
        {p.entity_type === "individual" && !(isEmp && role === "provider") && (
          <Check className="sm:col-span-2" label="This person is 18 or older" checked={p.is_adult_confirmed} onChange={set(at("is_adult_confirmed"))} />
        )}
        {!isEmp && (
          <>
            <Select label="MSME category" value={p.msme_category ?? "none"} options={MSME} onChange={set(at("msme_category"))}
              hint={role === "provider" && isService ? "Micro and small suppliers get the 45-day payment rule." : undefined} />
            <Text label="Udyam number" value={p.udyam_number} flag={flag(at("udyam_number"))} placeholder="UDYAM-AP-08-0012345" mono
              onChange={(v) => set(at("udyam_number"))(v ? v.toUpperCase() : null)} />
            <Text label="Udyam registered on" type="date" value={p.udyam_registration_date} flag={flag(at("udyam_registration_date"))}
              onChange={(v) => set(at("udyam_registration_date"))(v || null)} />
            <Text label="GSTIN" value={p.gstin} flag={flag(at("gstin"))} mono onChange={(v) => set(at("gstin"))(v ? v.toUpperCase() : null)} />
          </>
        )}
      </div>
    );
  };

  const ms = ts.milestones ?? [];
  const setMs = (next: Milestone[]) => onChange({ ...ts, milestones: next });
  const patchMs = (i: number, patch: Partial<Milestone>) => setMs(ms.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <form onSubmit={(e) => e.preventDefault()} aria-label="Term sheet" className="space-y-5">
      <PanelHeading title="The terms" lede="Change anything; the checks and the contract update as you type. A dot beside a label means a legal check is open on that field." />

      <div className={grid3}>
        <Select label="Document" value={ts.agreement_type} onChange={set("agreement_type")}
          options={[["service", "Service agreement"], ["nda", "Non-disclosure agreement"], ["employment", "Appointment letter"]]} />
        <Text label={isEmp ? "Letter date" : "Effective date"} type="date" value={ts.effective_date} onChange={set("effective_date")} />
        <Select label="State of signing" value={ts.governing_state} options={stateOpts} onChange={set("governing_state")} hint="Decides the stamp duty." />
      </div>

      <Group title="Parties" flags={flagsIn("client.") + flagsIn("provider.")}>
        <div className="mb-4 flex gap-1 rounded-lg bg-mist-200/70 p-1" role="tablist" aria-label="Party">
          {(["client", "provider"] as const).map((r) => {
            const n = flagsIn(`${r}.`);
            return (
              <button key={r} type="button" role="tab" aria-selected={partyTab === r} onClick={() => setPartyTab(r)}
                className={clsx("flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[0.84rem] font-semibold transition-colors",
                  partyTab === r ? "bg-white text-ink-900 shadow-sm" : "text-mist-700 hover:text-ink-900")}>
                <span className="truncate">{roles[r]}: {(ts[r] as Party).name || "unnamed"}</span>
                {!!n && <span className="size-1.5 shrink-0 rounded-full bg-saffron-500" aria-label={`${n} open checks`} />}
              </button>
            );
          })}
        </div>
        {party(partyTab)}
      </Group>

      {isService && (
        <Group title="Work and payment" flags={flagsIn("milestones") + flagsIn("acceptance_days") + flagsIn("payment_days")}>
          <Area label="Services" rows={3} value={ts.scope} onChange={set("scope")} />
          <ol className="mt-4 space-y-3" aria-label="Milestones">
            {ms.map((m, i) => (
              <li key={i} className="rounded-lg border border-mist-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[0.8rem] font-bold text-ink-900">Milestone {i + 1}</span>
                  <Button variant="ghost" size="sm" disabled={ms.length === 1} aria-label={`Remove milestone ${i + 1}`}
                    icon={<Trash2 className="size-4" />} onClick={() => setMs(ms.filter((_, j) => j !== i))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Text label="Title" value={m.title} onChange={(v) => patchMs(i, { title: v })} />
                  <Text label="Deliverable" value={m.deliverable} onChange={(v) => patchMs(i, { deliverable: v })} />
                  <Money label="Fee" paise={m.amount_paise} onChange={(v) => patchMs(i, { amount_paise: v })} />
                  <Text label="Due" type="date" value={m.due_date} flag={flag(`milestones.${i}.due_date`)} onChange={(v) => patchMs(i, { due_date: v })} />
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" disabled={ms.length >= 20} icon={<Plus className="size-4" />}
              onClick={() => setMs([...ms, { title: "", deliverable: "", amount_paise: 100_00, due_date: isoToday(60) }])}>
              Add milestone
            </Button>
            <span className="ml-auto text-[0.84rem] text-mist-700">Total <strong className="font-semibold text-ink-900 tabular-nums">{inr(ms.reduce((a, m) => a + (m.amount_paise || 0), 0))}</strong></span>
          </div>
          <div className={clsx(grid3, "mt-4")}>
            <Num label="Days to accept or object" value={ts.acceptance_days} min={1} max={90} flag={flag("acceptance_days")} onChange={set("acceptance_days")} suffix="days" />
            <Num label="Days to pay after acceptance" value={ts.payment_days} min={0} max={180} flag={flag("payment_days")} onChange={set("payment_days")} suffix="days" />
            <Select label="Tax treatment of fees" value={ts.fee_nature ?? "professional"} onChange={set("fee_nature")}
              options={[["professional", "Professional (TDS 10%)"], ["technical", "Technical (TDS 2%)"]]} />
          </div>
          <div className={clsx(grid2, "mt-3")}>
            <Check label="Fees are plus GST" checked={ts.prices_exclusive_of_gst ?? true} onChange={set("prices_exclusive_of_gst")} />
            <Check label="Provider handles personal data for the client" checked={ts.processes_personal_data} onChange={set("processes_personal_data")}
              hint="Adds DPDP processor terms." />
          </div>
        </Group>
      )}

      {isService && (
        <Group title="Ownership and risk" flags={flagsIn("ip_") + flagsIn("liability") + flagsIn("liquidated")}>
          <div className={grid3}>
            <Select label="Who owns the work" value={ts.ip_model ?? "assignment"} onChange={set("ip_model")}
              options={[["assignment", "Client, on payment"], ["licence", "Provider; client gets a licence"]]} />
            <Num label="Liability cap" value={ts.liability_cap_multiple === undefined ? 1 : ts.liability_cap_multiple} nullable step={0.5} min={0} max={10}
              flag={flag("liability_cap_multiple")} onChange={set("liability_cap_multiple")} hint="Leave blank for no cap." suffix="× fee" />
            <Num label="Late delivery damages" value={ts.liquidated_damages_pct_per_week} nullable step={0.5} min={0} max={10}
              flag={flag("liquidated_damages_pct_per_week")} onChange={set("liquidated_damages_pct_per_week")} suffix="% / week" />
          </div>
          {ts.ip_model !== "licence" && (
            <div className={clsx(grid2, "mt-3")}>
              <Check label="Assignment is worldwide" checked={ts.ip_assignment_worldwide ?? true} onChange={set("ip_assignment_worldwide")} />
              <Check label="Assignment lasts the full copyright term" checked={ts.ip_assignment_full_term ?? true} onChange={set("ip_assignment_full_term")} />
            </div>
          )}
        </Group>
      )}

      {isNda && (
        <Group title="Confidentiality" flags={flagsIn("nda_") + flagsIn("confidentiality")}>
          <Area label="Purpose of sharing information" rows={3} value={ts.nda_purpose} onChange={set("nda_purpose")} />
          <div className={clsx(grid2, "mt-3")}>
            <Num label="Years confidentiality lasts" value={ts.confidentiality_years ?? 3} min={1} max={10} onChange={set("confidentiality_years")} suffix="years" />
            <Check label="Both parties share information (mutual)" checked={ts.nda_mutual ?? true} onChange={set("nda_mutual")} />
          </div>
        </Group>
      )}

      {isEmp && ts.employment && <EmploymentFields ts={ts} set={set} flag={flag} flagsIn={flagsIn} />}

      <Group title="Restrictions" flags={flagsIn("non_") + flagsIn("termination")}
        hint="Indian courts do not enforce restraints after a contract ends (Contract Act s.27). A short non-solicit of staff is the usual alternative.">
        <div className={grid3}>
          <Num label="Non-compete after it ends" value={ts.non_compete_months_after_term ?? 0} min={0} max={60}
            flag={flag("non_compete_months_after_term")} onChange={set("non_compete_months_after_term")} suffix="months" />
          <Num label="No poaching staff after it ends" value={ts.non_solicit_months_after_term ?? 12} min={0} max={24}
            flag={flag("non_solicit_months_after_term")} onChange={set("non_solicit_months_after_term")} suffix="months" />
          {!isEmp && <Num label="Notice period" value={ts.termination_notice_days ?? 30} min={0} max={365}
            flag={flag("termination_notice_days")} onChange={set("termination_notice_days")} suffix="days" />}
        </div>
      </Group>

      {!isEmp && (
        <Group title="Disputes" flags={flagsIn("arbitration") + flagsIn("jurisdiction")}>
          <div className={grid3}>
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
        </Group>
      )}

      {isService && (
        <Group title="Escrow" flags={flagsIn("escrow") + flagsIn("client.wallet") + flagsIn("provider.wallet")}>
          <Check label="Hold the fee in an escrow that pays each milestone on acceptance" checked={ts.escrow?.enabled}
            hint="The escrow's settings are derived from these terms and printed in the contract as Schedule B."
            onChange={(v) => set("escrow")({ funding_days: 7, chain: "local", ...ts.escrow, enabled: v })} />
          {ts.escrow?.enabled && (
            <div className={clsx(grid2, "mt-3")}>
              <Select label="Network" value={ts.escrow.chain ?? "local"} onChange={set("escrow.chain")}
                options={[["local", "Local test chain"], ["sepolia", "Sepolia test network"]]} />
              <Num label="Days for client to fund" value={ts.escrow.funding_days ?? 7} min={1} max={60} onChange={set("escrow.funding_days")} suffix="days" />
              <Text mono label="Client wallet" value={ts.client.wallet} flag={flag("client.wallet")} placeholder="0x…" onChange={(v) => set("client.wallet")(v || null)} />
              <Text mono label="Service provider wallet" value={ts.provider.wallet} flag={flag("provider.wallet")} placeholder="0x…" onChange={(v) => set("provider.wallet")(v || null)} />
              <Text mono label="Escrow arbiter wallet" value={ts.escrow.arbiter_wallet} flag={flag("escrow.arbiter_wallet")} placeholder="0x…" className="sm:col-span-2"
                onChange={(v) => set("escrow.arbiter_wallet")(v || null)} hint="Held by the arbitrator; cannot be either party." />
            </div>
          )}
        </Group>
      )}
    </form>
  );
}

function EmploymentFields({ ts, set, flag, flagsIn }: {
  ts: TermSheet; set: (p: string) => (v: unknown) => void; flag: (p: string) => Flag; flagsIn: (p: string) => number;
}) {
  const e = ts.employment!;
  const at = (k: string) => `employment.${k}`;
  const gross = (e.basic || 0) + (e.dearness_allowance || 0) + (e.retaining_allowance || 0) + (e.hra || 0) + (e.conveyance || 0) + (e.other_allowances || 0);
  const wagesCore = (e.basic || 0) + (e.dearness_allowance || 0) + (e.retaining_allowance || 0);
  const addBack = Math.max(0, gross - wagesCore - Math.floor(gross / 2));
  return (
    <>
      <Group title="The role" flags={flagsIn("employment.") - flagsIn("employment.basic") - flagsIn("employment.weekly")}>
        <div className={grid3}>
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
          <Num label="Hours a week" value={e.weekly_hours ?? 48} min={1} max={80} flag={flag(at("weekly_hours"))} onChange={set(at("weekly_hours"))} suffix="hours" />
        </div>
        <div className="mt-3"><Area label="Duties" rows={2} value={e.duties} onChange={set(at("duties"))} /></div>
      </Group>
      <Group title="Monthly pay" flags={flagsIn("employment.basic")}
        hint="Under the Code on Wages, allowances above half of gross pay count as wages for PF, gratuity and bonus. The add-back is computed for you.">
        <div className={grid3}>
          <Money label="Basic" paise={e.basic} flag={flag(at("basic"))} onChange={set(at("basic"))} />
          <Money label="Dearness allowance" paise={e.dearness_allowance} onChange={set(at("dearness_allowance"))} />
          <Money label="House rent allowance" paise={e.hra} onChange={set(at("hra"))} />
          <Money label="Conveyance" paise={e.conveyance} onChange={set(at("conveyance"))} />
          <Money label="Other allowances" paise={e.other_allowances} onChange={set(at("other_allowances"))} />
          <div className="rounded-md border border-mist-200 bg-white px-3 py-2">
            <div className="text-[0.74rem] font-semibold text-mist-500">Gross a month</div>
            <div className="font-serif text-[1.3rem] font-semibold tabular-nums text-ink-900">{inr(gross)}</div>
            <div className="text-[0.74rem] text-mist-700">Wages for the Codes: {inr(wagesCore + addBack)}{addBack ? ` (adds back ${inr(addBack)})` : ""}</div>
          </div>
        </div>
        <div className={clsx(grid3, "mt-3")}>
          <Check label="Provident fund applies" checked={e.epf_applicable ?? true} onChange={set(at("epf_applicable"))} />
          <Check label="ESI applies" checked={e.esic_applicable} onChange={set(at("esic_applicable"))} />
          <Num label="Resignation notice" value={e.resignation_notice_days ?? 30} min={0} max={90} onChange={set(at("resignation_notice_days"))} suffix="days" />
        </div>
      </Group>
    </>
  );
}
