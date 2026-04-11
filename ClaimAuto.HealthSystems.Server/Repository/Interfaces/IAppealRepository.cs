using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repository.Interfaces
{
    public interface IAppealRepository
    {
        Task<List<Appeal>> GetAllWithDetailsAsync();
        Task<Appeal?> GetByIdWithDetailsAsync(int id);
        Task<Appeal?> GetByIdAsync(int id);
        Task CreateAppealWithAuditAsync(Appeal appeal, Tasks task, AuditLog log);
        Task DecideAppealWithAuditAsync(Appeal appeal, AuditLog log);
        Task LoadFiledByUserAsync(Appeal appeal);

        // Subrogations
        Task<List<Subrogation>> GetAllSubrogationsAsync();
        Task<Subrogation> CreateSubrogationAsync(Subrogation sub);

        Task SaveChangesAsync();
    }
}
