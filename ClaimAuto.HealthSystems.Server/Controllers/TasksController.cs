using ClaimAuto.HealthSystems.Server.Data;
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
        public async Task<ActionResult<IEnumerable<Tasks>>> GetAllTasks()
        {
            var tasks = await _context.Tasks
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .OrderBy(t => t.Priority)
                .ThenBy(t => t.DueDate)
                .ToListAsync();

            return Ok(tasks);
        }

        // GET: api/tasks/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Tasks>> GetTask(int id)
        {
            var task = await _context.Tasks
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .FirstOrDefaultAsync(t => t.TaskID == id);

            if (task == null)
                return NotFound($"Task with ID {id} not found.");

            return Ok(task);
        }

        // GET: api/tasks/user/5
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<Tasks>>> GetTasksByUser(int userId)
        {
            var tasks = await _context.Tasks
                .Where(t => t.AssignedTo == userId)
                .Include(t => t.Claim)
                .OrderBy(t => t.Priority)
                .ThenBy(t => t.DueDate)
                .ToListAsync();

            return Ok(tasks);
        }

        // GET: api/tasks/status/Pending
        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<Tasks>>> GetTasksByStatus(Model.TaskStatus status)
        {
            var tasks = await _context.Tasks
                .Where(t => t.Status == status)
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .OrderBy(t => t.Priority)
                .ToListAsync();

            return Ok(tasks);
        }

        // GET: api/tasks/overdue
        [HttpGet("overdue")]
        public async Task<ActionResult<IEnumerable<Tasks>>> GetOverdueTasks()
        {
            var tasks = await _context.Tasks
                .Where(t => t.DueDate < DateTime.UtcNow
                         && t.Status != Model.TaskStatus.Completed)
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .ToListAsync();

            // Mark them as overdue
            foreach (var task in tasks)
                task.Status = Model.TaskStatus.Overdue;

            await _context.SaveChangesAsync();

            return Ok(tasks);
        }

        // POST: api/tasks
        [HttpPost]
        public async Task<ActionResult<Tasks>> CreateTask(Tasks task)
        {
            task.CreatedAt = DateTime.UtcNow;
            task.Status = Model.TaskStatus.Pending;

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTask), new { id = task.TaskID }, task);
        }

        // PUT: api/tasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, Tasks updated)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
                return NotFound($"Task with ID {id} not found.");

            task.Description = updated.Description;
            task.DueDate = updated.DueDate;
            task.Priority = updated.Priority;
            task.AssignedTo = updated.AssignedTo;

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
