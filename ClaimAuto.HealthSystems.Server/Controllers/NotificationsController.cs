using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : BaseController
    {
        private readonly INotificationRepository _notificationRepository;

        public NotificationsController(
            INotificationRepository notificationRepository)
        {
            _notificationRepository = notificationRepository;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyNotifications(
            [FromQuery] string? status,
            [FromQuery] string? category)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var response = await _notificationRepository
                .GetMyNotificationsAsync(userId.Value, status, category);

            return Ok(response);
        }

        [HttpGet("unread")]
        public async Task<IActionResult> GetUnreadNotifications()
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var response = await _notificationRepository
                .GetUnreadAsync(userId.Value);

            return Ok(response);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> CreateNotification(
            [FromBody] CreateNotificationDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            if (string.IsNullOrEmpty(dto.Message))
                return BadRequest("Message is required.");

            if (!Enum.TryParse<NotificationCategory>(
                dto.Category, true, out var category))
                return BadRequest(
                    "Invalid category. Use: Exception, Payment, Appeal");

            if (!Enum.TryParse<NotificationSeverity>(
                dto.Severity, true, out var severity))
                return BadRequest(
                    "Invalid severity. Use: Info, Warning, Critical");

            var notification = new Notification
            {
                UserID = dto.UserID,
                ClaimID = dto.ClaimID,
                Message = dto.Message,
                Category = category,
                Severity = severity
            };

            var response = await _notificationRepository
                .CreateAsync(notification);

            return CreatedAtAction(
                nameof(GetMyNotifications),
                new { id = response.NotificationID },
                response);
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var response = await _notificationRepository
                .MarkAsReadAsync(id, userId.Value);

            if (response == null)
                return NotFound($"Notification {id} not found.");

            return Ok(response);
        }

        [HttpPut("{id}/dismiss")]
        public async Task<IActionResult> DismissNotification(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var response = await _notificationRepository
                .DismissAsync(id, userId.Value);

            if (response == null)
                return NotFound($"Notification {id} not found.");

            return Ok(response);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var deleted = await _notificationRepository
                .DeleteAsync(id, userId.Value);

            if (!deleted)
                return NotFound($"Notification {id} not found.");

            return NoContent();
        }
    }
}