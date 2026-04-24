using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IMemberRepository
    {
       
        Task<List<MemberResponseDto>> GetAllMembersAsync(int? policyId, string? status);//list with optional filters

        Task<MemberResponseDto?> GetMemberByIdAsync(int memberId);//single member detail

        
        Task<EligibilityResponseDto?> CheckEligibilityAsync(int memberId);//caching method

        

        // Check if a MemberNumber already exists (for duplicate detection)
        Task<bool> MemberNumberExistsAsync(string memberNumber);

        
        Task<MemberResponseDto?> CreateMemberAsync(CreateMemberDto dto, int createdByUserId);

        Task<MemberResponseDto?> UpdateMemberAsync(int memberId, UpdateMemberDto dto, int updatedByUserId);
    }
}