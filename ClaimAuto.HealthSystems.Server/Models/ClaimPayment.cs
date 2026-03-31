using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ClaimAuto.HealthSystems.Server.Models;

public class Claim
{
    [Key]
    public int Id { get; set; }

    [Required]
    public decimal PaidAmount { get; set; }
    public string PaymentMode { get; set; }
    public string PaymentStatus { get; set; }
    public DateTime PaidAt { get; set; }

    public int ProcessedBy { get; set; }

    [ForeignKey(nameof(ProcessedBy))]
    public ApplicationUser ProcessedByUser { get; set; }
}
