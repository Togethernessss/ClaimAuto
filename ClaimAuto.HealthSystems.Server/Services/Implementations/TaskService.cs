using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class TaskService : ITaskService
    {
        private readonly ITaskRepository _repo;

        public TaskService(ITaskRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<TaskResponseDto>> GetAllAsync()
        {
            var tasks = await _repo.GetAllWithDetailsAsync();
            return tasks.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, string Error, TaskResponseDto? Task)> GetByIdAsync(int id)
        {
            var task = await _repo.GetByIdWithDetailsAsync(id);
            if (task == null)
                return (false, $"Task with ID {id} not found.", null);

            return (true, "", MapToDto(task));
        }

        public async Task<List<TaskResponseDto>> GetByUserAsync(int userId)
        {
            var tasks = await _repo.GetByUserWithDetailsAsync(userId);
            return tasks.Select(MapToDto).ToList();
        }

        public async Task<List<TaskResponseDto>> GetByStatusAsync(Model.TaskStatus status)
        {
            var tasks = await _repo.GetByStatusWithDetailsAsync(status);
            return tasks.Select(MapToDto).ToList();
        }

        public async Task<List<TaskResponseDto>> GetOverdueAsync()
        {
            var tasks = await _repo.GetOverdueWithDetailsAsync();

            // Mark overdue
            foreach (var task in tasks)
                task.Status = Model.TaskStatus.Overdue;

            await _repo.SaveChangesAsync();

            return tasks.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, string Error, TaskResponseDto? Task)> CreateAsync(CreateTaskDto dto)
        {
            if (!Enum.TryParse<TaskPriority>(dto.Priority, true, out var priority))
                return (false, $"Invalid Priority: {dto.Priority}. Valid: Low, Medium, High", null);

            var task = new Tasks
            {
                AssignedTo = dto.AssignedTo,
                ClaimID = dto.ClaimID,
                Description = dto.Description,
                DueDate = dto.DueDate,
                Priority = priority,
                CreatedAt = DateTime.UtcNow,
                Status = Model.TaskStatus.Pending
            };

            await _repo.CreateAsync(task);
            await _repo.LoadAssignedUserAsync(task);

            return (true, "", MapToDto(task));
        }

        public async Task<(bool Success, string Error)> UpdateAsync(int id, UpdateTaskDto dto)
        {
            var task = await _repo.GetByIdAsync(id);
            if (task == null)
                return (false, $"Task with ID {id} not found.");

            if (!Enum.TryParse<TaskPriority>(dto.Priority, true, out var priority))
                return (false, $"Invalid Priority: {dto.Priority}. Valid: Low, Medium, High");

            task.Description = dto.Description;
            task.DueDate = dto.DueDate;
            task.Priority = priority;
            task.AssignedTo = dto.AssignedTo;

            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<(bool Success, string Error)> CompleteAsync(int id)
        {
            var task = await _repo.GetByIdAsync(id);
            if (task == null)
                return (false, $"Task with ID {id} not found.");

            task.Status = Model.TaskStatus.Completed;
            task.CompletedAt = DateTime.UtcNow;

            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<(bool Success, string Error)> DeleteAsync(int id)
        {
            var task = await _repo.GetByIdAsync(id);
            if (task == null)
                return (false, $"Task with ID {id} not found.");

            await _repo.DeleteAsync(task);
            return (true, "");
        }

        private static TaskResponseDto MapToDto(Tasks t)
        {
            return new TaskResponseDto
            {
                TaskID = t.TaskID,
                AssignedTo = t.AssignedTo,
                AssignedToName = t.AssignedToUser?.Name ?? "",
                ClaimID = t.ClaimID,
                Description = t.Description,
                DueDate = t.DueDate,
                Priority = t.Priority.ToString(),
                Status = t.Status.ToString(),
                CreatedAt = t.CreatedAt,
                CompletedAt = t.CompletedAt
            };
        }
    }
}