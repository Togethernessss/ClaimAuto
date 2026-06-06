using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("KPIs")]
    public class KPI
    {
        [Key]
        public int KPIID { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Definition { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? Target { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? CurrentValue { get; set; }

        [MaxLength(50)]
        public string? ReportingPeriod { get; set; }

        

        // ─── Multi-Tenant (Phase 2) ───────────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}