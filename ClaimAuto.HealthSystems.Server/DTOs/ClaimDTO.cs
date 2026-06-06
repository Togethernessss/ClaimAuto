namespace ClaimAuto.HealthSystems.Server.DTOs
{

    // ── CreateClaimDto 
    public class CreateClaimDto
    {
        public string? ExternalClaimRef { get; set; }            // hospital's own reference number
        public int ProviderID { get; set; }                      // Rahul's UserID
        public int MemberID { get; set; }                        // Arjun's MemberID
        public int PolicyID { get; set; }                        // Family Gold PolicyID
        public string ClaimType { get; set; } = string.Empty;   // "Inpatient","Outpatient","Pharmacy"
        public decimal TotalBilledAmount { get; set; }
        public string Currency { get; set; } = "INR";
        public string Priority { get; set; } = "Normal";        // "Normal","High","Urgent"
        public string SourceChannel { get; set; } = string.Empty; // "Portal","EDI","API","BatchCSV"
        public string? Notes { get; set; }   // ← ADD: Policyholder describes treatment
        public List<AddClaimLineDto>? Lines { get; set; }
        public List<UploadDocumentDto>? Documents { get; set; }
    }

    // ── ClaimResponseDto
    public class ClaimResponseDto
    {
        public int ClaimID { get; set; }
        public string? ExternalClaimRef { get; set; }
        public int ProviderID { get; set; }
        public string ProviderName { get; set; } = string.Empty; // resolved — "Sunrise Hospital"
        public int MemberID { get; set; }
        public string MemberName { get; set; } = string.Empty;   // resolved — "Arjun Sharma"
        public int PolicyID { get; set; }                          // ← needed so frontend can scope
        public string PolicyName { get; set; } = string.Empty;   // resolved — "Family Gold"
        public string ClaimType { get; set; } = string.Empty;
        public decimal TotalBilledAmount { get; set; }
        // ApprovedAmount = the actual payable amount after deductible / co-pay,
        // pulled from the latest AdjudicationRecord's CalculationsJSON. Null
        // until the claim has been adjudicated.
        public decimal? ApprovedAmount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateTime SubmittedAt { get; set; }
        public string? Notes { get; set; }   // ← ADD to both
    }

    // ── ClaimDetailResponseDto 
    public class ClaimDetailResponseDto
    {
        public int ClaimID { get; set; }
        public string? ExternalClaimRef { get; set; }
        public int ProviderID { get; set; }
        public int MemberID { get; set; }
        public string ProviderName { get; set; } = string.Empty;
        public string MemberName { get; set; } = string.Empty;
        public string PolicyName { get; set; } = string.Empty;
        public string ClaimType { get; set; } = string.Empty;
        public decimal TotalBilledAmount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string SourceChannel { get; set; } = string.Empty;
        public DateTime SubmittedAt { get; set; }
        public DateTime? ReceivedAt { get; set; }
        public string? Notes { get; set; }   // ← ADD to both

        // Nested collections — loaded via Include() in repository
        public List<ClaimLineResponseDto> ClaimLines { get; set; } = new();
        public List<ClaimDocumentResponseDto> ClaimDocuments { get; set; } = new();
        public AdjudicationResponseDto? Adjudication { get; set; }  // null if not yet adjudicated
    }

    // ── AddClaimLineDto 
    public class AddClaimLineDto
    {
        public string ServiceCode { get; set; } = string.Empty;  // CPT code — e.g. "99223"
        public DateTime ServiceDate { get; set; }
        public int Quantity { get; set; } = 1;
        public decimal UnitPrice { get; set; }
        public decimal LineBilledAmount { get; set; }            // Quantity × UnitPrice
        public string? DiagnosisCodesJSON { get; set; }          // ICD codes — e.g. ["J18.9"]
        public string? ProcedureCodesJSON { get; set; }
    }

    // ── ClaimLineResponseDto
    public class ClaimLineResponseDto
    {
        public int LineID { get; set; }
        public int ClaimID { get; set; }
        public string ServiceCode { get; set; } = string.Empty;
        public DateTime ServiceDate { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineBilledAmount { get; set; }
        public string? DiagnosisCodesJSON { get; set; }
        public string? ProcedureCodesJSON { get; set; }
        public string LineStatus { get; set; } = string.Empty;   // "Pending","Approved","Denied"
    }

    // ── UploadDocumentDto 
    public class UploadDocumentDto
    {
        public string DocType { get; set; } = string.Empty;      // "Invoice","MedicalRecord","LabReport"
        public string FileURI { get; set; } = string.Empty;      // S3/Azure path
        public string SHA256 { get; set; } = string.Empty;       // 64-char hash for tamper detection
    }

    // ── ClaimDocumentResponseDto 
    public class ClaimDocumentResponseDto
    {
        public int DocID { get; set; }
        public int ClaimID { get; set; }
        public int UploadedByID { get; set; }
        public string UploadedByName { get; set; } = string.Empty;
        public string? VerifiedByName { get; set; }
        public string DocType { get; set; } = string.Empty;
        public string FileURI { get; set; } = string.Empty;
        public string SHA256 { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class VerifyDocumentDto
    {
        public string Status { get; set; } = string.Empty;   // "Verified" | "Rejected"
    }

    // ── UpdateClaimDto 
    public class UpdateClaimDto
    {
        public string? Status { get; set; }    // "UnderReview" | "Approved" | "Rejected"
        public string? Priority { get; set; } // "Normal","High","Urgent"
    }

    /// <summary>
    /// Input for staff to reject a claim at their discretion with a documented reason.
    /// </summary>
    public class RejectClaimDto
    {
        /// <summary>Required — reason for rejection, shown to filer + logged in audit trail.</summary>
        public string Reason { get; set; } = string.Empty;

        /// <summary>Optional — which document IDs (if any) triggered this rejection.</summary>
        public List<int>? RelatedDocumentIDs { get; set; }
    }

    /// <summary>
    /// Input for replacing a rejected document with a corrected version.
    /// Preserves DocID (audit trail) but updates content + resets status to Pending.
    /// </summary>
    public class ReplaceDocumentDto
    {
        public string FileURI { get; set; } = string.Empty;
        public string SHA256 { get; set; } = string.Empty;
    }
}
