using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface ITaskRepository
    {
        Task<List<ClaimTasks>> GetAllTasksAsync(
            int? assignedTo,
            string? status,
            string? priority,
            int? userId,
            string role);
        Task<List<ClaimTasks>> GetOverdueTasksAsync();
        Task<ClaimTasks> GetTaskByIdAsync(int taskId);
        Task<ClaimTasks> CreateTaskAsync(ClaimTasks task);
        Task<ClaimTasks> UpdateTaskAsync(int id, UpdateTaskDto dto);
        Task<ClaimTasks> CompleteTaskAsync(int id,int userId);
         Task<bool> DeleteTaskAsync(int id);
    }
}
