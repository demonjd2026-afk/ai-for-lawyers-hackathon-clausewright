import type { TermSheet } from "./types";
import { isoToday } from "./util";

// Worked examples drawn from common Indian small-business situations. Dates are relative
// to today so the escrow can always be deployed.
export function examples(): { id: string; label: string; summary: string; ts: TermSheet }[] {
  const start = isoToday(3);
  const kaveri = {
    name: "Kaveri Organics Private Limited",
    entity_type: "company" as const,
    address: "42, 2nd Cross, Indiranagar, Bengaluru 560038",
    state: "Karnataka",
    email: "legal@kaveri.example",
    signatory_name: "Anita Rao",
    signatory_designation: "Director",
    gstin: "29AABCK1234L1Z5",
  };
  const pixelnest = {
    name: "Pixelnest Studio",
    entity_type: "proprietorship" as const,
    address: "Door 7-12, Beach Road, Visakhapatnam 530017",
    state: "Andhra Pradesh",
    email: "hello@pixelnest.example",
    signatory_name: "Ravi Teja",
  };
  return [
    {
      id: "service",
      label: "Website build for a client",
      summary: "A micro-enterprise design studio paid in three milestones, with escrow.",
      ts: {
        agreement_type: "service",
        effective_date: start,
        client: kaveri,
        provider: { ...pixelnest, msme_category: "micro", udyam_number: "UDYAM-AP-08-0012345", gstin: "37ABCPT1234K1Z2" },
        governing_state: "Karnataka",
        jurisdiction_city: "Bengaluru",
        scope:
          "Design and build a bilingual (English and Kannada) e-commerce website for organic produce, including product catalogue, checkout integration and order management for customer data.",
        milestones: [
          { title: "Design", deliverable: "Figma designs for 12 screens", amount_paise: 15_000_000, due_date: isoToday(33) },
          { title: "Build", deliverable: "Working website on staging", amount_paise: 35_000_000, due_date: isoToday(78) },
          { title: "Launch", deliverable: "Production launch and 30-day support", amount_paise: 10_000_000, due_date: isoToday(108) },
        ],
        acceptance_days: 10,
        payment_days: 60,
        processes_personal_data: false,
        non_compete_months_after_term: 12,
        arbitration: { enabled: true, seat_city: "Bengaluru", appointment: "unilateral" },
        escrow: { enabled: true, funding_days: 7, chain: "local" },
      },
    },
    {
      id: "nda",
      label: "Mutual NDA before a partnership",
      summary: "Two parties in different states explore supplying cold-pressed oils.",
      ts: {
        agreement_type: "nda",
        effective_date: start,
        client: kaveri,
        provider: {
          name: "Meera Iyer",
          entity_type: "individual",
          is_adult_confirmed: true,
          address: "Flat 3B, Adyar, Chennai 600020",
          state: "Tamil Nadu",
          email: "meera@example.com",
        },
        governing_state: "Tamil Nadu",
        jurisdiction_city: "Chennai",
        nda_purpose: "Evaluating a possible partnership to supply cold-pressed oils to Kaveri's retail stores.",
        confidentiality_years: 3,
        non_solicit_months_after_term: 0,
        arbitration: { enabled: true, seat_city: "Chennai", appointment: "mutual" },
      },
    },
    {
      id: "employment",
      label: "Appointment letter for a designer",
      summary: "A fixed-term hire under the Labour Codes, with pay that trips the 50% wage rule.",
      ts: {
        agreement_type: "employment",
        effective_date: start,
        client: pixelnest,
        provider: {
          name: "Sravani Kota",
          entity_type: "individual",
          address: "12-4-56, MVP Colony, Visakhapatnam 530017",
          state: "Andhra Pradesh",
          email: "sravani@example.com",
        },
        governing_state: "Andhra Pradesh",
        jurisdiction_city: "Visakhapatnam",
        non_solicit_months_after_term: 6,
        arbitration: { enabled: false },
        employment: {
          employee_date_of_birth: "2001-03-14",
          employee_parent_name: "K. Ramana",
          designation: "UI Designer",
          employment_type: "fixed_term",
          fixed_term_end: isoToday(390),
          skill_category: "skilled",
          date_of_joining: isoToday(28),
          place_of_work: "Visakhapatnam studio",
          duties: "Design web and mobile interfaces for client projects and maintain the design system.",
          weekly_hours: 48,
          basic: 1_800_000,
          hra: 900_000,
          conveyance: 200_000,
          other_allowances: 1_100_000,
          epf_applicable: true,
          esic_applicable: false,
        },
      },
    },
  ];
}
