using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface INotificationRepository
    {
        // GET /api/notifications
        // Filters by status and category if provided
        // userId comes from JWT token — never from client
        Task<List<Notification>> GetMyNotificationsAsync(
            int userId,
            string? status,
            string? category);

        // GET /api/notifications/unread
        Task<List<Notification>> GetUnreadAsync(int userId);

        // POST /api/notifications
        // Used by system automatically and by Staff/Admin manually
        Task<Notification> CreateAsync(Notification notification);

        // PUT /api/notifications/{id}/read
        Task<Notification?> MarkAsReadAsync(int id, int userId);

        // PUT /api/notifications/{id}/dismiss
        Task<Notification?> DismissAsync(int id, int userId);

        // DELETE /api/notifications/{id}
        // Hard deletes a notification
        Task<bool> DeleteAsync(int id, int userId);
    }
}
