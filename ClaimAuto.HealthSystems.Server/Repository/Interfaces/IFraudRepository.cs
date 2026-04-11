using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IFraudRepository
    {
        Task<List<FraudScore>> GetAllScoresAsync();
        Task<List<FraudCase>> GetOpenCasesAsync();
        Task<Claim?> GetClaimWithLinesAsync(int claimId);
        Task<int> CountRecentProviderClaimsAsync(int providerId, int excludeClaimId);
        Task CreateScoreWithCaseAsync(FraudScore score, FraudCase? fraudCase, Notification? notification);
        Task<FraudCase?> GetCaseByIdAsync(int caseId);
        Task ResolveCaseWithAuditAsync(FraudCase fraudCase, AuditLog log);
    }
}
