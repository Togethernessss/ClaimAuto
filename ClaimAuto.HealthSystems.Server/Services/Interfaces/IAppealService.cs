using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IAppealService
    {
        Task<List<AppealResponseDto>> GetAllAsync();
        Task<(bool Success, string Error, AppealResponseDto? Appeal)> GetByIdAsync(int id);
        Task<(bool Success, string Error, AppealResponseDto? Appeal)> FileAppealAsync(CreateAppealDto dto, int filedByUserId);
        Task<(bool Success, string Error)> DecideAppealAsync(int id, DecideAppealDto dto, int decisionByUserId);

        // Subrogations
        Task<List<Subrogation>> GetAllSubrogationsAsync();
        Task<Subrogation> CreateSubrogationAsync(Subrogation sub);
    }
}