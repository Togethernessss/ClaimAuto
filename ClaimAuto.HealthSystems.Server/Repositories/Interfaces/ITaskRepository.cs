using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface ITaskRepository
    {
        // userOrgId (Phase 3): when supplied, filters to that organization's tasks.
        Task<List<ClaimTasks>> GetAllTasksAsync(
            int? assignedTo,
            string? status,
            string? priority,
            int? userId,
            string role,
            int? userOrgId = null);
        Task<List<ClaimTasks>> GetOverdueTasksAsync(int? userOrgId = null);
        Task<ClaimTasks> GetTaskByIdAsync(int taskId, int? userOrgId = null);
        Task<ClaimTasks> CreateTaskAsync(ClaimTasks task);
        Task<ClaimTasks> UpdateTaskAsync(int id, UpdateTaskDto dto);
        Task<ClaimTasks> CompleteTaskAsync(int id, int userId);
        Task<bool> DeleteTaskAsync(int id);
    }
}