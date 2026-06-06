using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IUserRepository
    {
        // userOrgId (Phase 3): when supplied, restricts to users of that organization.
        Task<IEnumerable<User>> GetAllUsersAsync(int? userOrgId = null);

        // Get one user by their ID
        Task<User?> GetUserByIdAsync(int id, int? userOrgId = null);

        // Get all active users of a specific role (Admin, Hospital, etc.)
        Task<IEnumerable<User>> GetUsersByRoleAsync(UserRole role, int? userOrgId = null);

        // Check if an email already exists (used before creating a user)
        Task<bool> EmailExistsAsync(string email);

        // Save a new user to the database
        Task<User> CreateUserAsync(User user);

        // Update an existing user's details
        Task UpdateUserAsync(User user);

        // Soft delete — sets Status to Inactive instead of removing from DB
        Task<bool> SoftDeleteUserAsync(int id);

        // Batch lookup by IDs — used to avoid N+1 queries
        Task<IEnumerable<User>> GetUsersByIdsAsync(IEnumerable<int> ids);
    }
}