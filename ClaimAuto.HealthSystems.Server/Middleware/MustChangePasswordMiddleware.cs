using ClaimAuto.HealthSystems.Server.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ClaimAuto.HealthSystems.Server.Middleware
{
    /// <summary>
    /// Blocks authenticated users with MustChangePassword=true from hitting any
    /// API endpoint OTHER than the change-password endpoint itself.
    ///
    /// The frontend (RequireAuth.jsx) already redirects these users to
    /// /force-change-password — but a malicious user with their JWT could
    /// bypass the UI and call APIs directly via Postman/curl. This middleware
    /// closes that bypass at the API layer.
    ///
    /// Cost: one cheap scalar DB read per authenticated request.
    /// </summary>
    public class MustChangePasswordMiddleware
    {
        private readonly RequestDelegate _next;

        public MustChangePasswordMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, ApplicationDbContext db)
        {
            // 1. Skip unauthenticated requests. Anonymous endpoints (login,
            //    register, forgot-password, etc.) handle their own access;
            //    protected endpoints are rejected later by [Authorize].
            if (context.User.Identity?.IsAuthenticated != true)
            {
                await _next(context);
                return;
            }

            // 2. Always allow CORS preflight and the change-password endpoint
            //    itself — otherwise the user would be permanently locked out.
            if (HttpMethods.IsOptions(context.Request.Method) ||
                context.Request.Path.StartsWithSegments("/api/auth/change-password"))
            {
                await _next(context);
                return;
            }

            // 3. Look up the user's current MustChangePassword flag.
            //    JWT carries the UserID as the "sub" claim, which ASP.NET Core
            //    auto-maps to ClaimTypes.NameIdentifier.
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
            {
                await _next(context);
                return;
            }

            var mustChange = await db.Users
                .Where(u => u.UserID == userId)
                .Select(u => u.MustChangePassword)
                .FirstOrDefaultAsync();

            // 4. If the user is on a temp password — reject all other endpoints.
            if (mustChange)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new
                {
                    message = "You must change your temporary password before using the application.",
                    code = "MUST_CHANGE_PASSWORD"
                });
                return;
            }

            // 5. All clear — pass through.
            await _next(context);
        }
    }
}
