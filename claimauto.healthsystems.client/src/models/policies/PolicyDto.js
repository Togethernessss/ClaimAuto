// ── CREATE POLICY ─────────────────────────────────────────────────────────────
// Used when: Admin fills in the "New Policy" form and clicks Create
// Matches:   POST /api/policies  →  backend CreatePolicyDto.cs

export class CreatePolicyDto {
  constructor({
    planCode          = '',   // e.g. "FAMILY-GOLD-2025"  — unique, locked after save
    planName          = '',   // e.g. "Family Gold Health Plan"
    coverageRulesJSON = '',   // optional JSON string
    sumInsured        = '',   // total insurer payout limit per policy year
    deductibleAmount  = '',   // number — e.g. 5000
    effectiveFrom     = '',   // date string — e.g. "2025-01-01"
    effectiveTo       = '',   // date string — blank means auto-renewing
  } = {}) {
    this.planCode          = planCode;
    this.planName          = planName;
    this.coverageRulesJSON = coverageRulesJSON;
    this.sumInsured        = sumInsured;
    this.deductibleAmount  = deductibleAmount;
    this.effectiveFrom     = effectiveFrom;
    this.effectiveTo       = effectiveTo;
  }
}


// ── UPDATE POLICY ─────────────────────────────────────────────────────────────
// Used when: Admin edits an existing policy
// Matches:   PUT /api/policies/{id}  →  backend UpdatePolicyDto.cs
// NOTE:      planCode and effectiveFrom are NOT here — they're locked after creation

export class UpdatePolicyDto {
  constructor({
    planName          = '',
    coverageRulesJSON = '',
    sumInsured        = '',   // total insurer payout limit per policy year
    deductibleAmount  = '',
    effectiveTo       = '',
    status            = '',   // "Active", "Expired", "Suspended"
  } = {}) {
    this.planName          = planName;
    this.coverageRulesJSON = coverageRulesJSON;
    this.sumInsured        = sumInsured;
    this.deductibleAmount  = deductibleAmount;
    this.effectiveTo       = effectiveTo;
    this.status            = status;
  }
}