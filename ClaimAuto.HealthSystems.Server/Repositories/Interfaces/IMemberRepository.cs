using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IMemberRepository
    {
        // Used by: GET /api/members
        // Returns all members, with optional filters for PolicyID and Status.
        // userOrgId (Phase 3): when supplied, restricts to members of that organization.
        Task<List<MemberResponseDto>> GetAllMembersAsync(int? policyId, string? status, int? userOrgId = null);

        // Used by: GET /api/members/{id}
        // Returns one member with PolicyName resolved, or null if not found
        // (also null if userOrgId is supplied and doesn't match the member's org).
        Task<MemberResponseDto?> GetMemberByIdAsync(int memberId, int? userOrgId = null);

        // Used by: GET /api/members/{id}/eligibility
        // Checks if member is currently eligible for coverage
        // Uses TTL-based caching — returns cached result if within 300 seconds
        Task<EligibilityResponseDto?> CheckEligibilityAsync(int memberId, int? userOrgId = null);


        // Used by: POST /api/members
        // Creates a new member under a policy
        // Returns null if PolicyID doesn't exist
        Task<MemberResponseDto?> CreateMemberAsync(CreateMemberDto dto, int createdByUserId, int? userOrgId = null);

        // Used by: PUT /api/members/{id}
        // Updates only mutable fields — Name, ContactInfoJSON, CoverageEnd, Status
        // DOB, Gender, PolicyID cannot be changed after creation
        // Returns null if member not found
        Task<MemberResponseDto?> UpdateMemberAsync(int memberId, UpdateMemberDto dto, int updatedByUserId);

        Task<object> AutoExpireMembersAsync(int? userOrgId = null);

        // Used by: GET /api/members/my
        // Returns the single member record linked to a specific Policyholder user.
        // Returns null if no member is enrolled for this user yet.
        Task<MemberResponseDto?> GetMemberByPolicyholderUserIdAsync(int userId, int? userOrgId = null);
    }
}