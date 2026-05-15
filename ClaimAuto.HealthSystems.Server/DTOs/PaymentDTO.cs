namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── CreatePaymentDto 
    public class CreatePaymentDto
    {
        public int ClaimID { get; set; }
        public int PayeeID { get; set; }                         // Sunrise Hospital's UserID
        public decimal Amount { get; set; }                      // approved amount — e.g. ₹25,000
        public string Currency { get; set; } = "INR";
        public string PaymentMethod { get; set; } = string.Empty; // "EFT","ACH","Check"
        public DateTime? ScheduledAt { get; set; }
    }

    // ── PaymentResponseDto 
    public class PaymentResponseDto
    {
        public int PaymentID { get; set; }
        public int ClaimID { get; set; }
        public int PayeeID { get; set; }
        public string PayeeName { get; set; } = string.Empty;   // resolved
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ScheduledAt { get; set; }
        public DateTime? ExecutedAt { get; set; }               // null until bank confirms
        public string? ReferenceNumber { get; set; }            // null until executed
    }

    // ── RemittanceResponseDto 
    public class RemittanceResponseDto
    {
        public int RemittanceID { get; set; }
        public int PaymentID { get; set; }
        public string? RemitFileURI { get; set; }
        public DateTime GeneratedAt { get; set; }
        public DateTime? SentToProviderAt { get; set; }
        public string Status { get; set; } = string.Empty;      // "Generated","Sent","Acknowledged"
    }

    // ── ReconciliationResponseDto 
    public class ReconciliationResponseDto
    {
        public int ReconID { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public string? PaymentsSummaryJSON { get; set; }
        public string? DiscrepanciesJSON { get; set; }
        public DateTime? ReconciledAt { get; set; }
        public string PerformedByName { get; set; } = string.Empty; // resolved
    }

    // ── CreateReconciliationDto
    public class CreateReconciliationDto
    {
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public string? BankStatementURI { get; set; }
    }
}
