using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
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

        public async Task<List<NotificationResponseDto>> GetMyNotificationsAsync(
            int userId,
            string? status,
            string? category)
        {
            var query = _context.Notifications
                .Where(n => n.UserID == userId)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<NotificationStatus>(
                    status, true, out var statusEnum))
                {
                    query = query.Where(
                        n => n.Status == statusEnum);
                }
            }

            if (!string.IsNullOrEmpty(category))
            {
                if (Enum.TryParse<NotificationCategory>(
                    category, true, out var categoryEnum))
                {
                    query = query.Where(
                        n => n.Category == categoryEnum);
                }
            }

            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return notifications.Select(MapToDto).ToList();
        }


        public async Task<List<NotificationResponseDto>> GetUnreadAsync(
            int userId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserID == userId
                    && n.Status == NotificationStatus.Unread)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return notifications.Select(MapToDto).ToList();
        }


        public async Task<NotificationResponseDto> CreateAsync(
            Notification notification)
        {
            notification.CreatedAt = DateTime.UtcNow;
            notification.Status = NotificationStatus.Unread;
            notification.ReadAt = null;

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            return MapToDto(notification);
        }

        public async Task<int> MarkAllAsReadAsync(int userId)
        {
            var unread = await _context.Notifications
                .Where(n => n.UserID == userId
                         && n.Status == NotificationStatus.Unread)
                .ToListAsync();

            foreach (var n in unread)
            {
                n.Status = NotificationStatus.Read;
                n.ReadAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return unread.Count;
        }

        public async Task<NotificationResponseDto?> MarkAsReadAsync(
            int id, int userId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n =>
                    n.NotificationID == id
                    && n.UserID == userId);

            if (notification == null)
                return null;

            if (notification.Status == NotificationStatus.Read)
                return MapToDto(notification);

            notification.Status = NotificationStatus.Read;
            notification.ReadAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToDto(notification);
        }

        public async Task<NotificationResponseDto?> DismissAsync(
            int id, int userId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n =>
                    n.NotificationID == id
                    && n.UserID == userId);

            if (notification == null)
                return null;

            if (notification.Status == NotificationStatus.Dismissed)
                return MapToDto(notification);

            notification.Status = NotificationStatus.Dismissed;

            await _context.SaveChangesAsync();

            return MapToDto(notification);
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

        // Private helper method to map Notification model to NotificationResponseDto
        private NotificationResponseDto MapToDto(Notification n)
        {
            return new NotificationResponseDto
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
            };
        }

        public async Task<int> DeleteAllAsync(int userId)
        {
            var all = await _context.Notifications
                .Where(n => n.UserID == userId)
                .ToListAsync();

            _context.Notifications.RemoveRange(all);
            await _context.SaveChangesAsync();
            return all.Count;
        }
    }
}