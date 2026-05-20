using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IOrganizationRepository
    {
        /// <summary>Returns all organizations. Public — used by the register page dropdown.</summary>
        Task<List<OrganizationResponseDto>> GetAllAsync();

        /// <summary>Returns one organization by ID. Used to validate registration input.</summary>
        Task<OrganizationResponseDto?> GetByIdAsync(int id);

        /// <summary>Returns true if an organization with this ID exists. Cheap existence check.</summary>
        Task<bool> ExistsAsync(int id);
    }
}