using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IAuthRepository
    {
        Task<bool> EmailExistsAsync(string email);
        Task<User?> GetByEmailAsync(string email);
        Task CreateUserWithAuditAsync(User user, AuditLog log);
        Task AddAuditLogAsync(AuditLog log);
    }
}
