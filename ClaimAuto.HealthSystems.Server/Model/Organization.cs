using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Organizations")]
    public class Organization
    {
        [Key]
        public int OrganizationID { get; set; }

        // Display name shown in nav bar / dashboards.
        // e.g., "Star Health Insurance"
        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        // Short identifier (unique). Useful for URLs and lookups.
        // e.g., "STARHEALTH"
        [Required, MaxLength(50)]
        public string ShortCode { get; set; } = string.Empty;

        // One-line marketing description shown on the register page card.
        [MaxLength(500)]
        public string? Description { get; set; }

        // Optional logo URL (CDN or local /public path). NULL = use default icon.
        [MaxLength(255)]
        public string? LogoUrl { get; set; }

        // Brand hex color used to tint nav bars / accents. e.g., "#00A859"
        [MaxLength(20)]
        public string? BrandColor { get; set; }

        // Customer support contact details — replaces the hardcoded
        // support@claimauto.com once Step 4 is done.
        [MaxLength(255)]
        public string? SupportEmail { get; set; }

        [MaxLength(50)]
        public string? SupportPhone { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation — one Organization has many Users.
        public ICollection<User> Users { get; set; } = new List<User>();
    }
}