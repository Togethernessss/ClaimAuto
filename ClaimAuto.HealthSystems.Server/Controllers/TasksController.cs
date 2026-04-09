using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/tasks")]
    [Authorize(Roles = "Admin,InsuranceStaff")]
    public class TasksController : ControllerBase
    {
        // GET /api/tasks
        // Returns tasks. Filter by AssignedTo, Status, Priority.
        // Staff sees only their own tasks.
        // Admin sees all tasks.
        [HttpGet]
        public async Task<IActionResult> GetAllTasks(
            [FromQuery] int? assignedTo,
            [FromQuery] string? status,
            [FromQuery] string? priority)
        {
            throw new NotImplementedException();
        }

        // GET /api/tasks/overdue
        // Returns all tasks past their DueDate with Status != Completed.
        // Also auto-marks them as Overdue in the database.
        [HttpGet("overdue")]
        public async Task<IActionResult> GetOverdueTasks() 
        {
            throw new NotImplementedException();
        }

        // GET /api/tasks/{id}
        // Returns single task.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTaskById(int id) 
        {
            throw new NotImplementedException();
        }

        // POST /api/tasks
        // Creates a new task. Status = Pending. CreatedAt by server.
        [HttpPost]
        public async Task<IActionResult> CreateTask(
            [FromBody] CreateTaskDto dto)
        {
            throw new NotImplementedException();
        }

        // PUT /api/tasks/{id}
        // Updates Description, AssignedTo, DueDate, Priority.
        // Status NOT here — only via /complete endpoint.
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id,
            [FromBody] UpdateTaskDto dto)
        {
            throw new NotImplementedException(); 
        }

        // PUT /api/tasks/{id}/complete
        // Marks task as Completed. Stamps CompletedAt.
        // Staff can only complete their own tasks.
        [HttpPut("{id}/complete")]
        public async Task<IActionResult> CompleteTask(int id) 
        {
            throw new NotImplementedException();
        }

        // DELETE /api/tasks/{id}
        // Deletes a task. Only for Pending tasks that haven't started.
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteTask(int id) 
        {
            throw new NotImplementedException();
        }
    }
}
