using System.ComponentModel.DataAnnotations;
using ClaimAuto.HealthSystems.Server.Models;

namespace ClaimAuto.HealthSystem.Server.Models
{
    public class ClaimPayment
    {
        public int Id { get; set; }

        [Required]
        public int ClaimId { get; set; }
        public Claim Claim { get; set; }

        public decimal PaidAmount { get; set; }

        [Required, MaxLength(30)]
        public string PaymentMode { get; set; } // "Bank Transfer", "Cheque" (mock)

        [Required, MaxLength(20)]
        public string PaymentStatus { get; set; } // "Pending", "Paid", "Failed"

        public DateTime PaidAt { get; set; }

        public string ProcessedByUserId { get; set; }
        public ApplicationUser ProcessedByUser { get; set; }
    }
}