using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Reconciliations")]
    public class Reconciliation
    {
        [Key]
        public int ReconID { get; set; }

        [Required]
        public DateTime PeriodStart { get; set; }

        [Required]
        public DateTime PeriodEnd { get; set; }

        public string? PaymentsSummaryJSON { get; set; }

        public string? DiscrepanciesJSON { get; set; }

        public DateTime? ReconciledAt { get; set; }

        // ── PDF stored on creation ────────────────────────────────
        public byte[]? ReconFilePDF { get; set; }

        public int? PerformedByID { get; set; }
        [ForeignKey("PerformedByID")]
        public User? PerformedBy { get; set; }

       

        // ─── Multi-Tenant (Phase 2) ───────────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}