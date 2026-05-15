// ── CREATE MEMBER ─────────────────────────────────────────────────────────
// Used when: Admin/Staff creates a new member under a policy
// Matches: POST /api/members

export class CreateMemberDto {
  constructor({
    policyID       = '',
    name           = '',
    dob            = '',      // date string "YYYY-MM-DD"
    gender         = '',      // "Male" | "Female" | "Other"
    memberNumber   = '',      // unique identifier e.g. "MEM-001"
    contactPhone    = '',    // ← new
    contactEmail    = '',    // ← new
    contactAddress  = '',    // ← new
    contactInfoJSON = '',     // optional JSON string
    coverageStart  = '',      // date string
    coverageEnd    = '',      // date string — blank = no end date
  } = {}) {
    this.policyID        = policyID;
    this.name            = name;
    this.dob             = dob;
    this.gender          = gender;
    this.memberNumber    = memberNumber;
    this.contactPhone   = contactPhone;    // ← new
    this.contactEmail   = contactEmail;    // ← new
    this.contactAddress = contactAddress;  // ← new
    this.contactInfoJSON = contactInfoJSON;
    this.coverageStart   = coverageStart;
    this.coverageEnd     = coverageEnd;
  }
}

// ── UPDATE MEMBER ─────────────────────────────────────────────────────────
// Used when: Admin/Staff edits an existing member
// Matches: PUT /api/members/{id}
// NOTE: DOB, Gender, PolicyID are LOCKED after creation — not here

export class UpdateMemberDto {
  constructor({
    name           = '',
    contactPhone   = '',    // ← new
    contactEmail   = '',    // ← new
    contactAddress = '',    // ← new
    contactInfoJSON = '',
    coverageEnd    = '',
    status         = '',    // "Active" | "Inactive" | "Suspended"
  } = {}) {
    this.name            = name;
    this.contactPhone   = contactPhone;    // ← new
    this.contactEmail   = contactEmail;    // ← new
    this.contactAddress = contactAddress;  // ← new
    this.contactInfoJSON = contactInfoJSON;
    this.coverageEnd     = coverageEnd;
    this.status          = status;
  }
}

// ── MEMBER RESPONSE ───────────────────────────────────────────────────────
// Shape of member object received from API
// Matches: backend MemberResponseDto.cs

export class MemberResponseDto {
  constructor({
    memberID,
    policyID,
    policyName,
    name,
    dob,
    gender,
    memberNumber, 
    contactInfoJSON,
    coverageStart,
    coverageEnd,
    status,
  } = {}) {
    this.memberID        = memberID;
    this.policyID        = policyID;
    this.policyName      = policyName;
    this.name            = name;
    this.dob             = dob;
    this.gender          = gender;
    this.memberNumber    = memberNumber; 
    this.contactInfoJSON = contactInfoJSON;
    this.coverageStart   = coverageStart;
    this.coverageEnd     = coverageEnd;
    this.status          = status;
  }

  // Convenience helpers
  get isActive()   { return this.status === 'Active'; }
  get isInactive() { return this.status === 'Inactive'; }
}