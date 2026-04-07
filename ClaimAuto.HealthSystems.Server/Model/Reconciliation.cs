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

        public string? BankStatementURI { get; set; }

        public string? PaymentsSummaryJSON { get; set; }

        public string? DiscrepanciesJSON { get; set; }

        public DateTime? ReconciledAt { get; set; }

        public int? PerformedByID { get; set; }
        [ForeignKey("PerformedByID")]
        public User? PerformedBy { get; set; }
    }
}