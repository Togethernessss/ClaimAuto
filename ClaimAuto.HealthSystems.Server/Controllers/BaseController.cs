using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClaimAuto.HealthSystems.Server.Controllers
{

    /// <summary>Shared base controller that exposes JWT claim helpers to all derived controllers.</summary>
    public class BaseController : ControllerBase
    {
        // ── GET LOGGED IN USER ID ────────────────────────────────────────────────
        protected int? GetLoggedInUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(claim, out int userId))
                return userId;
            return null;
        }

        // ── GET LOGGED IN USER ROLE ──────────────────────────────────────────────
        protected string? GetLoggedInUserRole()
        {
            return User.FindFirst(ClaimTypes.Role)?.Value;
        }

        // ── GET LOGGED IN USER EMAIL ─────────────────────────────────────────────
        protected string? GetLoggedInUserEmail()
        {
            return User.FindFirst(ClaimTypes.Email)?.Value;
        }

        // ── GET LOGGED IN USER NAME ──────────────────────────────────────────────
        // ── GET LOGGED IN USER NAME ──────────────────────────────────────────────
        protected string? GetLoggedInUserName()
        {
            return User.FindFirst(ClaimTypes.Name)?.Value;
        }

        // ── GET LOGGED IN USER ORGANIZATION ID (Phase 4) ─────────────────────────
        // Returns the org_id claim from the JWT, parsed as an int.
        // Returns null if the user has no org (e.g., legacy users without OrganizationID).
        // Controllers pass this into repositories to scope queries to one tenant.
        protected int? GetLoggedInUserOrgId()
        {
            var claim = User.FindFirst("org_id")?.Value;
            if (int.TryParse(claim, out int orgId))
                return orgId;
            return null;
        }
    }
}