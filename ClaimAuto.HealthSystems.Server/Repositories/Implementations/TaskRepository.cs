using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model; 
using Microsoft.EntityFrameworkCore;
using ClaimAuto.HealthSystems.Server.Data;
using System.Runtime.InteropServices;
using System.Reflection.Metadata.Ecma335;
using TaskStatus = ClaimAuto.HealthSystems.Server.Model.TaskStatus;
namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class TaskRepository :ITaskRepository
    {
        private readonly ApplicationDbContext _context;
        public TaskRepository(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task<List<ClaimTasks>> GetAllTasksAsync(int? assignedTo,
    string? status,
    string? priority,
    int? userId,
    string role,
    int? userOrgId = null)
        {
            var query = _context.ClaimTasks.AsQueryable();

            // ── Multi-tenant filter (Phase 3) ────────────────────────────
            if (userOrgId.HasValue)
                query = query.Where(t => t.OrganizationID == userOrgId.Value);

            if (role != "Admin")
            {
                query = query.Where(t => t.AssignedTo == userId);
            }
            if (role != "Admin")
            {
                query = query.Where(t => t.AssignedTo == userId);
            }
            if (assignedTo.HasValue && role == "Admin")
            {
                query = query.Where(t=> t.AssignedTo == assignedTo.Value);
            }
            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<Model.TaskStatus>(status,true,out var parsedstatus))
                query = query.Where(t => t.Status == parsedstatus);   
            }
            if (!string.IsNullOrEmpty(priority))
            {
                if (Enum.TryParse<Model.TaskPriority>(priority,true,out var parsedpriority))
                query = query.Where(t => t.Priority == parsedpriority);
            }
            return await query 
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

        }
        public async Task<List<ClaimTasks>> GetOverdueTasksAsync(int? userOrgId = null)
        {
            var query = _context.ClaimTasks
                .Where(t => t.DueDate < DateTime.UtcNow && t.Status != Model.TaskStatus.Completed);
            if (userOrgId.HasValue)
                query = query.Where(t => t.OrganizationID == userOrgId.Value);
            return await query.ToListAsync();
        }
        public async Task<ClaimTasks> GetTaskByIdAsync(int id, int? userOrgId = null)
        {
            var query = _context.ClaimTasks.Where(t => t.TaskID == id);
            if (userOrgId.HasValue)
                query = query.Where(t => t.OrganizationID == userOrgId.Value);
            return await query.FirstOrDefaultAsync();
        }
        public async Task<ClaimTasks> UpdateTaskAsync(int id, UpdateTaskDto dto)
        {
            var task = await _context.ClaimTasks.FirstOrDefaultAsync(t => t.TaskID == id);
            if (task == null) return null;
            if (dto.Description != null)
            {
                task.Description = dto.Description;
            }
            if (dto.AssignedTo != null)
            {
                task.AssignedTo = dto.AssignedTo.Value;
            }
            if (dto.DueDate != null) { 
             task.DueDate = dto.DueDate.Value;
            }
            if (dto.Priority != null)
            {
                if (Enum.TryParse<TaskPriority>(dto.Priority, true, out var parsedPriority)) { 
                task.Priority = parsedPriority;
            }
            }
            await _context.SaveChangesAsync();  
            return task;
        }
        public async Task<ClaimTasks> CreateTaskAsync(ClaimTasks task)
        {
            _context.ClaimTasks.Add(task);
            await _context.SaveChangesAsync();
            return task;
        }
        public async Task<ClaimTasks> CompleteTaskAsync( int id , int userid) { 
          var task =  _context.ClaimTasks.FirstOrDefault(t =>t.TaskID == id);
            if (task == null) return null;
            task.Status = TaskStatus.Completed;
            task.CompletedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return task;
        }
        public async Task<bool> DeleteTaskAsync (int id)
        {
            var task = _context.ClaimTasks.FirstOrDefault(task => task.TaskID == id);
            if (task == null ) return false;
            _context.ClaimTasks.Remove(task);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
