using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IFraudService
    {
        Task<List<FraudScore>> GetAllScoresAsync();
        Task<List<FraudCase>> GetOpenCasesAsync();
        Task<(bool Success, string Error, FraudScore? Score)> ScoreClaimAsync(int claimId);
        Task<(bool Success, string Error)> ResolveCaseAsync(int caseId, FraudCase update);
    }
}