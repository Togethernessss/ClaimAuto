using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,InsuranceStaff")]  // ← Only Admin & Staff manage tasks
    public class TasksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TasksController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/tasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetAllTasks()
        {
            var tasks = await _context.Tasks
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .OrderBy(t => t.Priority)
                .ThenBy(t => t.DueDate)
                .ToListAsync();

            var response = tasks.Select(t => new TaskResponseDto
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
            });

            return Ok(response);
        }

        // GET: api/tasks/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskResponseDto>> GetTask(int id)
        {
            var task = await _context.Tasks
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .FirstOrDefaultAsync(t => t.TaskID == id);

            if (task == null)
                return NotFound($"Task with ID {id} not found.");

            var response = new TaskResponseDto
            {
                TaskID = task.TaskID,
                AssignedTo = task.AssignedTo,
                AssignedToName = task.AssignedToUser?.Name ?? "",
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

        // GET: api/tasks/user/5
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetTasksByUser(int userId)
        {
            var tasks = await _context.Tasks
                .Where(t => t.AssignedTo == userId)
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .OrderBy(t => t.Priority)
                .ThenBy(t => t.DueDate)
                .ToListAsync();

            var response = tasks.Select(t => new TaskResponseDto
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
            });

            return Ok(response);
        }

        // GET: api/tasks/status/Pending
        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetTasksByStatus(Model.TaskStatus status)
        {
            var tasks = await _context.Tasks
                .Where(t => t.Status == status)
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .OrderBy(t => t.Priority)
                .ToListAsync();

            var response = tasks.Select(t => new TaskResponseDto
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
            });

            return Ok(response);
        }

        // GET: api/tasks/overdue
        [HttpGet("overdue")]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetOverdueTasks()
        {
            var tasks = await _context.Tasks
                .Where(t => t.DueDate < DateTime.UtcNow
                         && t.Status != Model.TaskStatus.Completed)
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .ToListAsync();

            foreach (var task in tasks)
                task.Status = Model.TaskStatus.Overdue;

            await _context.SaveChangesAsync();

            var response = tasks.Select(t => new TaskResponseDto
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
            });

            return Ok(response);
        }

        // POST: api/tasks
        [HttpPost]
        public async Task<ActionResult<TaskResponseDto>> CreateTask(CreateTaskDto dto)
        {
            if (!Enum.TryParse<TaskPriority>(dto.Priority, true, out var priority))
                return BadRequest($"Invalid Priority: {dto.Priority}. Valid: Low, Medium, High");

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

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            await _context.Entry(task).Reference(t => t.AssignedToUser).LoadAsync();

            var response = new TaskResponseDto
            {
                TaskID = task.TaskID,
                AssignedTo = task.AssignedTo,
                AssignedToName = task.AssignedToUser?.Name ?? "",
                ClaimID = task.ClaimID,
                Description = task.Description,
                DueDate = task.DueDate,
                Priority = task.Priority.ToString(),
                Status = task.Status.ToString(),
                CreatedAt = task.CreatedAt,
                CompletedAt = task.CompletedAt
            };

            return CreatedAtAction(nameof(GetTask), new { id = task.TaskID }, response);
        }

        // PUT: api/tasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, UpdateTaskDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
                return NotFound($"Task with ID {id} not found.");

            if (!Enum.TryParse<TaskPriority>(dto.Priority, true, out var priority))
                return BadRequest($"Invalid Priority: {dto.Priority}. Valid: Low, Medium, High");

            task.Description = dto.Description;
            task.DueDate = dto.DueDate;
            task.Priority = priority;
            task.AssignedTo = dto.AssignedTo;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PUT: api/tasks/5/complete
        [HttpPut("{id}/complete")]
        public async Task<IActionResult> CompleteTask(int id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
                return NotFound($"Task with ID {id} not found.");

            task.Status = Model.TaskStatus.Completed;
            task.CompletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/tasks/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
                return NotFound($"Task with ID {id} not found.");

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}

