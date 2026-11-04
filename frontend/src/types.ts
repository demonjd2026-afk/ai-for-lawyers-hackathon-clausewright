export type AgreementType = "service" | "nda" | "employment";
export type EntityType = "individual" | "proprietorship" | "partnership" | "llp" | "company";
export type MsmeCategory = "micro" | "small" | "medium" | "none";
export type Severity = "blocker" | "warning" | "info";

export interface Party {
  name: string;
  entity_type: EntityType;
  address: string;
  state: string;
  email: string;
  signatory_name?: string | null;
  signatory_designation?: string | null;
  is_adult_confirmed?: boolean;
  msme_category?: MsmeCategory;
  udyam_number?: string | null;
  udyam_registration_date?: string | null;
  gstin?: string | null;
  wallet?: string | null;
}

export interface Milestone {
  title: string;
  deliverable: string;
  amount_paise: number;
  due_date: string;
}

export interface Employment {
  employee_date_of_birth: string;
  employee_parent_name: string;
  designation: string;
  employment_type: "permanent" | "fixed_term";
  fixed_term_end?: string | null;
  skill_category: "unskilled" | "semi_skilled" | "skilled" | "highly_skilled";
  date_of_joining: string;
  place_of_work: string;
  duties: string;
  probation_months?: number;
  weekly_hours?: number;
  basic: number;
  dearness_allowance?: number;
  retaining_allowance?: number;
  hra?: number;
  conveyance?: number;
  other_allowances?: number;
  epf_applicable?: boolean;
  esic_applicable?: boolean;
  uan?: string | null;
  resignation_notice_days?: number;
}

export interface TermSheet {
  agreement_type: AgreementType;
  effective_date: string;
  client: Party;
  provider: Party;
  governing_state: string;
  jurisdiction_city?: string;
  scope?: string | null;
  milestones?: Milestone[];
  acceptance_days?: number;
  payment_days?: number;
  prices_exclusive_of_gst?: boolean;
  fee_nature?: "professional" | "technical";
  ip_model?: "assignment" | "licence";
  ip_assignment_worldwide?: boolean;
  ip_assignment_full_term?: boolean;
  liability_cap_multiple?: number | null;
  liquidated_damages_pct_per_week?: number | null;
  termination_notice_days?: number;
  processes_personal_data?: boolean;
  confidentiality_years?: number;
  non_compete_months_after_term?: number;
  non_solicit_months_after_term?: number;
  claims_window_days?: number | null;
  nda_purpose?: string | null;
  nda_mutual?: boolean;
  employment?: Employment | null;
  arbitration?: {
    enabled: boolean;
    seat_city?: string | null;
    appointment?: "mutual" | "institution" | "unilateral";
    institution?: string | null;
    language?: string;
  };
  escrow?: {
    enabled: boolean;
    arbiter_wallet?: string | null;
    funding_days?: number;
    chain?: "sepolia" | "local";
  };
  e_sign?: boolean;
}

export interface Citation {
  authority: string;
  provision: string;
  url?: string | null;
  note?: string | null;
}

export interface Finding {
  rule_id: string;
  severity: Severity;
  title: string;
  detail: string;
  citations: Citation[];
  fix?: string | null;
  field?: string | null;
  autofix?: { path: string; value: unknown } | null;
}

export interface CheckRow {
  id: string;
  ok: boolean;
  expected: string;
  actual: string;
  where: string;
}

export interface Verification {
  ok: boolean;
  passed: number;
  total: number;
  failed: CheckRow[];
}

export interface ClauseOut {
  number: string | null;
  id: string;
  heading: string;
  body: string;
  cites: string[];
  binds: string[];
}

export interface EscrowParams {
  chain: string;
  token: `0x${string}`;
  payer: `0x${string}`;
  payee: `0x${string}`;
  arbiter: `0x${string}`;
  terms_hash: `0x${string}`;
  acceptance_window_s: number;
  funding_deadline: number;
  msme_mode: boolean;
  milestones: { amount: number; due_date: number }[];
  total: number;
  document_hash: `0x${string}`;
}

export interface DraftResult {
  title: string;
  findings: Finding[];
  clauses: ClauseOut[];
  text: string;
  document_hash: `0x${string}`;
  terms_hash: string;
  escrow: null | {
    params: EscrowParams;
    constructor_args: unknown[];
    clause_map: Record<string, string[]>;
  };
  verification: Verification;
}

export interface Meta {
  llm_enabled: boolean;
  states: string[];
  kb_as_of: string;
  bank_rate: { from: string; pct: number; status: string; source: string }[];
  chains: Record<string, { token: `0x${string}` }>;
  default_chain: "sepolia" | "local";
  /** Where the browser reaches the local/demo chain: the server's own proxy when it hosts one. */
  demo_chain: { rpc: string; hosted: boolean };
}

export interface KbEntry {
  id: string;
  authority: string;
  provision: string;
  summary: string;
  url: string | null;
  status: "verified" | "secondary";
}
