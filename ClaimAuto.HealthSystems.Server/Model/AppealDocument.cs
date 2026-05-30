using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    /// <summary>
    /// Stores ONE original file uploaded with an appeal. Bytes are persisted in
    /// the DB so individual files remain viewable/downloadable even after the
    /// combined PDF is generated. Multi-tenant: every row carries OrganizationID.
    /// </summary>
    [Table("AppealDocuments")]
    public class AppealDocument
    {
        [Key]
        public int DocumentID { get; set; }

        [ForeignKey("Appeal")]
        public int AppealID { get; set; }
        public Appeal Appeal { get; set; } = null!;

        [Required, MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string ContentType { get; set; } = "application/octet-stream";

        public long FileSize { get; set; }

        // Raw file bytes — stored as varbinary(max) via OnModelCreating.
        // Kept nullable on the model side so EF doesn't require a default;
        // a NULL value here is treated as "file missing" at the API layer.
        public byte[]? FileData { get; set; }

        [Required]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        // ─── Multi-Tenant ─────────────────────────────────────────────────
        [ForeignKey("Organization")]
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}
