import type { DraftResult, Finding, KbEntry, Meta, TermSheet, Verification } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public findings: Finding[] = [],
    public fieldErrors: { loc: string[]; msg: string }[] = [],
  ) {
    super(message);
  }
}

async function call<T>(path: string, body?: unknown, raw = false): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      /* non-JSON error body */
    }
    const d = payload?.detail;
    if (res.status === 409 && d?.findings) throw new ApiError(409, "Fix the blocking issues first", d.findings);
    if (res.status === 422 && payload?.errors) {
      throw new ApiError(422, "Some fields need attention", [], payload.errors);
    }
    if (res.status === 429) throw new ApiError(429, "Too many requests. Wait a minute and try again.");
    throw new ApiError(res.status, typeof d === "string" ? d : `Request failed (${res.status})`);
  }
  return (raw ? res.blob() : res.json()) as Promise<T>;
}

export const api = {
  meta: () => call<Meta>("/api/meta"),
  kb: () => call<KbEntry[]>("/api/kb"),
  check: (term_sheet: TermSheet) => call<{ findings: Finding[] }>("/api/check", { term_sheet }),
  draft: (term_sheet: TermSheet) => call<DraftResult>("/api/draft", { term_sheet }),
  verify: (term_sheet: TermSheet, onchain: unknown) =>
    call<{ verification: Verification; document_hash: string }>("/api/verify", { term_sheet, onchain }),
  docx: (term_sheet: TermSheet) => call<Blob>("/api/export/docx", { term_sheet }, true),
  redline: (old: TermSheet, next: TermSheet) => call<RedlineOut>("/api/redline", { old, new: next }),
  intake: (messages: string[], prior: unknown) =>
    call<{ term_sheet: TermSheet | null; partial: Partial<TermSheet>; questions: { field: string; question: string }[]; rejected: string[] }>(
      "/api/intake",
      { messages, prior },
    ),
  review: (text: string, role: string, use_ai: boolean) => call<ReviewOut>("/api/review", { text, role, use_ai }),
  interest: (body: { principal_paise: number; due_date: string; paid_on?: string; bank_rate_override_pct?: string }) =>
    call<InterestOut>("/api/interest", body),
  demand: (body: unknown) => call<{ text: string; claim_paise: number; interest_paise: number; principal_paise: number }>("/api/notice/demand", body),
  certificate: (body: unknown) => call<{ text: string }>("/api/certificate", body),
  artifact: (name: "ClausewrightEscrow" | "DemoINR") =>
    call<{ abi: any[]; bytecode: `0x${string}` }>(`/api/escrow/artifact?name=${name}`),
};

export interface RedlineOut {
  changed: number;
  total: number;
  clauses: { heading: string; status: "added" | "removed" | "modified" | "unchanged"; ops: { op: "eq" | "ins" | "del"; text: string }[] }[];
}

export interface ReviewIssue {
  clause: number;
  risk: "high" | "medium" | "low";
  issue: string;
  suggested_change: string;
  source: "rule" | "ai";
  rule_id?: string;
  citations: { authority: string; provision: string; url?: string | null; note?: string | null }[];
}

export interface ReviewOut {
  clauses: string[];
  issues: ReviewIssue[];
  meta: { clauses: number; llm: boolean; citations_dropped: number; llm_error?: string };
}

export interface InterestOut {
  principal_paise: number;
  interest_paise: number;
  total_paise: number;
  interest_from: string;
  interest_to: string;
  days_late: number;
  rate_sources: string[];
  convention: string;
  periods: { start: string; end: string; annual_rate_pct: string; opening_paise: number; closing_paise: number }[];
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
