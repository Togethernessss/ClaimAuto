using Microsoft.EntityFrameworkCore;
using ClaimAuto.HealthSystems.Server.Models;
namespace ClaimAuto.HealthSystems.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
            
        }
    }
}
