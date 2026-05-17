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
    /// <summary>Manages user notifications. Each user sees only their own notifications.</summary>
    public class NotificationsController : BaseController
    {
        private readonly INotificationRepository _notificationRepository;

        public NotificationsController(INotificationRepository notificationRepository)
        {
            _notificationRepository = notificationRepository;
        }

        /// <summary>Returns notifications for the currently logged-in user.</summary>
        /// <param name="status">Filter by status (Unread, Read, Dismissed).</param>
        /// <param name="category">Filter by category (Exception, Payment, Appeal).</param>
        /// <response code="200">Returns list of notifications.</response>
        /// <response code="401">Unauthorized.</response>
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


        /// <summary>Returns all unread notifications for the currently logged-in user.</summary>
        /// <response code="200">Returns list of unread notifications.</response>
        /// <response code="401">Unauthorized.</response>
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

        /// <summary>Creates a new notification for a user. Admin and InsuranceStaff only.</summary>
        /// <param name="dto">Notification details including message, category (Exception/Payment/Appeal), and severity (Info/Warning/Critical).</param>
        /// <response code="201">Notification created successfully.</response>
        /// <response code="400">Invalid category, severity, or missing message.</response>
        /// <response code="401">Unauthorized.</response>
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



        /// <summary>Marks all unread notifications as read for the current user.</summary>
        /// <response code="200">Returns count of notifications marked as read.</response>
        /// <response code="401">Unauthorized.</response>
        [HttpPut("read-all")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var count = await _notificationRepository
                .MarkAllAsReadAsync(userId.Value);

            return Ok(new { message = $"{count} notification(s) marked as read." });
        }



        /// <summary>Marks a notification as read.</summary>
        /// <param name="id">The notification ID to mark as read.</param>
        /// <response code="200">Notification marked as read.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="404">Notification not found.</response>
        [HttpPut("{id}/read")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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


        /// <summary>Dismisses a notification.</summary>
        /// <param name="id">The notification ID to dismiss.</param>
        /// <response code="200">Notification dismissed.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="404">Notification not found.</response>
        [HttpPut("{id}/dismiss")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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


        /// <summary>Permanently deletes a notification.</summary>
        /// <param name="id">The notification ID to delete.</param>
        /// <response code="204">Notification deleted successfully.</response>
        /// <response code="401">Unauthorized.</response>
        /// <response code="404">Notification not found.</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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

        /// <summary>Deletes all notifications for the current user.</summary>
        /// <response code="200">Returns count of deleted notifications.</response>
        /// <response code="401">Unauthorized.</response>
        [HttpDelete("all")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> DeleteAll()
        {
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            var count = await _notificationRepository
                .DeleteAllAsync(userId.Value);

            return Ok(new
            {
                message = $"{count} notification(s) deleted."
            });
        }
    }
}