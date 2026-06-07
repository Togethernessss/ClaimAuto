using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Manages user notifications. Each user sees only their own notifications.</summary>
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : BaseController
    {
        private readonly INotificationRepository _notificationRepository;

        public NotificationsController(INotificationRepository notificationRepository)
        {
            _notificationRepository = notificationRepository;
        }

        /// <summary>Returns all notifications for the current user. Optionally filter by status or category.</summary>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetMyNotifications([FromQuery] string? status, [FromQuery] string? category)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var response = await _notificationRepository
                .GetMyNotificationsAsync(userId.Value, status, category);

            return Ok(response);
        }

        /// <summary>Returns only unread notifications for the current user. Used for the bell badge count.</summary>
        [HttpGet("unread")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetUnreadNotifications()
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var response = await _notificationRepository
                .GetUnreadAsync(userId.Value);

            return Ok(response);
        }

        /// <summary>Manually creates a notification for a target user. Admin and Staff only.</summary>
        [HttpPost]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CreateNotification(
            [FromBody] CreateNotificationDto dto)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            if (string.IsNullOrEmpty(dto.Message))
                return BadRequest("Message is required.");

            if (!Enum.TryParse<NotificationCategory>(dto.Category, true, out var category))
                return BadRequest("Invalid category. Use: Exception, Payment, Appeal");

            if (!Enum.TryParse<NotificationSeverity>(dto.Severity, true, out var severity))
                return BadRequest("Invalid severity. Use: Info, Warning, Critical");

            var notification = new Notification
            {
                UserID = dto.UserID,
                ClaimID = dto.ClaimID,
                Message = dto.Message,
                Category = category,
                Severity = severity,
                CreatedAt = DateTime.UtcNow,                                  // ← SaaS FIX (was missing)
                Status = NotificationStatus.Unread,                           // ← SaaS FIX (was missing)
                OrganizationID = GetLoggedInUserOrgId(),                      // ← SaaS FIX
            };

            var response = await _notificationRepository.CreateAsync(notification);

            return CreatedAtAction(
                nameof(GetMyNotifications),
                new { id = response.NotificationID },
                response);
        }

        /// <summary>Marks all of the current user's notifications as Read.</summary>
        [HttpPut("read-all")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var count = await _notificationRepository.MarkAllAsReadAsync(userId.Value);

            return Ok(new { message = $"{count} notification(s) marked as read." });
        }

        /// <summary>Marks a single notification as Read.</summary>
        [HttpPut("{id}/read")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var response = await _notificationRepository.MarkAsReadAsync(id, userId.Value);

            if (response == null)
                return NotFound($"Notification {id} not found.");

            return Ok(response);
        }

        /// <summary>Marks a notification as Dismissed, hiding it from the default notification list.</summary>
        [HttpPut("{id}/dismiss")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DismissNotification(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var response = await _notificationRepository.DismissAsync(id, userId.Value);

            if (response == null)
                return NotFound($"Notification {id} not found.");

            return Ok(response);
        }

        /// <summary>Permanently deletes a single notification.</summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var deleted = await _notificationRepository.DeleteAsync(id, userId.Value);

            if (!deleted)
                return NotFound($"Notification {id} not found.");

            return NoContent();
        }

        /// <summary>Permanently deletes all notifications for the current user.</summary>
        [HttpDelete("all")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> DeleteAll()
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var count = await _notificationRepository.DeleteAllAsync(userId.Value);

            return Ok(new { message = $"{count} notification(s) deleted." });
        }
    }
}