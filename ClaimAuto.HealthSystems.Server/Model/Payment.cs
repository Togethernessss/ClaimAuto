using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Payments")]
    public class Payment
    {
        [Key]
        public int PaymentID { get; set; }

        [ForeignKey("Claim")]
        public int ClaimID { get; set; }
        public Claim Claim { get; set; } = null!;

        [ForeignKey("Payee")]
        public int PayeeID { get; set; }
        public User Payee { get; set; } = null!;

        [Required, Column(TypeName = "decimal(12,2)")]
        public decimal Amount { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "INR";

        [Required]
        public PaymentMethod PaymentMethod { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ScheduledAt { get; set; }

        public DateTime? ExecutedAt { get; set; }

        [Required]
        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

        [MaxLength(100)]
        public string? ReferenceNumber { get; set; }

        //Multi-Tenant (Phase 1)
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }

        // Navigation
        public Remittance? Remittance { get; set; }
    }
}
