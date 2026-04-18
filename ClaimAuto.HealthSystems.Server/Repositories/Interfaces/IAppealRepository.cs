using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IAppealRepository
    {
        Task<List<Appeal>> GetAllAppealsAsync(int userId, string role);
        Task<Appeal?> GetAppealByIdAsync(int id);
        Task<List<Appeal>> GetAppealsByClaimIdAsync(int claimId);
        Task<Appeal> FileAppealAsync(Appeal appeal);
        Task<Appeal?> DecideAppealAsync(int id, string outcome, int decidedById);
        Task<Appeal?> WithdrawAppealAsync(int id);
        Task<Subrogation> CreateSubrogationAsync(Subrogation subrogation);
        Task<List<Subrogation>> GetSubrogationsAsync();
    }
}