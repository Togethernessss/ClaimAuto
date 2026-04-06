using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("AuditPackages")]
    public class AuditPackage
    {
        [Key]
        public int PackageID { get; set; }

        [Required]
        public DateTime PeriodStart { get; set; }

        [Required]
        public DateTime PeriodEnd { get; set; }

        public string? ContentsJSON { get; set; }

        [Required]
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        public string? PackageURI { get; set; }
    }
}
