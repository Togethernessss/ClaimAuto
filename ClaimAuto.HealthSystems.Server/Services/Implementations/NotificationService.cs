using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _repo;

        public NotificationService(INotificationRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<NotificationResponseDto>> GetAllAsync()
        {
            var notifications = await _repo.GetAllAsync();
            return notifications.Select(MapToDto).ToList();
        }

        public async Task<List<NotificationResponseDto>> GetByUserAsync(int userId)
        {
            var notifications = await _repo.GetByUserAsync(userId);
            return notifications.Select(MapToDto).ToList();
        }

        public async Task<List<NotificationResponseDto>> GetUnreadByUserAsync(int userId)
        {
            var notifications = await _repo.GetUnreadByUserAsync(userId);
            return notifications.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, string Error, NotificationResponseDto? Notification)> GetByIdAsync(int id)
        {
            var notification = await _repo.GetByIdWithDetailsAsync(id);
            if (notification == null)
                return (false, $"Notification with ID {id} not found.", null);

            return (true, "", MapToDto(notification));
        }

        public async Task<(bool Success, string Error, NotificationResponseDto? Notification)> CreateAsync(CreateNotificationDto dto)
        {
            if (!Enum.TryParse<NotificationCategory>(dto.Category, true, out var category))
                return (false, $"Invalid Category: {dto.Category}", null);

            if (!Enum.TryParse<NotificationSeverity>(dto.Severity, true, out var severity))
                return (false, $"Invalid Severity: {dto.Severity}", null);

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

            await _repo.CreateAsync(notification);
            return (true, "", MapToDto(notification));
        }

        public async Task<(bool Success, string Error)> MarkAsReadAsync(int id)
        {
            var notification = await _repo.GetByIdAsync(id);
            if (notification == null)
                return (false, $"Notification with ID {id} not found.");

            notification.Status = NotificationStatus.Read;
            notification.ReadAt = DateTime.UtcNow;

            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<(bool Success, string Error)> DismissAsync(int id)
        {
            var notification = await _repo.GetByIdAsync(id);
            if (notification == null)
                return (false, $"Notification with ID {id} not found.");

            notification.Status = NotificationStatus.Dismissed;
            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<(bool Success, string Error)> DeleteAsync(int id)
        {
            var notification = await _repo.GetByIdAsync(id);
            if (notification == null)
                return (false, $"Notification with ID {id} not found.");

            await _repo.DeleteAsync(notification);
            return (true, "");
        }

        private static NotificationResponseDto MapToDto(Notification n)
        {
            return new NotificationResponseDto
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
            };
        }
    }
}