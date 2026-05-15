using ClaimAuto.HealthSystems.Server.DTOs;

namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface IMemberRepository
    {
        // ── READ operations ─────────────────────────────────────────────

        // Used by: GET /api/members
        // Returns all members, with optional filters for PolicyID and Status
        Task<List<MemberResponseDto>> GetAllMembersAsync(int? policyId, string? status);

        // Used by: GET /api/members/{id}
        // Returns one member with PolicyName resolved, or null if not found
        Task<MemberResponseDto?> GetMemberByIdAsync(int memberId);

        // Used by: GET /api/members/{id}/eligibility
        // Checks if member is currently eligible for coverage
        // Uses TTL-based caching — returns cached result if within 300 seconds
        Task<EligibilityResponseDto?> CheckEligibilityAsync(int memberId);

        // ── WRITE operations ────────────────────────────────────────────

        // Check if a MemberNumber already exists (for duplicate detection)
        Task<bool> MemberNumberExistsAsync(string memberNumber);

        // Used by: POST /api/members
        // Creates a new member under a policy
        // Returns null if PolicyID doesn't exist
        Task<MemberResponseDto?> CreateMemberAsync(CreateMemberDto dto, int createdByUserId);

        // Used by: PUT /api/members/{id}
        // Updates only mutable fields — Name, ContactInfoJSON, CoverageEnd, Status
        // DOB, Gender, PolicyID cannot be changed after creation
        // Returns null if member not found
        Task<MemberResponseDto?> UpdateMemberAsync(int memberId, UpdateMemberDto dto, int updatedByUserId);
        Task<object> AutoExpireMembersAsync();
    }
}