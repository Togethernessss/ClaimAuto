namespace ClaimAuto.HealthSystems.Server.DTOs
{
    public class OrganizationResponseDto
    {
        public int OrganizationID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ShortCode { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public string? BrandColor { get; set; }
        public string? SupportEmail { get; set; }
        public string? SupportPhone { get; set; }
    }
}