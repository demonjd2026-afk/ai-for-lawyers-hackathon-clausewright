"""Domain model: the term sheet is the single source of truth.

Both the natural-language contract and the escrow parameters are pure functions of a
validated TermSheet. Money is always integer paise (no floats anywhere near money).
"""

from __future__ import annotations

import re
from datetime import date
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# Upper bound keeps rendering, word conversion and uint128 on-chain amounts safe.
MAX_PAISE = 10_000_000_000_000  # ₹1,000 crore
ETH_ADDRESS = re.compile(r"^0x[0-9a-fA-F]{40}$")
UDYAM = re.compile(r"^UDYAM-[A-Z]{2}-\d{2}-\d{7}$")
GSTIN = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")

ShortText = Annotated[str, Field(min_length=1, max_length=200)]
LongText = Annotated[str, Field(min_length=1, max_length=4000)]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, frozen=False)


class IndianState(StrEnum):
    ANDHRA_PRADESH = "Andhra Pradesh"
    ARUNACHAL_PRADESH = "Arunachal Pradesh"
    ASSAM = "Assam"
    BIHAR = "Bihar"
    CHHATTISGARH = "Chhattisgarh"
    GOA = "Goa"
    GUJARAT = "Gujarat"
    HARYANA = "Haryana"
    HIMACHAL_PRADESH = "Himachal Pradesh"
    JHARKHAND = "Jharkhand"
    KARNATAKA = "Karnataka"
    KERALA = "Kerala"
    MADHYA_PRADESH = "Madhya Pradesh"
    MAHARASHTRA = "Maharashtra"
    MANIPUR = "Manipur"
    MEGHALAYA = "Meghalaya"
    MIZORAM = "Mizoram"
    NAGALAND = "Nagaland"
    ODISHA = "Odisha"
    PUNJAB = "Punjab"
    RAJASTHAN = "Rajasthan"
    SIKKIM = "Sikkim"
    TAMIL_NADU = "Tamil Nadu"
    TELANGANA = "Telangana"
    TRIPURA = "Tripura"
    UTTAR_PRADESH = "Uttar Pradesh"
    UTTARAKHAND = "Uttarakhand"
    WEST_BENGAL = "West Bengal"
    DELHI = "Delhi"
    JAMMU_AND_KASHMIR = "Jammu and Kashmir"
    LADAKH = "Ladakh"
    PUDUCHERRY = "Puducherry"
    CHANDIGARH = "Chandigarh"
    ANDAMAN_AND_NICOBAR = "Andaman and Nicobar Islands"
    DADRA_NAGAR_HAVELI_DAMAN_DIU = "Dadra and Nagar Haveli and Daman and Diu"
    LAKSHADWEEP = "Lakshadweep"


class EntityType(StrEnum):
    INDIVIDUAL = "individual"
    PROPRIETORSHIP = "proprietorship"
    PARTNERSHIP = "partnership"
    LLP = "llp"
    COMPANY = "company"


class MsmeCategory(StrEnum):
    MICRO = "micro"
    SMALL = "small"
    MEDIUM = "medium"
    NONE = "none"


class AgreementType(StrEnum):
    SERVICE = "service"  # service / freelance agreement with milestones
    NDA = "nda"  # mutual non-disclosure agreement
    EMPLOYMENT = "employment"  # appointment letter under the Labour Codes (in force 21 Nov 2025)


class FeeNature(StrEnum):
    PROFESSIONAL = "professional"  # TDS 10%
    TECHNICAL = "technical"  # TDS 2%


class EmploymentType(StrEnum):
    PERMANENT = "permanent"
    FIXED_TERM = "fixed_term"


class SkillCategory(StrEnum):
    UNSKILLED = "unskilled"
    SEMI_SKILLED = "semi_skilled"
    SKILLED = "skilled"
    HIGHLY_SKILLED = "highly_skilled"


class ArbitratorAppointment(StrEnum):
    MUTUAL = "mutual"  # sole arbitrator appointed by mutual consent
    INSTITUTION = "institution"  # appointed by a named arbitral institution
    UNILATERAL = "unilateral"  # one party alone appoints (flagged)


class IpModel(StrEnum):
    ASSIGNMENT = "assignment"  # client owns deliverables
    LICENCE = "licence"  # provider keeps IP, client gets licence


