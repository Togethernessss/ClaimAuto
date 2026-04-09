namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // PaymentID, CreatedAt, Status are auto-generated
    public class PaymentDto
    {
        public int ClaimID { get; set; }
        // The ClaimID this payment is for

        public int PayeeID { get; set; }
        // UserID of the Hospital receiving payment (Rahul)

        public decimal Amount { get; set; }
        // Approved payment amount — Example: 25000.00

        public string Currency { get; set; } = "INR";

        // PaymentMethod options: "EFT" / "ACH" / "Check"
        public string PaymentMethod { get; set; } = "EFT";

        public DateTime? ScheduledAt { get; set; }
        // Example: "2025-03-02T10:00:00"
    }
}