using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

//difference between IEnumerable and IQueryable: IEnumerable is for in-memory collections and does not support deferred execution or database querying, while IQueryable allows for building database queries with deferred execution, making it more efficient for large datasets. In this repository, we use IQueryable to build queries that can be executed against the database, allowing for filtering and other operations to be performed at the database level rather than in memory.
namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // Fetch all users
        // Fetch all users (optionally scoped to an organization)
        public async Task<IEnumerable<User>> GetAllUsersAsync(int? userOrgId = null)
        {
            var query = _context.Users.AsQueryable();// AsQueryable allows us to conditionally add filters before executing the query
            if (userOrgId.HasValue)
                query = query.Where(u => u.OrganizationID == userOrgId.Value);
            return await query.ToListAsync();
        }

        // Fetch one user by ID — returns null if not found
        // Fetch one user by ID — returns null if not found
        public async Task<User?> GetUserByIdAsync(int id, int? userOrgId = null)
        {
            var query = _context.Users.Where(u => u.UserID == id);
            if (userOrgId.HasValue)
                query = query.Where(u => u.OrganizationID == userOrgId.Value);
            return await query.FirstOrDefaultAsync();
        }

        // Fetch users filtered by Role AND only Active ones
        // Fetch users filtered by Role AND only Active ones
        public async Task<IEnumerable<User>> GetUsersByRoleAsync(UserRole role, int? userOrgId = null)
        {
            var query = _context.Users
                .Where(u => u.Role == role && u.Status == AccountStatus.Active);
            if (userOrgId.HasValue)
                query = query.Where(u => u.OrganizationID == userOrgId.Value);
            return await query.ToListAsync();
        }

        // Check if an email is already registered
        public async Task<bool> EmailExistsAsync(string email)
        {
            return await _context.Users.AnyAsync(u => u.Email == email);
        }

        // Create a new user with ACID transaction (User + AuditLog saved together)
        public async Task<User> CreateUserAsync(User user)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                user.CreatedAt = DateTime.UtcNow; 
                user.UpdatedAt = DateTime.UtcNow;

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Write audit log in the same transaction
                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = user.UserID,
                    Action = "CreateUser",
                    ResourceType = "User",
                    ResourceID = user.UserID.ToString(),
                    Timestamp = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            return user;
        }

        // Update mutable fields and save
        public async Task UpdateUserAsync(User user)
        {
            user.UpdatedAt = DateTime.UtcNow;
            _context.Entry(user).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<User>> GetUsersByIdsAsync(IEnumerable<int> ids)
        {
            return await _context.Users
                .Where(u => ids.Contains(u.UserID))
                .ToListAsync();
        }

        // Soft delete — mark as Inactive, never remove from DB
        public async Task<bool> SoftDeleteUserAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            user.Status = AccountStatus.Inactive;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }
    }
}