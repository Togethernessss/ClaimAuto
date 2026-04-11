using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface ITaskService
    {
        Task<List<TaskResponseDto>> GetAllAsync();
        Task<(bool Success, string Error, TaskResponseDto? Task)> GetByIdAsync(int id);
        Task<List<TaskResponseDto>> GetByUserAsync(int userId);
        Task<List<TaskResponseDto>> GetByStatusAsync(Model.TaskStatus status);
        Task<List<TaskResponseDto>> GetOverdueAsync();
        Task<(bool Success, string Error, TaskResponseDto? Task)> CreateAsync(CreateTaskDto dto);
        Task<(bool Success, string Error)> UpdateAsync(int id, UpdateTaskDto dto);
        Task<(bool Success, string Error)> CompleteAsync(int id);
        Task<(bool Success, string Error)> DeleteAsync(int id);
    }
}
