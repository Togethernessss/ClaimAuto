using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface INotificationRepository
    {
        Task<List<NotificationResponseDto>> GetMyNotificationsAsync(
            int userId,
            string? status,
            string? category);

        Task<List<NotificationResponseDto>> GetUnreadAsync(int userId);

        Task<NotificationResponseDto> CreateAsync(Notification notification);

        Task<int> MarkAllAsReadAsync(int userId);

        Task<NotificationResponseDto?> MarkAsReadAsync(int id, int userId);

        Task<NotificationResponseDto?> DismissAsync(int id, int userId);

        Task<bool> DeleteAsync(int id, int userId);

        Task<int> DeleteAllAsync(int userId);
    }
}