class Party(Strict):
    name: ShortText
    entity_type: EntityType
    address: Annotated[str, Field(min_length=5, max_length=400)]
    state: IndianState
    email: Annotated[str, Field(min_length=3, max_length=254)]
    signatory_name: ShortText | None = None
    signatory_designation: ShortText | None = None
    is_adult_confirmed: bool = Field(
        default=False, description="For individuals: confirmed to have attained majority (18)."
    )
    msme_category: MsmeCategory = MsmeCategory.NONE
    udyam_number: str | None = None
    udyam_registration_date: date | None = None
    gstin: str | None = None
    pan_provided: bool = False
    wallet: str | None = Field(default=None, description="EVM address for the escrow (testnet).")

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v):
            raise ValueError("invalid email address")
        return v

    @field_validator("udyam_number")
    @classmethod
    def _udyam(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.upper()
            if not UDYAM.fullmatch(v):
                raise ValueError("Udyam number must look like UDYAM-XX-00-0000000")
        return v

    @field_validator("gstin")
    @classmethod
    def _gstin(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.upper()
            if not GSTIN.fullmatch(v):
                raise ValueError("invalid GSTIN format")
        return v

    @field_validator("wallet")
    @classmethod
    def _wallet(cls, v: str | None) -> str | None:
        if v is not None and not ETH_ADDRESS.fullmatch(v):
            raise ValueError("wallet must be a 0x-prefixed 20-byte hex address")
        return v

    @property
    def is_mse(self) -> bool:
        """Micro or small enterprise: the class protected by ss.15-16 MSMED Act."""
        return self.msme_category in (MsmeCategory.MICRO, MsmeCategory.SMALL)


class Milestone(Strict):
    title: ShortText
    deliverable: Annotated[str, Field(min_length=1, max_length=1000)]
    amount_paise: Annotated[int, Field(gt=0, le=MAX_PAISE)]
    due_date: date


class Arbitration(Strict):
    enabled: bool = True
    seat_city: ShortText | None = "Bengaluru"
    appointment: ArbitratorAppointment = ArbitratorAppointment.MUTUAL
    institution: ShortText | None = None
    language: ShortText = "English"


class Escrow(Strict):
    enabled: bool = False
    arbiter_wallet: str | None = None
    funding_days: Annotated[int, Field(ge=1, le=60)] = 7
    chain: Literal["sepolia", "local"] = "sepolia"

    @field_validator("arbiter_wallet")
    @classmethod
    def _wallet(cls, v: str | None) -> str | None:
        if v is not None and not ETH_ADDRESS.fullmatch(v):
            raise ValueError("arbiter_wallet must be a 0x-prefixed 20-byte hex address")
        return v


Paise = Annotated[int, Field(ge=0, le=MAX_PAISE)]


class Employment(Strict):
    """Particulars required in an appointment letter (OSH Code s.6(1)(f); OSH Central Rules 2026, r.6)."""

    employee_date_of_birth: date
    employee_parent_name: ShortText
    designation: ShortText
    employment_type: EmploymentType = EmploymentType.PERMANENT
    fixed_term_end: date | None = None
    skill_category: SkillCategory = SkillCategory.SKILLED
    date_of_joining: date
    place_of_work: ShortText
    duties: Annotated[str, Field(min_length=1, max_length=2000)]
    probation_months: Annotated[int, Field(ge=0, le=12)] = 3
    weekly_hours: Annotated[int, Field(ge=1, le=80)] = 48
    # monthly remuneration, paise
    basic: Annotated[int, Field(gt=0, le=MAX_PAISE)]
    dearness_allowance: Paise = 0
    retaining_allowance: Paise = 0
    hra: Paise = 0
    conveyance: Paise = 0
    other_allowances: Paise = 0
    epf_applicable: bool = True
    esic_applicable: bool = False
    uan: Annotated[str, Field(pattern=r"^\d{12}$")] | None = None
    esic_number: Annotated[str, Field(pattern=r"^\d{10,17}$")] | None = None
    employer_lin: ShortText | None = None
    resignation_notice_days: Annotated[int, Field(ge=0, le=90)] = 30

    @property
    def wages(self) -> int:
        """'Wages' under s.2(y) Code on Wages before the 50% add-back."""
        return self.basic + self.dearness_allowance + self.retaining_allowance

    @property
    def excluded(self) -> int:
        return self.hra + self.conveyance + self.other_allowances

    @property
    def gross(self) -> int:
        return self.wages + self.excluded

    @property
    def deemed_wages(self) -> int:
        """Excluded components above 50% of total remuneration are added back to wages."""
        excess = self.excluded - self.gross // 2
        return self.wages + max(0, excess)


class TermSheet(Strict):
    """Everything needed to draft the agreement deterministically."""

    agreement_type: AgreementType
    effective_date: date
    client: Party  # payer / disclosing party A
    provider: Party  # payee / service provider / party B
    governing_state: IndianState
    jurisdiction_city: ShortText = "Bengaluru"

    # service-agreement terms
    scope: LongText | None = None
    milestones: list[Milestone] = Field(default_factory=list, max_length=20)
    acceptance_days: Annotated[int, Field(ge=1, le=90)] = 15
    payment_days: Annotated[int, Field(ge=0, le=180)] = 30
    prices_exclusive_of_gst: bool = True
    fee_nature: FeeNature = FeeNature.PROFESSIONAL
    ip_model: IpModel = IpModel.ASSIGNMENT
    ip_assignment_worldwide: bool = True
    ip_assignment_full_term: bool = True
    liability_cap_multiple: Annotated[float, Field(ge=0, le=10)] | None = 1.0
    liquidated_damages_pct_per_week: Annotated[float, Field(ge=0, le=10)] | None = None
    termination_notice_days: Annotated[int, Field(ge=0, le=365)] = 30
    processes_personal_data: bool = False

    # restrictive covenants (both agreement types)
    confidentiality_years: Annotated[int, Field(ge=1, le=10)] = 3
    non_compete_months_after_term: Annotated[int, Field(ge=0, le=60)] = 0
    non_solicit_months_after_term: Annotated[int, Field(ge=0, le=24)] = 12
    claims_window_days: Annotated[int, Field(ge=0, le=3650)] | None = Field(
        default=None,
        description="If set, a clause limiting time to bring claims (checked against s.28).",
    )

    # NDA
    nda_purpose: Annotated[str, Field(min_length=1, max_length=1000)] | None = None
    nda_mutual: bool = True

    employment: Employment | None = None

    arbitration: Arbitration = Field(default_factory=Arbitration)
    escrow: Escrow = Field(default_factory=Escrow)
    e_sign: bool = True

    @model_validator(mode="after")
    def _structural(self) -> TermSheet:
        if self.agreement_type is AgreementType.SERVICE:
            if not self.milestones:
                raise ValueError("a service agreement needs at least one milestone")
            if not self.scope:
                raise ValueError("a service agreement needs a scope of work")
            if sum(m.amount_paise for m in self.milestones) > MAX_PAISE:
                raise ValueError("total contract value exceeds the supported maximum")
        if self.agreement_type is AgreementType.NDA and not self.nda_purpose:
            raise ValueError("an NDA needs a stated purpose")
        if self.agreement_type is AgreementType.EMPLOYMENT:
            e = self.employment
            if e is None:
                raise ValueError("an appointment letter needs employment particulars")
            if self.provider.entity_type is not EntityType.INDIVIDUAL:
                raise ValueError("the employee must be an individual")
            if e.employment_type is EmploymentType.FIXED_TERM:
                if e.fixed_term_end is None or e.fixed_term_end <= e.date_of_joining:
                    raise ValueError("a fixed-term appointment needs an end date after the date of joining")
            elif e.fixed_term_end is not None:
                raise ValueError("only fixed-term appointments have an end date")
            if e.employee_date_of_birth >= e.date_of_joining:
                raise ValueError("date of birth must be before the date of joining")
        if self.client.name.casefold() == self.provider.name.casefold():
            raise ValueError("the two parties must be different")
        return self

    @property
    def total_paise(self) -> int:
        return sum(m.amount_paise for m in self.milestones)


class Severity(StrEnum):
    BLOCKER = "blocker"  # cannot be drafted as-is (void/illegal/unsafe)
    WARNING = "warning"  # enforceable risk the user should resolve
    INFO = "info"  # compliance reminder / good practice


class Citation(Strict):
    authority: str  # e.g. "Indian Contract Act, 1872"
    provision: str  # e.g. "s.27"
    url: str | None = None
    note: str | None = None


class Finding(Strict):
    rule_id: str
    severity: Severity
    title: str
    detail: str
    citations: list[Citation]
    fix: str | None = None
    field: str | None = None  # dotted path in the term sheet the finding refers to
    autofix: dict | None = None  # {"path": ..., "value": ...} safe automatic correction
