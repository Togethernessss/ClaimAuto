namespace ClaimAuto.HealthSystems.Server.DTOs
{
    /// <summary>
    /// Request body for POST /api/setup/create-org.
    /// Creates one Organization. Admin is created separately via /api/setup/create-admin.
    /// </summary>
    public class SetupCreateOrgDto
    {
        /// <summary>Display name shown in nav / dashboards. e.g. "Star Health Insurance"</summary>
        public string OrgName { get; set; } = string.Empty;

        /// <summary>Unique short identifier — stored upper-case. e.g. "STARHEALTH"</summary>
        public string ShortCode { get; set; } = string.Empty;

        /// <summary>One-line description shown on the register page card.</summary>
        public string? Description { get; set; }

        /// <summary>Brand hex color for nav / accents. e.g. "#0057B7"</summary>
        public string? BrandColor { get; set; }

        /// <summary>Support email shown to users.</summary>
        public string? SupportEmail { get; set; }

        /// <summary>Support phone shown to users.</summary>
        public string? SupportPhone { get; set; }
    }

    /// <summary>
    /// Request body for POST /api/setup/create-admin.
    /// Creates the first Admin user for an existing organization,
    /// then seeds default rules and KPIs for that org.
    /// </summary>
    public class SetupCreateAdminDto
    {
        /// <summary>ID of the organization this admin belongs to (returned by /create-org).</summary>
        public int OrgId { get; set; }

        /// <summary>Full name of the admin user.</summary>
        public string AdminName { get; set; } = string.Empty;

        /// <summary>Login email for the admin.</summary>
        public string AdminEmail { get; set; } = string.Empty;

        /// <summary>Plain-text password — hashed before storage. Must pass PasswordPolicy.</summary>
        public string AdminPassword { get; set; } = string.Empty;

        /// <summary>Optional contact phone for the admin account.</summary>
        public string? AdminPhone { get; set; }
    }
}
