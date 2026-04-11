using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repository.Implementations
{
    public class TaskRepository : ITaskRepository
    {
        private readonly ApplicationDbContext _context;

        public TaskRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Tasks>> GetAllWithDetailsAsync()
        {
            return await _context.Tasks
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .OrderBy(t => t.Priority)
                .ThenBy(t => t.DueDate)
                .ToListAsync();
        }

        public async Task<Tasks?> GetByIdWithDetailsAsync(int id)
        {
            return await _context.Tasks
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .FirstOrDefaultAsync(t => t.TaskID == id);
        }

        public async Task<List<Tasks>> GetByUserWithDetailsAsync(int userId)
        {
            return await _context.Tasks
                .Where(t => t.AssignedTo == userId)
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .OrderBy(t => t.Priority)
                .ThenBy(t => t.DueDate)
                .ToListAsync();
        }

        public async Task<List<Tasks>> GetByStatusWithDetailsAsync(Model.TaskStatus status)
        {
            return await _context.Tasks
                .Where(t => t.Status == status)
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .OrderBy(t => t.Priority)
                .ToListAsync();
        }

        public async Task<List<Tasks>> GetOverdueWithDetailsAsync()
        {
            return await _context.Tasks
                .Where(t => t.DueDate < DateTime.UtcNow
                         && t.Status != Model.TaskStatus.Completed)
                .Include(t => t.AssignedToUser)
                .Include(t => t.Claim)
                .ToListAsync();
        }

        public async Task<Tasks> CreateAsync(Tasks task)
        {
            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();
            return task;
        }

        public async Task LoadAssignedUserAsync(Tasks task)
        {
            await _context.Entry(task).Reference(t => t.AssignedToUser).LoadAsync();
        }

        public async Task<Tasks?> GetByIdAsync(int id)
        {
            return await _context.Tasks.FindAsync(id);
        }

        public async Task UpdateAsync(Tasks task)
        {
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Tasks task)
        {
            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}

