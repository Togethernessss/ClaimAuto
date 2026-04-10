using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public NotificationsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/notifications
        [HttpGet]
        public async Task<ActionResult<IEnumerable<NotificationResponseDto>>> GetAllNotifications()
        {
            var notifications = await _context.Notifications
                .Include(n => n.Claim)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            var response = notifications.Select(n => new NotificationResponseDto
            {
                NotificationID = n.NotificationID,
                UserID = n.UserID,
                ClaimID = n.ClaimID,
                Message = n.Message,
                Category = n.Category.ToString(),
                Severity = n.Severity.ToString(),
                Status = n.Status.ToString(),
                CreatedAt = n.CreatedAt,
                ReadAt = n.ReadAt
            });

            return Ok(response);
        }

        // GET: api/notifications/user/5
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<NotificationResponseDto>>> GetByUser(int userId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserID == userId)
                .Include(n => n.Claim)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            var response = notifications.Select(n => new NotificationResponseDto
            {
                NotificationID = n.NotificationID,
                UserID = n.UserID,
                ClaimID = n.ClaimID,
                Message = n.Message,
                Category = n.Category.ToString(),
                Severity = n.Severity.ToString(),
                Status = n.Status.ToString(),
                CreatedAt = n.CreatedAt,
                ReadAt = n.ReadAt
            });

            return Ok(response);
        }

        // GET: api/notifications/user/5/unread
        [HttpGet("user/{userId}/unread")]
        public async Task<ActionResult<IEnumerable<NotificationResponseDto>>> GetUnreadByUser(int userId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserID == userId && n.Status == NotificationStatus.Unread)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            var response = notifications.Select(n => new NotificationResponseDto
            {
                NotificationID = n.NotificationID,
                UserID = n.UserID,
                ClaimID = n.ClaimID,
                Message = n.Message,
                Category = n.Category.ToString(),
                Severity = n.Severity.ToString(),
                Status = n.Status.ToString(),
                CreatedAt = n.CreatedAt,
                ReadAt = n.ReadAt
            });

            return Ok(response);
        }

        // GET: api/notifications/5
        [HttpGet("{id}")]
        public async Task<ActionResult<NotificationResponseDto>> GetNotification(int id)
        {
            var notification = await _context.Notifications
                .Include(n => n.User)
                .Include(n => n.Claim)
                .FirstOrDefaultAsync(n => n.NotificationID == id);

            if (notification == null)
                return NotFound($"Notification with ID {id} not found.");

            var response = new NotificationResponseDto
            {
                NotificationID = notification.NotificationID,
                UserID = notification.UserID,
                ClaimID = notification.ClaimID,
                Message = notification.Message,
                Category = notification.Category.ToString(),
                Severity = notification.Severity.ToString(),
                Status = notification.Status.ToString(),
                CreatedAt = notification.CreatedAt,
                ReadAt = notification.ReadAt
            };

            return Ok(response);
        }

        // POST: api/notifications
        [HttpPost]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<ActionResult<NotificationResponseDto>> CreateNotification(CreateNotificationDto dto)
        {
            if (!Enum.TryParse<NotificationCategory>(dto.Category, true, out var category))
                return BadRequest($"Invalid Category: {dto.Category}");

            if (!Enum.TryParse<NotificationSeverity>(dto.Severity, true, out var severity))
                return BadRequest($"Invalid Severity: {dto.Severity}");

            var notification = new Notification
            {
                UserID = dto.UserID,
                ClaimID = dto.ClaimID,
                Message = dto.Message,
                Category = category,
                Severity = severity,
                CreatedAt = DateTime.UtcNow,
                Status = NotificationStatus.Unread
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            var response = new NotificationResponseDto
            {
                NotificationID = notification.NotificationID,
                UserID = notification.UserID,
                ClaimID = notification.ClaimID,
                Message = notification.Message,
                Category = notification.Category.ToString(),
                Severity = notification.Severity.ToString(),
                Status = notification.Status.ToString(),
                CreatedAt = notification.CreatedAt,
                ReadAt = notification.ReadAt
            };

            return CreatedAtAction(nameof(GetNotification),
                new { id = notification.NotificationID }, response);
        }

        // PUT: api/notifications/5/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null)
                return NotFound($"Notification with ID {id} not found.");

            notification.Status = NotificationStatus.Read;
            notification.ReadAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PUT: api/notifications/5/dismiss
        [HttpPut("{id}/dismiss")]
        public async Task<IActionResult> Dismiss(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null)
                return NotFound($"Notification with ID {id} not found.");

            notification.Status = NotificationStatus.Dismissed;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/notifications/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null)
                return NotFound($"Notification with ID {id} not found.");

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}