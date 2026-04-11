using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface INotificationService
    {
        Task<List<NotificationResponseDto>> GetAllAsync();
        Task<List<NotificationResponseDto>> GetByUserAsync(int userId);
        Task<List<NotificationResponseDto>> GetUnreadByUserAsync(int userId);
        Task<(bool Success, string Error, NotificationResponseDto? Notification)> GetByIdAsync(int id);
        Task<(bool Success, string Error, NotificationResponseDto? Notification)> CreateAsync(CreateNotificationDto dto);
        Task<(bool Success, string Error)> MarkAsReadAsync(int id);
        Task<(bool Success, string Error)> DismissAsync(int id);
        Task<(bool Success, string Error)> DeleteAsync(int id);
    }
}
