using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class OrganizationRepository: IOrganizationRepository
    {
        private readonly ApplicationDbContext _db;

        public OrganizationRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<List<OrganizationResponseDto>> GetAllAsync()
        {
            return await _db.Organizations
                .OrderBy(o => o.Name)
                .Select(o => new OrganizationResponseDto
                {
                    OrganizationID = o.OrganizationID,
                    Name = o.Name,
                    ShortCode = o.ShortCode,
                    Description = o.Description,
                    LogoUrl = o.LogoUrl,
                    BrandColor = o.BrandColor,
                    SupportEmail = o.SupportEmail,
                    SupportPhone = o.SupportPhone,
                })
                .ToListAsync();
        }

        public async Task<OrganizationResponseDto?> GetByIdAsync(int id)
        {
            return await _db.Organizations
                .Where(o => o.OrganizationID == id)
                .Select(o => new OrganizationResponseDto
                {
                    OrganizationID = o.OrganizationID,
                    Name = o.Name,
                    ShortCode = o.ShortCode,
                    Description = o.Description,
                    LogoUrl = o.LogoUrl,
                    BrandColor = o.BrandColor,
                    SupportEmail = o.SupportEmail,
                    SupportPhone = o.SupportPhone,
                })
                .FirstOrDefaultAsync();
        }

        public Task<bool> ExistsAsync(int id) =>
            _db.Organizations.AnyAsync(o => o.OrganizationID == id);
    }
}