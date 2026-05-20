using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IAppealRepository
    {
        // userOrgId (Phase 3): when supplied, filters to that organization's appeals.
        Task<List<Appeal>> GetAllAppealsAsync(int userId, string role, int? userOrgId = null);
        Task<Appeal?> GetAppealByIdAsync(int id, int? userOrgId = null);
        Task<List<Appeal>> GetAppealsByClaimIdAsync(int claimId);
        Task<Appeal> FileAppealAsync(Appeal appeal);
        Task<Appeal?> DecideAppealAsync(int id, string outcome, int decidedById);
        Task<Appeal?> WithdrawAppealAsync(int id);
        Task UpdateAppealAsync(Appeal appeal);
        Task<Subrogation> CreateSubrogationAsync(Subrogation subrogation);
        Task<List<Subrogation>> GetSubrogationsAsync();
    }
}