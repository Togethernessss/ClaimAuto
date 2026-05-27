namespace ClaimAuto.HealthSystems.Server.DTOs
{
    /// <summary>
    /// Metadata for a single uploaded appeal document.
    /// File bytes are streamed via separate view/download endpoints.
    /// </summary>
    public class AppealDocumentResponseDto
    {
        public int DocumentID { get; set; }
        public int AppealID { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public DateTime UploadedAt { get; set; }
        public string FileSizeDisplay => FormatBytes(FileSize);

        private static string FormatBytes(long bytes)
        {
            if (bytes < 1024) return $"{bytes} B";
            if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} KB";
            return $"{bytes / (1024.0 * 1024.0):F1} MB";
        }
    }
}