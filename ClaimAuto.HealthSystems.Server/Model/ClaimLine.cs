using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("ClaimLines")]
    public class ClaimLine
    {
        [Key]
        public int LineID { get; set; }

        [ForeignKey("Claim")]
        public int ClaimID { get; set; }
        public Claim Claim { get; set; } = null!;

        [Required, MaxLength(50)]
        public string ServiceCode { get; set; } = string.Empty;

        [Required]
        public DateTime ServiceDate { get; set; }

        public int Quantity { get; set; } = 1;

        [Required, Column(TypeName = "decimal(10,2)")]
        public decimal UnitPrice { get; set; }

        [Required, Column(TypeName = "decimal(12,2)")]
        public decimal LineBilledAmount { get; set; }

        public string? DiagnosisCodesJSON { get; set; }

        public string? ProcedureCodesJSON { get; set; }

        [Required]
        public LineStatus LineStatus { get; set; } = LineStatus.Pending;

        

        // ─── Multi-Tenant (Phase 4) ────────────────────────────────────────
        // Each claim line inherits its tenant from the parent Claim.
        // Stored explicitly here for direct query filtering without a JOIN.
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}