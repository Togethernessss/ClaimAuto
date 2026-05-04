namespace ClaimAuto.HealthSystems.Server.DTOs
{
    
    // ── AuditLogResponseDto 
    public class AuditLogResponseDto
    {
        public int AuditID { get; set; }
        public int? UserID { get; set; }
        public string UserName { get; set; } = string.Empty; // resolved from User table
        public string Action { get; set; } = string.Empty;
        public string? ResourceType { get; set; }
        public string? ResourceID { get; set; }
        public string? DetailsJSON { get; set; }
        public DateTime Timestamp { get; set; }
    }
}
