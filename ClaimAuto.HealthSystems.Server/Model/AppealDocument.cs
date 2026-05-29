namespace ClaimAuto.HealthSystems.Server.Model
{
    /// <summary>
    /// Stores ORIGINAL files uploaded with an appeal (one row per file).
    /// Preserves the original filename, MIME type, and exact bytes uploaded
    /// so users can view/download each file as it was uploaded.
    /// </summary>
    public class AppealDocument
    {
        public int DocumentID { get; set; }

        // ── Foreign key to Appeal ──
        public int AppealID { get; set; }
        public Appeal? Appeal { get; set; }

        // ── Original file metadata ──
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = "application/octet-stream";
        public long FileSize { get; set; }
        public byte[] FileData { get; set; } = Array.Empty<byte>();
        public DateTime UploadedAt { get; set; }

        // ── Tenant stamp (SaaS isolation) ──
        public int? OrganizationID { get; set; }
        public Organization? Organization { get; set; }
    }
}