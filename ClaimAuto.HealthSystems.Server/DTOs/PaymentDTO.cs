// ── CreatePaymentDto
public class CreatePaymentDto
{
    public int ClaimID { get; set; }
    public int PayeeID { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string PaymentMethod { get; set; } = string.Empty;
    public DateTime? ScheduledAt { get; set; }
}

// ── PaymentResponseDto
public class PaymentResponseDto
{
    public int PaymentID { get; set; }
    public int ClaimID { get; set; }
    public int PayeeID { get; set; }
    public string PayeeName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public DateTime? ExecutedAt { get; set; }
    public string? ReferenceNumber { get; set; }
}

// ── RemittanceResponseDto
public class RemittanceResponseDto
{
    public int RemittanceID { get; set; }
    public int PaymentID { get; set; }
    public DateTime GeneratedAt { get; set; }
    public DateTime? SentToProviderAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PayeeName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public int ClaimID { get; set; }
    public bool HasPDF { get; set; }
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
    public string PerformedByName { get; set; } = string.Empty;
    public bool HasPDF { get; set; }
}

// ── CreateReconciliationDto
public class CreateReconciliationDto
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    // BankStatementURI removed
}