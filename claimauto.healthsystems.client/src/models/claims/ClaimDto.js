
// ── CREATE CLAIM ──────────────────────────────────────────────────────────────
// Hospital only: POST /api/claims  →  ClaimType = Inpatient/Outpatient/Pharmacy/Emergency
// (Reimbursement claim type removed.)

export class CreateClaimDto {
  constructor({
    externalClaimRef  = '',      // Hospital billing ref
    providerID        = 0,       // Hospital UserID
    memberID          = 0,       // patient MemberID
    policyID          = 0,       // active PolicyID
    claimType         = '',      // "Inpatient" | "Outpatient" | "Pharmacy" | "Emergency"
    totalBilledAmount = 0,       // decimal
    currency          = 'INR',
    priority          = 'Normal',// "Normal"|"High"|"Urgent"
    sourceChannel     = 'Portal',// always Portal from frontend
    notes             = '',      // Policyholder describes treatment; optional for Hospital
  } = {}) {
    this.externalClaimRef  = externalClaimRef  || null;
    this.providerID        = providerID;
    this.memberID          = memberID;
    this.policyID          = policyID;
    this.claimType         = claimType;
    this.totalBilledAmount = totalBilledAmount;
    this.currency          = currency;
    this.priority          = priority;
    this.sourceChannel     = sourceChannel;
    this.notes             = notes             || null;
  }
}

// ── UPDATE CLAIM ──────────────────────────────────────────────────────────────
// Used by: Staff/Admin  →  PUT /api/claims/{id}
export class UpdateClaimDto {
  constructor({
    status   = '', // "UnderReview" | "Approved" | "Rejected" — staff-settable only
    priority = '', // "Normal"|"High"|"Urgent"
  } = {}) {
    this.status   = status   || null;
    this.priority = priority || null;
  }
}

// ── ADD CLAIM LINE ────────────────────────────────────────────────────────────
// Used by: Hospital  →  POST /api/claims/{id}/lines
export class AddClaimLineDto {
  constructor({
    serviceCode        = '',   // CPT code e.g. "99223"
    serviceDate        = '',   // ISO date string
    quantity           = 1,
    unitPrice          = 0,
    lineBilledAmount   = 0,    // quantity × unitPrice
    diagnosisCodesJSON = null, // JSON array string e.g. '["J18.9"]'
    procedureCodesJSON = null,
  } = {}) {
    this.serviceCode        = serviceCode;
    this.serviceDate        = serviceDate;
    this.quantity           = quantity;
    this.unitPrice          = unitPrice;
    this.lineBilledAmount   = lineBilledAmount;
    this.diagnosisCodesJSON = diagnosisCodesJSON || null;
    this.procedureCodesJSON = procedureCodesJSON || null;
  }
}

// ── UPLOAD DOCUMENT ───────────────────────────────────────────────────────────
// Used by: All roles  →  POST /api/claims/{id}/documents
// NOTE: Real file upload would go to S3/Azure first, then store the URI here.
// For this project, FileURI is a simulated path and SHA256 is a placeholder.
export class UploadDocumentDto {
  constructor({
    docType = '',  // "Invoice"|"MedicalRecord"|"LabReport"|"Prescription"|"DischargeSummary"
    fileURI = '',  // simulated path e.g. "uploads/claim-42-invoice.pdf"
    sha256  = '',  // 64-char hash — we'll use a placeholder for now
  } = {}) {
    this.docType = docType;
    this.fileURI = fileURI;
    this.sha256  = sha256;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE SHAPES — document what we receive from the backend
// These are plain objects (not classes) — just documentation + destructuring aid
// ─────────────────────────────────────────────────────────────────────────────

// ClaimResponseDto — returned by GET /api/claims and POST /api/claims
// {
//   claimID, externalClaimRef,
//   providerID, providerName,
//   memberID,   memberName,
//   policyName,
//   claimType, totalBilledAmount, currency,
//   status, priority, submittedAt,
//   notes
// }

// ClaimDetailResponseDto — returned by GET /api/claims/{id}
// Everything in ClaimResponseDto PLUS:
// {
//   sourceChannel, receivedAt,
//   claimLines:     [ { lineID, claimID, serviceCode, serviceDate,
//                       quantity, unitPrice, lineBilledAmount,
//                       diagnosisCodesJSON, lineStatus } ],
//   claimDocuments: [ { docID, claimID, uploadedByName, docType,
//                       fileURI, sha256, uploadedAt, status } ],
//   adjudication:   { adjID, claimID, executedAt, engineVersion,
//                     decision, calculationsJSON, appliedRulesJSON,
//                     notes, performedByName } | null
// }