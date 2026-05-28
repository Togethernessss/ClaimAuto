using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    /// <summary>
    /// Stores the raw file bytes for an uploaded document.
    /// Kept in a separate table so ClaimDocuments queries remain lean.
    /// FileGuid is the identifier used in the virtual URI: /api/files/{FileGuid}
    /// </summary>
    [Table("ClaimDocumentContents")]
    public class ClaimDocumentContent
    {
        [Key]
        [MaxLength(36)]
        public string FileGuid { get; set; } = string.Empty;

        [Required]
        public byte[] FileBytes { get; set; } = Array.Empty<byte>();

        [Required, MaxLength(100)]
        public string ContentType { get; set; } = "application/octet-stream";

        [Required, MaxLength(255)]
        public string OriginalFileName { get; set; } = string.Empty;

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}