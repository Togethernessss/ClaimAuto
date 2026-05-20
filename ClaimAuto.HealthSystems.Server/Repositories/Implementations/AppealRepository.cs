using Microsoft.EntityFrameworkCore;
using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using TaskStatus = ClaimAuto.HealthSystems.Server.Model.TaskStatus;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class AppealRepository : IAppealRepository
    {
        private readonly ApplicationDbContext _context;

        public AppealRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // ── Role-based filtering ──
        public async Task<List<Appeal>> GetAllAppealsAsync(int userId, string role)
        {
            var query = _context.Appeals.AsQueryable();

            var staffRoles = new[] { "Admin", "InsuranceStaff" };
            if (!staffRoles.Contains(role))
            {
                query = query.Where(a => a.FiledBy == userId);
            }

            return await query
                .OrderByDescending(a => a.FiledAt)
                .ToListAsync();
        }

        public async Task<Appeal?> GetAppealByIdAsync(int id)
        {
            return await _context.Appeals
                .Include(a => a.DecisionBy)
                .Include(a => a.FiledByUser)
                .FirstOrDefaultAsync(a => a.AppealID == id);
        }

        public async Task<List<Appeal>> GetAppealsByClaimIdAsync(int claimId)
        {
            return await _context.Appeals
                .Where(a => a.ClaimID == claimId)
                .ToListAsync();
        }

        // ── ACID: Appeal + Task created together ──
        public async Task<Appeal> FileAppealAsync(Appeal appeal)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Step 1 — Save appeal
                _context.Appeals.Add(appeal);
                await _context.SaveChangesAsync();

                // Step 2 — Auto-create Task for staff
                var staffUser = await _context.Users
                    .FirstOrDefaultAsync(u =>
                        (u.Role == UserRole.InsuranceStaff || u.Role == UserRole.Admin)
                        && u.Status == AccountStatus.Active);

                if (staffUser != null)
                {
                    var task = new ClaimTasks
                    {
                        AssignedTo = staffUser.UserID,
                        ClaimID = appeal.ClaimID,
                        Description = $"Review appeal #{appeal.AppealID} for Claim #{appeal.ClaimID}. Reason: {appeal.Reason}",
                        DueDate = DateTime.UtcNow.AddDays(7),
                        Priority = TaskPriority.High,
                        Status = TaskStatus.Pending,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.ClaimTasks.Add(task);
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();
                return appeal;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<Appeal?> DecideAppealAsync(
            int id, string outcome, int decidedById)
        {
            var appeal = await _context.Appeals
                .FirstOrDefaultAsync(a => a.AppealID == id);

            if (appeal == null) return null;

            appeal.Status = AppealStatus.Decided;
            appeal.DecisionAt = DateTime.UtcNow;
            appeal.DecisionByID = decidedById;

            if (Enum.TryParse<AppealOutcome>(outcome, true, out var parsedOutcome))
            {
                appeal.Outcome = parsedOutcome;
            }

            await _context.SaveChangesAsync();
            return appeal;
        }

        public async Task<Appeal?> WithdrawAppealAsync(int id)
        {
            var appeal = await _context.Appeals
                .FirstOrDefaultAsync(a => a.AppealID == id);

            if (appeal == null) return null;

            appeal.Status = AppealStatus.Withdrawn;
            await _context.SaveChangesAsync();
            return appeal;
        }

        public async Task UpdateAppealAsync(Appeal appeal)
        {
            _context.Appeals.Update(appeal);
            await _context.SaveChangesAsync();
        }

        public async Task<Subrogation> CreateSubrogationAsync(Subrogation subrogation)
        {
            _context.Subrogations.Add(subrogation);
            await _context.SaveChangesAsync();
            return subrogation;
        }

        public async Task<List<Subrogation>> GetSubrogationsAsync()
        {
            return await _context.Subrogations
                .OrderByDescending(s => s.InitiatedAt)
                .ToListAsync();
        }
    }
}