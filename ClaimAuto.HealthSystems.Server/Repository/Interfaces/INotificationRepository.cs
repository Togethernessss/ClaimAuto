using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface INotificationRepository
    {
        Task<List<Notification>> GetAllAsync();
        Task<List<Notification>> GetByUserAsync(int userId);
        Task<List<Notification>> GetUnreadByUserAsync(int userId);
        Task<Notification?> GetByIdWithDetailsAsync(int id);
        Task<Notification?> GetByIdAsync(int id);
        Task<Notification> CreateAsync(Notification notification);
        Task UpdateAsync(Notification notification);
        Task DeleteAsync(Notification notification);
        Task SaveChangesAsync();
    }
}
