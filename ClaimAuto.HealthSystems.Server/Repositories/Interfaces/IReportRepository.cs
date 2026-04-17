using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IReportRepository
    {
        Task<List<ReportResponseDto>> GetAllReportsAsync(string? scope);

        Task<ReportResponseDto?> GetReportByIdAsync(int id);

        Task<ReportResponseDto> GenerateReportAsync(
            GenerateReportDto dto,
            int generatedById);

        Task<List<KPIResponseDto>> GetAllKPIsAsync();

        Task<KPIResponseDto?> UpdateKPIAsync(
            int id,
            UpdateKPIDto dto);

        Task<List<AuditPackageResponseDto>> GetAllAuditPackagesAsync();

        Task<AuditPackageResponseDto> GenerateAuditPackageAsync(
            DateTime periodStart,
            DateTime periodEnd,
            int generatedById);
    }
}