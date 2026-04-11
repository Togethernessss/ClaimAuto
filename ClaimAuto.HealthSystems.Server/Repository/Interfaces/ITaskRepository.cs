using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface ITaskRepository
    {
        Task<List<Tasks>> GetAllWithDetailsAsync();
        Task<Tasks?> GetByIdWithDetailsAsync(int id);
        Task<List<Tasks>> GetByUserWithDetailsAsync(int userId);
        Task<List<Tasks>> GetByStatusWithDetailsAsync(Model.TaskStatus status);
        Task<List<Tasks>> GetOverdueWithDetailsAsync();
        Task<Tasks> CreateAsync(Tasks task);
        Task LoadAssignedUserAsync(Tasks task);
        Task<Tasks?> GetByIdAsync(int id);
        Task UpdateAsync(Tasks task);
        Task DeleteAsync(Tasks task);
        Task SaveChangesAsync();
    }
}
