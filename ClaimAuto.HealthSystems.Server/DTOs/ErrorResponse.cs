namespace ClaimAuto.HealthSystems.Server.DTOs
{
    public class ErrorResponse
    {

        public int StatusCode { get; set; }
        public string ErrorCode { get; set; } = "INTERNAL_ERROR";
        public string Message { get; set; } = "An unexpected error occurred.";
        public string? TraceId { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // Only populated in Development — stripped in Production
        public string? Details { get; set; }
    }
}
