using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly ApplicationDbContext _context;

        public NotificationRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // Filters by status and category if provided
        public async Task<List<Notification>> GetMyNotificationsAsync(
            int userId,
            string? status,
            string? category)
        {

            var query = _context.Notifications
                .Where(n => n.UserID == userId)
                .AsQueryable();

            // Apply status filter if provided
            // e.g. status = "Unread" - only unread notifications
            if (!string.IsNullOrEmpty(status))
            {
                // Parse string "Unread" to enum NotificationStatus.Unread
                if (Enum.TryParse<NotificationStatus>(
                    status, true, out var statusEnum))
                {
                    query = query.Where(
                        n => n.Status == statusEnum);
                }
            }

            // Apply category filter if provided
            // e.g. category = "Payment" - only payment notifications
            if (!string.IsNullOrEmpty(category))
            {
                // Parse string "Payment" to enum NotificationCategory.Payment
                if (Enum.TryParse<NotificationCategory>(
                    category, true, out var categoryEnum))
                {
                    query = query.Where(
                        n => n.Category == categoryEnum);
                }
            }

            // newest notifications appear first
            return await query
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }


        public async Task<List<Notification>> GetUnreadAsync(
            int userId)
        {
            return await _context.Notifications
                .Where(n => n.UserID == userId
                    && n.Status == NotificationStatus.Unread)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }


        // Called by system automatically after claim events
        // or manually by Staff/Admin
        public async Task<Notification> CreateAsync(
            Notification notification)
        {
            // Set server-controlled fields
            // Client never sends these
            notification.CreatedAt = DateTime.UtcNow;
            notification.Status = NotificationStatus.Unread;
            notification.ReadAt = null;


            _context.Notifications.Add(notification);

            await _context.SaveChangesAsync();
            
            return notification;
        }


        public async Task<Notification?> MarkAsReadAsync(
            int id, int userId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n =>
                    n.NotificationID == id
                    && n.UserID == userId);

            if (notification == null)
                return null;

            if (notification.Status == NotificationStatus.Read)
                return notification;

            notification.Status = NotificationStatus.Read;
            notification.ReadAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return notification;
        }

        public async Task<Notification?> DismissAsync(
            int id, int userId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n =>
                    n.NotificationID == id
                    && n.UserID == userId);

            if (notification == null)
                return null;

            if (notification.Status ==
                NotificationStatus.Dismissed)
                return notification;

            notification.Status = NotificationStatus.Dismissed;

            await _context.SaveChangesAsync();

            return notification;
        }

     
        public async Task<bool> DeleteAsync(int id, int userId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n =>
                    n.NotificationID == id
                    && n.UserID == userId);

            if (notification == null)
                return false;

            _context.Notifications.Remove(notification);

            await _context.SaveChangesAsync();

            return true;
        }
    }
}