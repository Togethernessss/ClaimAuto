using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IAppealRepository
    {
        // userOrgId (Phase 3): when supplied, filters to that organization's appeals.
        Task<List<Appeal>> GetAllAppealsAsync(int userId, string role, int? userOrgId = null);
        Task<Appeal?> GetAppealByIdAsync(int id, int? userOrgId = null);

        // ── SaaS FIX: now accepts userOrgId for tenant scoping ──
        Task<List<Appeal>> GetAppealsByClaimIdAsync(int claimId, int? userOrgId = null);

        Task<Appeal> FileAppealAsync(Appeal appeal);
        Task<Appeal?> DecideAppealAsync(int id, string outcome, int decidedById);
        Task<Appeal?> WithdrawAppealAsync(int id);
        Task UpdateAppealAsync(Appeal appeal);
        Task<Subrogation> CreateSubrogationAsync(Subrogation subrogation);

        // ── SaaS FIX: now accepts userOrgId for tenant scoping ──
        Task<List<Subrogation>> GetSubrogationsAsync(int? userOrgId = null);

        // ── AppealDocuments — individual uploaded files ─────────────────────
        Task SaveAppealDocumentsAsync(int appealId, List<AppealDocument> docs);
        Task<List<AppealDocument>> GetAppealDocumentsAsync(int appealId, int? userOrgId = null);
        Task<AppealDocument?> GetAppealDocumentByIdAsync(int appealId, int docId, int? userOrgId = null);
    }
}