using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using Microsoft.EntityFrameworkCore; 

namespace ClaimAuto.HealthSystems.Server.Repository.Implementations
{
    public class PolicyRepository : IPolicyRepository
    {
        private readonly ApplicationDbContext _context;

        public PolicyRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Policy>> GetAllWithMembersAsync()
        {
            return await _context.Policies
                .Include(p => p.Members)
                .ToListAsync();
        }

        public async Task<Policy?> GetByIdWithMembersAsync(int id)
        {
            return await _context.Policies
                .Include(p => p.Members)
                .FirstOrDefaultAsync(p => p.PolicyID == id);
        }

        public async Task<List<Policy>> GetActiveWithMembersAsync()
        {
            return await _context.Policies
                .Where(p => p.Status == PolicyStatus.Active)
                .Include(p => p.Members)
                .ToListAsync();
        }

        public async Task<Policy> CreateAsync(Policy policy)
        {
            _context.Policies.Add(policy);
            await _context.SaveChangesAsync();
            return policy;
        }

        public async Task UpdateAsync(Policy policy)
        {
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Policy policy)
        {
            _context.Policies.Remove(policy);
            await _context.SaveChangesAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}