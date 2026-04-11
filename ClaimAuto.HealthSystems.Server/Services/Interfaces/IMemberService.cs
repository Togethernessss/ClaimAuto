using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IMemberService
    {
        Task<List<MemberResponseDto>> GetAllAsync();
        Task<(bool Success, string Error, MemberResponseDto? Member)> GetByIdAsync(int id);
        Task<(bool Success, string Error, EligibilityCheck? Check)> CheckEligibilityAsync(int id);
        Task<(bool Success, string Error, MemberResponseDto? Member)> CreateAsync(CreateMemberDto dto);
        Task<(bool Success, string Error)> UpdateAsync(int id, UpdateMemberDto dto);
    }
}