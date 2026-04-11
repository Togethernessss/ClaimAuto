using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IUserRepository
    {
        Task<List<User>> GetAllAsync();
        Task<User?> GetByIdAsync(int id);
        Task<List<User>> GetByRoleAsync(UserRole role);
        Task<bool> EmailExistsAsync(string email);
        Task CreateUserWithAuditAsync(User user, AuditLog log);
        Task UpdateAsync(User user);
        Task SaveChangesAsync();
    }
}
