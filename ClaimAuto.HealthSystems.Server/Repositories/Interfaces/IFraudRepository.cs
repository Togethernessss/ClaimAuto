using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IFraudRepository
    {
        // ── Fraud Scores ──
        Task<FraudScore?> GetFraudScoreByClaimIdAsync(int claimId);
        Task<FraudScore> ScoreClaimAsync(int claimId);

        // ── Fraud Cases ──
        Task<List<FraudCase>> GetAllFraudCasesAsync(string? status, string? priority);
        Task<FraudCase?> GetFraudCaseByIdAsync(int id);
        Task<FraudCase?> GetFraudCaseByClaimIdAsync(int claimId);
        Task<FraudCase> CreateFraudCaseAsync(FraudCase fraudCase);
        Task<FraudCase> CreateFraudCaseWithNotificationAsync(
            FraudCase fraudCase, Notification notification);
        Task<FraudCase?> ResolveFraudCaseAsync(int id, ResolveFraudCaseDto dto);
    }
}