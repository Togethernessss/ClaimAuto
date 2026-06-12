using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ClaimAuto.HealthSystems.Server.Middleware
{
    /// <summary>
    /// Blocks authenticated users whose account Status has been set to Inactive
    /// from calling any API endpoint. Returns 401 with code ACCOUNT_DEACTIVATED
    /// so the frontend can distinguish this from a normal token expiry and show
    /// the appropriate "contact support" message.
    ///
    /// Runs BEFORE MustChangePasswordMiddleware so a deactivated user is evicted
    /// before any other gate is checked.
    ///
    /// Cost: one cheap scalar DB read per authenticated request (same pattern as
    /// MustChangePasswordMiddleware).
    /// </summary>
    public class UserStatusMiddleware
    {
        private readonly RequestDelegate _next;

        public UserStatusMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, ApplicationDbContext db)
        {
            // Skip unauthenticated requests — anonymous endpoints handle their own access.
            if (context.User.Identity?.IsAuthenticated != true)
            {
                await _next(context);
                return;
            }

            // Always let CORS preflight through.
            if (HttpMethods.IsOptions(context.Request.Method))
            {
                await _next(context);
                return;
            }

            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
            {
                await _next(context);
                return;
            }
            
            var status = await db.Users
                .Where(u => u.UserID == userId)
                .Select(u => (AccountStatus?)u.Status)
                .FirstOrDefaultAsync();

            if (status == AccountStatus.Inactive)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "ACCOUNT_DEACTIVATED",
                    message = "Your account has been deactivated by the organisation. Please contact support."
                });
                return;
            }

            await _next(context);
        }
    }
}
