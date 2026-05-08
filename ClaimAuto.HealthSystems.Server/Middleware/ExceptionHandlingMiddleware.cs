using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Middleware
{
    public class ExceptionHandlingMiddleware
    {

        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public ExceptionHandlingMiddleware(
            RequestDelegate next,
            ILogger<ExceptionHandlingMiddleware> logger,
            IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception ex)
        {
            var response = new ErrorResponse
            {
                TraceId = context.TraceIdentifier,
                Timestamp = DateTime.UtcNow
            };

            // ── Map specific exception types to clean responses ───────
            switch (ex)
            {
                case KeyNotFoundException:
                    response.StatusCode = (int)HttpStatusCode.NotFound;
                    response.ErrorCode = "NOT_FOUND";
                    response.Message = ex.Message;
                    break;

                case UnauthorizedAccessException:
                    response.StatusCode = (int)HttpStatusCode.Unauthorized;
                    response.ErrorCode = "UNAUTHORIZED";
                    response.Message = "Authentication required.";
                    break;

                case InvalidOperationException:
                    response.StatusCode = (int)HttpStatusCode.BadRequest;
                    response.ErrorCode = "INVALID_OPERATION";
                    response.Message = ex.Message;
                    break;

                case DbUpdateException:
                    response.StatusCode = (int)HttpStatusCode.Conflict;
                    response.ErrorCode = "DATABASE_CONFLICT";
                    response.Message = "A database constraint was violated.";
                    break;

                default:
                    response.StatusCode = (int)HttpStatusCode.InternalServerError;
                    response.ErrorCode = "INTERNAL_ERROR";
                    response.Message = "An unexpected error occurred. Please contact support.";
                    break;
            }

            // ── Only expose stack-trace details in Development ────────
            if (_env.IsDevelopment())
            {
                response.Details = ex.ToString();
            }

            // ── Log with full structured context ──────────────────────
            _logger.LogError(ex,
                "Unhandled exception. TraceId={TraceId} Path={Path} Method={Method} StatusCode={StatusCode}",
                context.TraceIdentifier,
                context.Request.Path,
                context.Request.Method,
                response.StatusCode);

            // ── Write JSON to response ────────────────────────────────
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = response.StatusCode;

            var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await context.Response.WriteAsync(json);
        }
    }
}
