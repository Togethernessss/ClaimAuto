using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<IEnumerable<User>> GetAllUsersAsync();

        // Get one user by their ID
        Task<User?> GetUserByIdAsync(int id);

        // Get all active users of a specific role (Admin, Hospital, etc.)
        Task<IEnumerable<User>> GetUsersByRoleAsync(UserRole role);

        // Check if an email already exists (used before creating a user)
        Task<bool> EmailExistsAsync(string email);

        // Save a new user to the database
        Task<User> CreateUserAsync(User user);

        // Update an existing user's details
        Task UpdateUserAsync(User user);

        // Soft delete — sets Status to Inactive instead of removing from DB
        Task<bool> SoftDeleteUserAsync(int id);
    }
}