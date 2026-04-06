using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
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
        public async Task<ActionResult<IEnumerable<Notification>>> GetAllNotifications()
        {
            var notifications = await _context.Notifications
                .Include(n => n.Claim)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return Ok(notifications);
        }

        // GET: api/notifications/user/5
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<Notification>>> GetByUser(int userId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserID == userId)
                .Include(n => n.Claim)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return Ok(notifications);
        }

        // GET: api/notifications/user/5/unread
        [HttpGet("user/{userId}/unread")]
        public async Task<ActionResult<IEnumerable<Notification>>> GetUnreadByUser(int userId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserID == userId && n.Status == NotificationStatus.Unread)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return Ok(notifications);
        }

        // GET: api/notifications/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Notification>> GetNotification(int id)
        {
            var notification = await _context.Notifications
                .Include(n => n.User)
                .Include(n => n.Claim)
                .FirstOrDefaultAsync(n => n.NotificationID == id);

            if (notification == null)
                return NotFound($"Notification with ID {id} not found.");

            return Ok(notification);
        }

        // POST: api/notifications
        [HttpPost]
        public async Task<ActionResult<Notification>> CreateNotification(Notification notification)
        {
            notification.CreatedAt = DateTime.UtcNow;
            notification.Status = NotificationStatus.Unread;

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetNotification),
                new { id = notification.NotificationID }, notification);
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
