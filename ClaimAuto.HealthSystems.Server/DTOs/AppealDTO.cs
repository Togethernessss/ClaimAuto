namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── CreateAppealDto
    public class CreateAppealDto
    {
        public int ClaimID { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? DocumentsJSON { get; set; }               // optional extra documents
    }

    // ── DecideAppealDto
    public class DecideAppealDto
    {
        public string Outcome { get; set; } = string.Empty;     // "Upheld","Overturned","PartiallyUpheld"

        // Required ONLY when Outcome = PartiallyUpheld.
        // Must be > 0 and ≤ the claim's TotalBilledAmount.
        public decimal? PartialPayableAmount { get; set; }

        // Required ONLY when Outcome = PartiallyUpheld (min 10 chars).
        // Goes into the audit trail and the notification sent to the filer.
        public string? PartialReason { get; set; }
    }

    // ── AppealResponseDto
    public class AppealResponseDto
    {
        public int AppealID { get; set; }
        public int ClaimID { get; set; }
        public string FiledByName { get; set; } = string.Empty;  // resolved — "Arjun Sharma"
        public DateTime FiledAt { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? DocumentsJSON { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? DecisionAt { get; set; }
        public string? DecisionByName { get; set; }              // resolved — "Sneha Kapoor"
        public string? Outcome { get; set; }                     // null until decided
        public bool HasPDF { get; set; }
    }

    // ── CreateSubrogationDto
    public class CreateSubrogationDto
    {
        public int ClaimID { get; set; }
        public decimal? RecoverableAmount { get; set; }
        public string? ThirdPartyDetailsJSON { get; set; }
    }

    // ── AppealDocumentResponseDto
    // Metadata for one uploaded file (bytes are NOT included — fetched via
    // /api/appeals/{id}/documents/{docId}/view or /download endpoints).
    public class AppealDocumentResponseDto
    {
        public int DocumentID { get; set; }
        public int AppealID { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public DateTime UploadedAt { get; set; }
    }
}