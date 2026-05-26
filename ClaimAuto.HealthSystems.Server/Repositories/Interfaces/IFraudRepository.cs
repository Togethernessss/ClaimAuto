using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IFraudRepository
    {
        // ── Fraud Scores ──
        // userOrgId (Phase 4): when supplied, returns null if the score's claim isn't in that org.
        Task<FraudScore?> GetFraudScoreByClaimIdAsync(int claimId, int? userOrgId = null);

        // ScoreClaimAsync — runs the 5-factor fraud engine and creates a FraudScore row.
        // userOrgId (Phase 4): when supplied, the new FraudScore row is stamped with this org
        //                     so analytics & reports remain tenant-isolated.
        Task<FraudScore> ScoreClaimAsync(int claimId, int? userOrgId = null);

        // ── Fraud Cases ──
        // userOrgId (Phase 4): when supplied, filters to that organization's fraud cases.
        Task<List<FraudCase>> GetAllFraudCasesAsync(string? status, string? priority, int? userOrgId = null);
        Task<FraudCase?> GetFraudCaseByIdAsync(int id, int? userOrgId = null);
        Task<FraudCase?> GetFraudCaseByClaimIdAsync(int claimId, int? userOrgId = null);
        Task<FraudCase> CreateFraudCaseAsync(FraudCase fraudCase);
        Task<FraudCase> CreateFraudCaseWithNotificationAsync(FraudCase fraudCase, Notification notification);
        Task<FraudCase?> ResolveFraudCaseAsync(int id, ResolveFraudCaseDto dto, int? userOrgId = null);
    }
}