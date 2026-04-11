using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class MemberService : IMemberService
    {
        private readonly IMemberRepository _repo;

        public MemberService(IMemberRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<MemberResponseDto>> GetAllAsync()
        {
            var members = await _repo.GetAllWithPolicyAsync();
            return members.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, string Error, MemberResponseDto? Member)> GetByIdAsync(int id)
        {
            var member = await _repo.GetByIdWithPolicyAsync(id);
            if (member == null)
                return (false, $"Member with ID {id} not found.", null);

            return (true, "", MapToDto(member));
        }

        public async Task<(bool Success, string Error, EligibilityCheck? Check)> CheckEligibilityAsync(int id)
        {
            var member = await _repo.GetByIdWithPolicyAsync(id);
            if (member == null)
                return (false, $"Member with ID {id} not found.", null);

            var cached = await _repo.GetCachedEligibilityAsync(id);
            if (cached != null)
                return (true, "", cached);

            var check = new EligibilityCheck
            {
                MemberID = member.MemberID,
                PolicyID = member.PolicyID,
                CheckedAt = DateTime.UtcNow,
                Source = "API",
                TTL = 300,
                ResultJSON = System.Text.Json.JsonSerializer.Serialize(new
                {
                    IsEligible = member.Status == MemberStatus.Active,
                    PolicyStatus = member.Policy.Status.ToString(),
                    CoverageStart = member.CoverageStart,
                    CoverageEnd = member.CoverageEnd,
                    DeductibleAmount = member.Policy.DeductibleAmount,
                    OutOfPocketMax = member.Policy.OutOfPocketMax
                })
            };

            await _repo.AddEligibilityCheckAsync(check);
            return (true, "", check);
        }

        public async Task<(bool Success, string Error, MemberResponseDto? Member)> CreateAsync(CreateMemberDto dto)
        {
            if (!Enum.TryParse<GenderType>(dto.Gender, true, out var gender))
                return (false, $"Invalid Gender: {dto.Gender}. Valid: Male, Female, Other", null);

            var member = new Member
            {
                PolicyID = dto.PolicyID,
                Name = dto.Name,
                DOB = dto.DOB,
                Gender = gender,
                MemberNumber = dto.MemberNumber,
                ContactInfoJSON = dto.ContactInfoJSON,
                CoverageStart = dto.CoverageStart,
                CoverageEnd = dto.CoverageEnd,
                Status = MemberStatus.Active
            };

            await _repo.CreateAsync(member);
            await _repo.LoadPolicyAsync(member);

            return (true, "", MapToDto(member));
        }

        public async Task<(bool Success, string Error)> UpdateAsync(int id, UpdateMemberDto dto)
        {
            var member = await _repo.GetByIdWithPolicyAsync(id);
            if (member == null)
                return (false, $"Member with ID {id} not found.");

            if (!Enum.TryParse<MemberStatus>(dto.Status, true, out var status))
                return (false, $"Invalid Status: {dto.Status}. Valid: Active, Inactive, Suspended");

            member.Name = dto.Name;
            member.ContactInfoJSON = dto.ContactInfoJSON;
            member.CoverageEnd = dto.CoverageEnd;
            member.Status = status;

            await _repo.SaveChangesAsync();
            return (true, "");
        }

        private static MemberResponseDto MapToDto(Member m)
        {
            return new MemberResponseDto
            {
                MemberID = m.MemberID,
                PolicyID = m.PolicyID,
                PolicyName = m.Policy?.PlanName ?? "",
                Name = m.Name,
                DOB = m.DOB,
                Gender = m.Gender.ToString(),
                MemberNumber = m.MemberNumber,
                ContactInfoJSON = m.ContactInfoJSON,
                CoverageStart = m.CoverageStart,
                CoverageEnd = m.CoverageEnd,
                Status = m.Status.ToString()
            };
        }
    }
}