namespace ClaimAuto.HealthSystems.Server.DTOs
{
    public class CreatePaymentDto
    {
        public int ClaimID { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public string PaymentMethod { get; set; } = string.Empty;  // "EFT", "ACH", "Check"
        public string? ReferenceNumber { get; set; }
    }

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
        public string? ReferenceNumber { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ScheduledAt { get; set; }
        public DateTime? ExecutedAt { get; set; }
    }
}
