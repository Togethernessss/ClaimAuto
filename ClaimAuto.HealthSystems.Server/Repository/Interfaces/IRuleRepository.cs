using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IRuleRepository
    {
        Task<List<Rule>> GetAllWithCreatorAsync();
        Task<Rule?> GetByIdWithCreatorAsync(int id);
        Task<List<Rule>> GetActiveWithCreatorAsync();
        Task<List<Rule>> GetByTypeWithCreatorAsync(RuleType ruleType);
        Task CreateRuleWithAuditAsync(Rule rule, AuditLog log);
        Task LoadCreatorAsync(Rule rule);
        Task<Rule?> GetByIdAsync(int id);
        Task UpdateAsync(Rule rule);
        Task DeleteAsync(Rule rule);
        Task SaveChangesAsync();
    }
}
