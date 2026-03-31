using Microsoft.EntityFrameworkCore;
using ClaimAuto.HealthSystems.Server.Models;
namespace ClaimAuto.HealthSystems.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        { }
        DbSet<ApplicationUser> Users { get; set; }
        DbSet<Claim> Claims { get; set; }
        DbSet<ClaimDocument> ClaimDocuments { get; set; }
        DbSet<ClaimPayment> ClaimPayment { get; set; }
        DbSet<ClaimStatusHistory> ClaimStatusHistories { get; set; }
        DbSet<Dependent> Dependents { get; set; }
        DbSet<Doctor> Doctors { get; set; }
        DbSet<Hospital> Hosptials { get; set; }
        DbSet<Patient> Patients { get; set; }
        DbSet<Policy> Policies { get; set; }
    }
}
