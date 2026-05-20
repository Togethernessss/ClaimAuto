using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IReportRepository
    {
        // userOrgId (Phase 3): when supplied, filters to that organization's records.
        Task<List<ReportResponseDto>> GetAllReportsAsync(string? scope, int? userOrgId = null);
        Task<ReportResponseDto?> GetReportByIdAsync(int id, int? userOrgId = null);
        Task<ReportResponseDto> GenerateReportAsync(GenerateReportDto dto, int generatedById, int? userOrgId = null);
        Task<List<KPIResponseDto>> GetAllKPIsAsync(int? userOrgId = null);
        Task<KPIResponseDto?> UpdateKPIAsync(int id, UpdateKPIDto dto);
        Task<List<AuditPackageResponseDto>> GetAllAuditPackagesAsync(int? userOrgId = null);
        Task<AuditPackageResponseDto> GenerateAuditPackageAsync(DateTime periodStart, DateTime periodEnd, int generatedById, int? userOrgId = null);
    }
}