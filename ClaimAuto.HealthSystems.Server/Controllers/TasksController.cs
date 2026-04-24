using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using System.Security.Claims;
using TaskStatus = ClaimAuto.HealthSystems.Server.Model.TaskStatus;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/tasks")]
    [Authorize(Roles = "Admin,ClaimsProcessor,FraudAnalyst,PaymentOfficer")]
    public class TasksController : ControllerBase
    {
        private readonly ITaskRepository _taskRepo;
        private readonly IUserRepository _userRepo;
        
        public TasksController(
            ITaskRepository taskRepo,
            IUserRepository userRepo)
        {
            _taskRepo = taskRepo;
            _userRepo = userRepo;
           ;
        }

        // GET /api/tasks
        [HttpGet]
        public async Task<IActionResult> GetAllTasks(
            [FromQuery] int? assignedTo,
            [FromQuery] string? status,
            [FromQuery] string? priority)
        {
            int userId = GetCurrentUserId();
            string role = GetCurrentUserRole();
            var tasks = await _taskRepo.GetAllTasksAsync(
                assignedTo, status, priority, userId, role);

            var response = new List<TaskResponseDto>();
            foreach (var t in tasks)
            {
                var assignedToUser = await _userRepo.GetUserByIdAsync(t.AssignedTo);

                response.Add(new TaskResponseDto
                {
                    TaskID = t.TaskID,
                    AssignedTo = t.AssignedTo,
                    AssignedToName = assignedToUser?.Name ?? "Unknown",
                    ClaimID = t.ClaimID,
                    Description = t.Description,
                    DueDate = t.DueDate,
                    Priority = t.Priority.ToString(),  
                    Status = t.Status.ToString(),        
                    CreatedAt = t.CreatedAt,
                    CompletedAt = t.CompletedAt
                });
            }

            return Ok(response);
        }

        // GET /api/tasks/overdue
        [HttpGet("overdue")]
        public async Task<IActionResult> GetOverdueTasks()
        {
            var overdueTasks = await _taskRepo.GetOverdueTasksAsync();

            var response = new List<TaskResponseDto>();
            foreach (var t in overdueTasks)
            {
                var assignedToUser = await _userRepo.GetUserByIdAsync(t.AssignedTo);

                response.Add(new TaskResponseDto
                {
                    TaskID = t.TaskID,
                    AssignedTo = t.AssignedTo,
                    AssignedToName = assignedToUser?.Name ?? "Unknown",
                    ClaimID = t.ClaimID,
                    Description = t.Description,
                    DueDate = t.DueDate,
                    Priority = t.Priority.ToString(),
                    Status = t.Status.ToString(),
                    CreatedAt = t.CreatedAt,
                    CompletedAt = t.CompletedAt
                });
            }

            return Ok(response);
        }

        // GET /api/tasks/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTaskById(int id)
        {
            var task = await _taskRepo.GetTaskByIdAsync(id);
            if (task == null)
                return NotFound(new { message = $"Task {id} not found." });

            // Ownership check — staff can only view their own tasks
            string role = GetCurrentUserRole();
            if (role != "Admin" && task.AssignedTo != GetCurrentUserId())
                return Forbid();

            var assignedToUser = await _userRepo.GetUserByIdAsync(task.AssignedTo);

            var response = new TaskResponseDto
            {
                TaskID = task.TaskID,
                AssignedTo = task.AssignedTo,
                AssignedToName = assignedToUser?.Name ?? "Unknown",
                ClaimID = task.ClaimID,
                Description = task.Description,
                DueDate = task.DueDate,
                Priority = task.Priority.ToString(),
                Status = task.Status.ToString(),
                CreatedAt = task.CreatedAt,
                CompletedAt = task.CompletedAt
            };

            return Ok(response);
        }

        // POST /api/tasks
        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] CreateTaskDto dto)
        {
            var assignee = await _userRepo.GetUserByIdAsync(dto.AssignedTo);
            if (assignee == null)
                return NotFound(new { message = $"User {dto.AssignedTo} not found." });

            if (!Enum.TryParse<TaskPriority>(dto.Priority, true, out var parsedPriority))
                return BadRequest(new { message = $"Invalid Priority '{dto.Priority}'. Must be one of: {string.Join(", ", Enum.GetNames<TaskPriority>())}" });
           
            var task = new ClaimTasks
            {
                AssignedTo = dto.AssignedTo,
                ClaimID = dto.ClaimID,
                Description = dto.Description,
                DueDate = dto.DueDate,
                Priority = parsedPriority,           
                Status = TaskStatus.Pending,         
                CreatedAt = DateTime.UtcNow          
            };

            var created = await _taskRepo.CreateTaskAsync(task);
            var response = new TaskResponseDto
            {
                TaskID = created.TaskID,
                AssignedTo = created.AssignedTo,
                AssignedToName = assignee.Name,
                ClaimID = created.ClaimID,
                Description = created.Description,
                DueDate = created.DueDate,
                Priority = created.Priority.ToString(),  
                Status = created.Status.ToString(),      
                CreatedAt = created.CreatedAt,
                CompletedAt = null
            };

            return CreatedAtAction(nameof(GetTaskById),
                new { id = created.TaskID }, response);
        }

        // PUT /api/tasks/{id}
        
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(
            int id, [FromBody] UpdateTaskDto dto)
        {
            var task = await _taskRepo.GetTaskByIdAsync(id);
            if (task == null)
                return NotFound(new { message = $"Task {id} not found." });

            if (dto.Priority != null)
            {
                if (!Enum.TryParse<TaskPriority>(dto.Priority, true, out _))
                    return BadRequest(new { message = $"Invalid Priority '{dto.Priority}'. Must be one of: {string.Join(", ", Enum.GetNames<TaskPriority>())}" });
            }
            if (dto.AssignedTo.HasValue)
            {
                var newAssignee = await _userRepo.GetUserByIdAsync(dto.AssignedTo.Value);
                if (newAssignee == null)
                    return NotFound(new { message = $"User {dto.AssignedTo.Value} not found." });
            }

            var updated = await _taskRepo.UpdateTaskAsync(id, dto);

            return Ok(new { message = $"Task {id} updated.", taskId = id });
        }

        // PUT /api/tasks/{id}/complete
        [HttpPut("{id}/complete")]
        public async Task<IActionResult> CompleteTask(int id)
        {
            var task = await _taskRepo.GetTaskByIdAsync(id);
            if (task == null)
                return NotFound(new { message = $"Task {id} not found." });

            if (task.Status == TaskStatus.Completed)
                return BadRequest(new { message = $"Task {id} is already completed." });

            int userId = GetCurrentUserId();
            string role = GetCurrentUserRole();

            if (role != "Admin" && task.AssignedTo != userId)
                return Forbid();

            var completed = await _taskRepo.CompleteTaskAsync(id, userId);
                      
            return Ok(new
            {
                message = $"Task {id} completed.",
                taskId = id,
                status = "Completed",
                completedAt = completed?.CompletedAt
            });
        }

        // DELETE /api/tasks/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            var task = await _taskRepo.GetTaskByIdAsync(id);
            if (task == null)
                return NotFound(new { message = $"Task {id} not found." });

            // Only Pending tasks can be deleted
            if (task.Status != TaskStatus.Pending)
                return BadRequest(new { message = $"Task {id} has status '{task.Status}'. Only Pending tasks can be deleted." });

            await _taskRepo.DeleteTaskAsync(id);           

            return Ok(new { message = $"Task {id} deleted." });
        }

        // ── Helpers ───────────────────────────────────
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("UserID")?.Value;
            return int.Parse(userIdClaim ?? "0");
        }

        private string GetCurrentUserRole()
        {
            return User.FindFirst(ClaimTypes.Role)?.Value
                ?? User.FindFirst("Role")?.Value
                ?? "Unknown";
        }
    }
}