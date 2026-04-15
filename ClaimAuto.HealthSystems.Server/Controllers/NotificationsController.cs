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

        // GET /api/notifications
        // Returns only the logged-in user's notifications
        [HttpGet]
        public async Task<IActionResult> GetMyNotifications(
            [FromQuery] string? status,
            [FromQuery] string? category)
        {
            // Get UserID from JWT token
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            // Fetch filtered notifications from DB
            var notifications = await _notificationRepository
                .GetMyNotificationsAsync(
                    userId.Value, status, category);

            // Map model to ResponseDto
            var response = notifications.Select(n =>
                new NotificationResponseDto
                {
                    NotificationID = n.NotificationID,
                    UserID = n.UserID,
                    ClaimID = n.ClaimID,
                    Message = n.Message,
                    Category = n.Category.ToString(),
                    Severity = n.Severity.ToString(),
                    CreatedAt = n.CreatedAt,
                    ReadAt = n.ReadAt,
                    Status = n.Status.ToString()
                }).ToList();

            return Ok(response);
        }

        // GET /api/notifications/unread
        // Returns unread notifications — used for bell icon badge
        [HttpGet("unread")]
        public async Task<IActionResult> GetUnreadNotifications()
        {
            // Get UserID from JWT token
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            // Fetch only unread notifications from DB
            var notifications = await _notificationRepository
                .GetUnreadAsync(userId.Value);

            // Map model to ResponseDto
            var response = notifications.Select(n =>
                new NotificationResponseDto
                {
                    NotificationID = n.NotificationID,
                    UserID = n.UserID,
                    ClaimID = n.ClaimID,
                    Message = n.Message,
                    Category = n.Category.ToString(),
                    Severity = n.Severity.ToString(),
                    CreatedAt = n.CreatedAt,
                    ReadAt = n.ReadAt,
                    Status = n.Status.ToString()
                }).ToList();

            return Ok(response);
        }

        // POST /api/notifications
        // Admin and InsuranceStaff only — creates a notification
        [HttpPost]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> CreateNotification(
            [FromBody] CreateNotificationDto dto)
        {
            // Get UserID from JWT token
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            // Validate required fields
            if (string.IsNullOrEmpty(dto.Message))
                return BadRequest("Message is required.");

            // Parse Category string to enum
            if (!Enum.TryParse<NotificationCategory>(
                dto.Category, true, out var category))
                return BadRequest(
                    "Invalid category. Use: Exception, Payment, Appeal");

            // Parse Severity string to enum
            if (!Enum.TryParse<NotificationSeverity>(
                dto.Severity, true, out var severity))
                return BadRequest(
                    "Invalid severity. Use: Info, Warning, Critical");

            // Build model from DTO
            // CreatedAt, Status, ReadAt set by repository
            var notification = new Notification
            {
                UserID = dto.UserID,
                ClaimID = dto.ClaimID,
                Message = dto.Message,
                Category = category,
                Severity = severity
            };

            // Save to DB
            var created = await _notificationRepository
                .CreateAsync(notification);

            // Map to ResponseDto
            var response = new NotificationResponseDto
            {
                NotificationID = created.NotificationID,
                UserID = created.UserID,
                ClaimID = created.ClaimID,
                Message = created.Message,
                Category = created.Category.ToString(),
                Severity = created.Severity.ToString(),
                CreatedAt = created.CreatedAt,
                ReadAt = created.ReadAt,
                Status = created.Status.ToString()
            };

            // Return 201 Created
            return CreatedAtAction(
                nameof(GetMyNotifications),
                new { id = created.NotificationID },
                response);
        }

        // PUT /api/notifications/{id}/read
        // Marks notification as Read — stamps ReadAt timestamp
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            // Get UserID from JWT token
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            // Repository checks ownership — only own notifications
            var notification = await _notificationRepository
                .MarkAsReadAsync(id, userId.Value);

            // Null means not found or belongs to different user
            if (notification == null)
                return NotFound($"Notification {id} not found.");

            // Map to ResponseDto
            var response = new NotificationResponseDto
            {
                NotificationID = notification.NotificationID,
                UserID = notification.UserID,
                ClaimID = notification.ClaimID,
                Message = notification.Message,
                Category = notification.Category.ToString(),
                Severity = notification.Severity.ToString(),
                CreatedAt = notification.CreatedAt,
                ReadAt = notification.ReadAt,
                Status = notification.Status.ToString()
            };

            return Ok(response);
        }

        // PUT /api/notifications/{id}/dismiss
        // Marks notification as Dismissed
        [HttpPut("{id}/dismiss")]
        public async Task<IActionResult> DismissNotification(int id)
        {
            // Get UserID from JWT token
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            // Repository checks ownership — only own notifications
            var notification = await _notificationRepository
                .DismissAsync(id, userId.Value);

            // Null means not found or belongs to different user
            if (notification == null)
                return NotFound($"Notification {id} not found.");

            // Map to ResponseDto
            var response = new NotificationResponseDto
            {
                NotificationID = notification.NotificationID,
                UserID = notification.UserID,
                ClaimID = notification.ClaimID,
                Message = notification.Message,
                Category = notification.Category.ToString(),
                Severity = notification.Severity.ToString(),
                CreatedAt = notification.CreatedAt,
                ReadAt = notification.ReadAt,
                Status = notification.Status.ToString()
            };

            return Ok(response);
        }

        // DELETE /api/notifications/{id}
        // Hard deletes a notification — own notifications only
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            // Get UserID from JWT token
            var userId = GetLoggedInUserId();
            if (userId == null)
                return Unauthorized("Invalid token.");

            // Repository checks ownership — returns false if not found
            var deleted = await _notificationRepository
                .DeleteAsync(id, userId.Value);

            // False means not found or belongs to different user
            if (!deleted)
                return NotFound($"Notification {id} not found.");

            // 204 No Content — standard response for successful DELETE
            return NoContent();
        }
    }
}