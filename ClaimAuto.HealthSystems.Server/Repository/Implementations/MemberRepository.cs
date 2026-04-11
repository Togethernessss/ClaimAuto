using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using Microsoft.EntityFrameworkCore; 

namespace ClaimAuto.HealthSystems.Server.Repository.Implementations
{
    public class MemberRepository : IMemberRepository
    {
        private readonly ApplicationDbContext _context;

        public MemberRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Member>> GetAllWithPolicyAsync()
        {
            return await _context.Members
                .Include(m => m.Policy)
                .ToListAsync();
        }

        public async Task<Member?> GetByIdWithPolicyAsync(int id)
        {
            return await _context.Members
                .Include(m => m.Policy)
                .Include(m => m.EligibilityChecks)
                .FirstOrDefaultAsync(m => m.MemberID == id);
        }

        public async Task<EligibilityCheck?> GetCachedEligibilityAsync(int memberId)
        {
            return await _context.EligibilityChecks
                .Where(e => e.MemberID == memberId
                    && e.CheckedAt >= DateTime.UtcNow.AddSeconds(-(e.TTL ?? 0)))
                .OrderByDescending(e => e.CheckedAt)
                .FirstOrDefaultAsync();
        }

        public async Task AddEligibilityCheckAsync(EligibilityCheck check)
        {
            _context.EligibilityChecks.Add(check);
            await _context.SaveChangesAsync();
        }

        public async Task<Member> CreateAsync(Member member)
        {
            _context.Members.Add(member);
            await _context.SaveChangesAsync();
            return member;
        }

        public async Task UpdateAsync(Member member)
        {
            await _context.SaveChangesAsync();
        }

        public async Task LoadPolicyAsync(Member member)
        {
            await _context.Entry(member).Reference(m => m.Policy).LoadAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}