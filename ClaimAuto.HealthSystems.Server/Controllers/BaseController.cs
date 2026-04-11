using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ClaimAuto.HealthSystems.Server.Controllers
{

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
        protected string? GetLoggedInUserName()
        {
            return User.FindFirst(ClaimTypes.Name)?.Value;
        }
    }
}