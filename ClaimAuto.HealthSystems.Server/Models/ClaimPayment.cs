using System.ComponentModel.DataAnnotations;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class ClaimPayment
    {
        public int Id { get; set; }

        [Required]
        public int ClaimId { get; set; }

        public Claim Claim { get; set; } = null!;

        public decimal PaidAmount { get; set; }

        [Required, MaxLength(20)]
        public string PaymentMode { get; set; } = "BankTransfer"; // BankTransfer, Cheque

        [Required, MaxLength(20)]
        public string PaymentStatus { get; set; } = "Pending"; // Pending, Paid, Failed

        public DateTime? PaidAt { get; set; }

        [Required]
        public int ProcessedBy { get; set; } // FK to User (ClaimsHandler/Admin)
    }
}
