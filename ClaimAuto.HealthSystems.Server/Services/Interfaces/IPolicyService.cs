using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IPolicyService
    {
        Task<List<PolicyResponseDto>> GetAllAsync();
        Task<(bool Success, string Error, PolicyResponseDto? Policy)> GetByIdAsync(int id);
        Task<List<PolicyResponseDto>> GetActiveAsync();
        Task<PolicyResponseDto> CreateAsync(CreatePolicyDto dto);
        Task<(bool Success, string Error)> UpdateAsync(int id, UpdatePolicyDto dto);
        Task<(bool Success, string Error)> DeleteAsync(int id);
    }
}