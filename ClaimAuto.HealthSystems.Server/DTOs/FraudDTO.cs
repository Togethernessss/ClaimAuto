namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── FraudScoreResponseDto 
    public class FraudScoreResponseDto
    {
        public int ScoreID { get; set; }
        public int ClaimID { get; set; }
        public string? ScoringModel { get; set; }
        public decimal ScoreValue { get; set; }                  // 0.00 to 100.00
        public string? FactorsJSON { get; set; }
        public DateTime GeneratedAt { get; set; }
    }

    // ── CreateFraudCaseDto 
    public class CreateFraudCaseDto
    {
        public int ClaimID { get; set; }
        public string Priority { get; set; } = string.Empty;    // "Low","Medium","High","Critical"
        public string? InvestigationNotes { get; set; }
    }

    // ── ResolveFraudCaseDto 
    public class ResolveFraudCaseDto
    {
        public string Outcome { get; set; } = string.Empty;     // "Cleared","Confirmed","Escalated"
        public string? InvestigationNotes { get; set; }          // Vikram's final notes
        public string? EvidenceURIsJSON { get; set; }            // links to evidence files
    }

    // ── FraudCaseResponseDto 
    public class FraudCaseResponseDto
    {
        public int CaseID { get; set; }
        public int ClaimID { get; set; }
        public DateTime OpenedAt { get; set; }
        public string OpenedByName { get; set; } = string.Empty; // resolved
        public string Priority { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? InvestigationNotes { get; set; }
        public string? EvidenceURIsJSON { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string? Outcome { get; set; }                     // null until resolved
    }
}