using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class AppealService : IAppealService
    {
        private readonly IAppealRepository _repo;

        public AppealService(IAppealRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<AppealResponseDto>> GetAllAsync()
        {
            var appeals = await _repo.GetAllWithDetailsAsync();
            return appeals.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, string Error, AppealResponseDto? Appeal)> GetByIdAsync(int id)
        {
            var appeal = await _repo.GetByIdWithDetailsAsync(id);
            if (appeal == null)
                return (false, $"Appeal with ID {id} not found.", null);

            return (true, "", MapToDto(appeal));
        }

        public async Task<(bool Success, string Error, AppealResponseDto? Appeal)> FileAppealAsync(CreateAppealDto dto, int filedByUserId)
        {
            var appeal = new Appeal
            {
                ClaimID = dto.ClaimID,
                FiledBy = filedByUserId,
                Reason = dto.Reason,
                DocumentsJSON = dto.DocumentsJSON,
                FiledAt = DateTime.UtcNow,
                Status = AppealStatus.Filed
            };

            var task = new Tasks
            {
                AssignedTo = 1,
                ClaimID = appeal.ClaimID,
                DueDate = DateTime.UtcNow.AddDays(7),
                Priority = TaskPriority.High,
                CreatedAt = DateTime.UtcNow,
                Status = Model.TaskStatus.Pending
            };

            var log = new AuditLog
            {
                UserID = filedByUserId,
                Action = "FileAppeal",
                ResourceType = "Appeal",
                Timestamp = DateTime.UtcNow
            };

            await _repo.CreateAppealWithAuditAsync(appeal, task, log);
            await _repo.LoadFiledByUserAsync(appeal);

            return (true, "", MapToDto(appeal));
        }

        public async Task<(bool Success, string Error)> DecideAppealAsync(int id, DecideAppealDto dto, int decisionByUserId)
        {
            var appeal = await _repo.GetByIdAsync(id);
            if (appeal == null)
                return (false, $"Appeal with ID {id} not found.");

            if (!Enum.TryParse<AppealOutcome>(dto.Outcome, true, out var outcome))
                return (false, $"Invalid Outcome: {dto.Outcome}. Valid: Upheld, Overturned, PartiallyUpheld");

            appeal.Status = AppealStatus.Decided;
            appeal.Outcome = outcome;
            appeal.DecisionAt = DateTime.UtcNow;
            appeal.DecisionByID = decisionByUserId;

            var log = new AuditLog
            {
                UserID = decisionByUserId,
                Action = "DecideAppeal",
                ResourceType = "Appeal",
                ResourceID = id.ToString(),
                DetailsJSON = $"{{\"Outcome\":\"{dto.Outcome}\"}}",
                Timestamp = DateTime.UtcNow
            };

            await _repo.DecideAppealWithAuditAsync(appeal, log);
            return (true, "");
        }

        public async Task<List<Subrogation>> GetAllSubrogationsAsync()
        {
            return await _repo.GetAllSubrogationsAsync();
        }

        public async Task<Subrogation> CreateSubrogationAsync(Subrogation sub)
        {
            return await _repo.CreateSubrogationAsync(sub);
        }

        private static AppealResponseDto MapToDto(Appeal a)
        {
            return new AppealResponseDto
            {
                AppealID = a.AppealID,
                ClaimID = a.ClaimID,
                FiledBy = a.FiledBy,
                FiledByName = a.FiledByUser?.Name ?? "",
                FiledAt = a.FiledAt,
                Reason = a.Reason,
                Status = a.Status.ToString(),
                Outcome = a.Outcome?.ToString(),
                DecisionAt = a.DecisionAt,
                DecisionByID = a.DecisionByID,
                DecisionByName = a.DecisionBy?.Name
            };
        }
    }
}