using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IPolicyRepository
    {
        Task<List<Policy>> GetAllWithMembersAsync();
        Task<Policy?> GetByIdWithMembersAsync(int id);
        Task<List<Policy>> GetActiveWithMembersAsync();
        Task<Policy> CreateAsync(Policy policy);
        Task UpdateAsync(Policy policy);
        Task DeleteAsync(Policy policy);
        Task SaveChangesAsync();
    }
}
