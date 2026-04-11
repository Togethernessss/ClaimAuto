using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
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
        private readonly ITaskService _service;

        public TasksController(ITaskService service)
        {
            _service = service;
        }

        // GET: api/tasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetAllTasks()
        {
            var tasks = await _service.GetAllAsync();
            return Ok(tasks);
        }

        // GET: api/tasks/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskResponseDto>> GetTask(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Task);
        }

        // GET: api/tasks/user/5
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetTasksByUser(int userId)
        {
            var tasks = await _service.GetByUserAsync(userId);
            return Ok(tasks);
        }

        // GET: api/tasks/status/Pending
        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetTasksByStatus(Model.TaskStatus status)
        {
            var tasks = await _service.GetByStatusAsync(status);
            return Ok(tasks);
        }

        // GET: api/tasks/overdue
        [HttpGet("overdue")]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetOverdueTasks()
        {
            var tasks = await _service.GetOverdueAsync();
            return Ok(tasks);
        }

        // POST: api/tasks
        [HttpPost]
        public async Task<ActionResult<TaskResponseDto>> CreateTask(CreateTaskDto dto)
        {
            var result = await _service.CreateAsync(dto);
            if (!result.Success)
                return BadRequest(result.Error);

            return CreatedAtAction(nameof(GetTask), new { id = result.Task!.TaskID }, result.Task);
        }

        // PUT: api/tasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, UpdateTaskDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);

            if (!result.Success)
            {
                if (result.Error.Contains("not found"))
                    return NotFound(result.Error);
                return BadRequest(result.Error);
            }

            return NoContent();
        }

        // PUT: api/tasks/5/complete
        [HttpPut("{id}/complete")]
        public async Task<IActionResult> CompleteTask(int id)
        {
            var result = await _service.CompleteAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        // DELETE: api/tasks/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }
    }
}

