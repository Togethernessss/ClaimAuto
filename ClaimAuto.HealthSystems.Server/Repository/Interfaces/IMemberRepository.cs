using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IMemberRepository
    {
        Task<List<Member>> GetAllWithPolicyAsync();
        Task<Member?> GetByIdWithPolicyAsync(int id);
        Task<EligibilityCheck?> GetCachedEligibilityAsync(int memberId);
        Task AddEligibilityCheckAsync(EligibilityCheck check);
        Task<Member> CreateAsync(Member member);
        Task UpdateAsync(Member member);
        Task LoadPolicyAsync(Member member);
        Task SaveChangesAsync();
    }
}
