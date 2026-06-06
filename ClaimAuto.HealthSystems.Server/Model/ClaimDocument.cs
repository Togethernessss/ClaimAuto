using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("ClaimDocuments")]
    public class ClaimDocument
    {
        [Key]
        public int DocID { get; set; }

        [ForeignKey("Claim")]
        public int ClaimID { get; set; }
        public Claim Claim { get; set; } = null!;

        [ForeignKey("Uploader")]
        public int UploadedBy { get; set; }
        public User Uploader { get; set; } = null!;

        [Required]
        public DocType DocType { get; set; }

        [Required]
        public string FileURI { get; set; } = string.Empty;

        [Required, MaxLength(64)]
        public string SHA256 { get; set; } = string.Empty;

        [Required]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        public string? OCRTextURI { get; set; }

        public int? VerifiedByID { get; set; }
        [ForeignKey("VerifiedByID")]
        public User? VerifiedBy { get; set; }

        [Required]
        public DocStatus Status { get; set; } = DocStatus.Pending;

        // ─── Multi-Tenant (Phase 4) ────────────────────────────────────────
        // Each document inherits its tenant from the parent Claim.
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}
