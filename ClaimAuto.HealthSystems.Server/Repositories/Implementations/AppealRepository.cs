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

        // ── Role-based + tenant filtering ──
        public async Task<List<Appeal>> GetAllAppealsAsync(int userId, string role, int? userOrgId = null)
        {
            var query = _context.Appeals.AsQueryable();

            if (userOrgId.HasValue)
                query = query.Where(a => a.OrganizationID == userOrgId.Value);

            var staffRoles = new[] { "Admin", "InsuranceStaff" };
            if (!staffRoles.Contains(role))
            {
                query = query.Where(a => a.FiledBy == userId);
            }

            return await query
                .OrderByDescending(a => a.FiledAt)
                .ToListAsync();
        }

        public async Task<Appeal?> GetAppealByIdAsync(int id, int? userOrgId = null)
        {
            var query = _context.Appeals
                .Include(a => a.DecisionBy)
                .AsQueryable();

            if (userOrgId.HasValue)
                query = query.Where(a => a.OrganizationID == userOrgId.Value);

            return await query.FirstOrDefaultAsync(a => a.AppealID == id);
        }

        // ── SaaS FIX: tenant-scoped appeals-by-claim lookup ──
        public async Task<List<Appeal>> GetAppealsByClaimIdAsync(int claimId, int? userOrgId = null)
        {
            var query = _context.Appeals.Where(a => a.ClaimID == claimId);
            if (userOrgId.HasValue)
                query = query.Where(a => a.OrganizationID == userOrgId.Value);
            return await query.ToListAsync();
        }

        // ── ACID: Appeal + Task created together ──
        public async Task<Appeal> FileAppealAsync(Appeal appeal)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Appeals.Add(appeal);
                await _context.SaveChangesAsync();

                // Auto-create Task for staff in the SAME org as the appeal
                var staffUser = await _context.Users
                    .FirstOrDefaultAsync(u =>
                        (u.Role == UserRole.InsuranceStaff || u.Role == UserRole.Admin)
                        && u.Status == AccountStatus.Active
                        && u.OrganizationID == appeal.OrganizationID);    // ← SaaS FIX: org-matched staff

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
                        CreatedAt = DateTime.UtcNow,
                        OrganizationID = appeal.OrganizationID,
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
        // ── SAVE ORIGINAL APPEAL DOCUMENTS ────────────────────────────────────
        public async Task SaveAppealDocumentsAsync(int appealId, List<AppealDocument> documents)
        {
            foreach (var doc in documents)
                doc.AppealID = appealId;

            _context.AppealDocuments.AddRange(documents);
            await _context.SaveChangesAsync();
        }

        // ── GET ALL DOCUMENTS FOR AN APPEAL ──────────────────────────────────
        public async Task<List<AppealDocument>> GetAppealDocumentsAsync(int appealId, int? userOrgId = null)
        {
            var query = _context.AppealDocuments.Where(d => d.AppealID == appealId);
            if (userOrgId.HasValue)
                query = query.Where(d => d.OrganizationID == userOrgId.Value);

            return await query.OrderBy(d => d.UploadedAt).ToListAsync();
        }

        // ── GET ONE DOCUMENT BY ID ───────────────────────────────────────────
        public async Task<AppealDocument?> GetAppealDocumentByIdAsync(int appealId, int documentId, int? userOrgId = null)
        {
            var query = _context.AppealDocuments
                .Where(d => d.DocumentID == documentId && d.AppealID == appealId);

            if (userOrgId.HasValue)
                query = query.Where(d => d.OrganizationID == userOrgId.Value);

            return await query.FirstOrDefaultAsync();
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

        // ── SaaS FIX: tenant-scoped subrogation list ──
        public async Task<List<Subrogation>> GetSubrogationsAsync(int? userOrgId = null)
        {
            var query = _context.Subrogations.AsQueryable();
            if (userOrgId.HasValue)
                query = query.Where(s => s.OrganizationID == userOrgId.Value);
            return await query.ToListAsync();
        }
    }
}