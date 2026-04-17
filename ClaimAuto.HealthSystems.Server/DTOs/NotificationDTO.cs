namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── CreateNotificationDto
    public class CreateNotificationDto
    {
        public int UserID { get; set; }                          // who receives this
        public int? ClaimID { get; set; }                         // what it's about
        public string Message { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;    // "Exception","Payment","Appeal"
        public string Severity { get; set; } = string.Empty;    // "Info","Warning","Critical"
    }

    // ── NotificationResponseDto
      public class NotificationResponseDto
    {
        public int NotificationID { get; set; }
        public int UserID { get; set; }
        public int? ClaimID { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }                    // null = not yet read
        public string Status { get; set; } = string.Empty;      // "Unread","Read","Dismissed"
    }
}