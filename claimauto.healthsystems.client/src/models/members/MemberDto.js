// src/models/members/MemberDto.js
// Mirrors backend MemberDTO.cs

export class CreateMemberDto {
  constructor({
    policyID           = '',
    name               = '',
    dob                = '',
    gender             = '',
    contactPhone       = '',
    contactEmail       = '',
    contactAddress     = '',
    coverageStart      = '',
    coverageEnd        = '',
    policyholderUserID = '',   // required — staff selects from dropdown
  } = {}) {
    this.policyID           = policyID;
    this.name               = name;
    this.dob                = dob;
    this.gender             = gender;
    this.contactPhone       = contactPhone;
    this.contactEmail       = contactEmail;
    this.contactAddress     = contactAddress;
    this.coverageStart      = coverageStart;
    this.coverageEnd        = coverageEnd;
    this.policyholderUserID = policyholderUserID;
  }
}

export class UpdateMemberDto {
  constructor({
    name           = '',
    contactPhone   = '',
    contactEmail   = '',
    contactAddress = '',
    coverageEnd    = '',
    status         = '',
  } = {}) {
    this.name           = name;
    this.contactPhone   = contactPhone;
    this.contactEmail   = contactEmail;
    this.contactAddress = contactAddress;
    this.coverageEnd    = coverageEnd;
    this.status         = status;
  }
}

export class MemberResponseDto {
  constructor({
    memberID, policyID, policyName,
    name, dob, gender, memberNumber,
    contactInfoJSON, coverageStart, coverageEnd, status,
    policyholderUserID = null,
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
    this.policyholderUserID = policyholderUserID; 
  }

  get isActive()   { return this.status === 'Active'; }
  get isInactive() { return this.status === 'Inactive'; }
}