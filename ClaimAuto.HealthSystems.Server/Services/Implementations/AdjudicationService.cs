using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class AdjudicationService : IAdjudicationService
    {
        private readonly IAdjudicationRepository _repo;

        public AdjudicationService(IAdjudicationRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<AdjudicationRecord>> GetAllAsync()
        {
            return await _repo.GetAllWithDetailsAsync();
        }

        public async Task<List<AdjudicationRecord>> GetByClaimIdAsync(int claimId)
        {
            return await _repo.GetByClaimIdAsync(claimId);
        }

        public async Task<(bool Success, string Error, AdjudicationRecord? Record)> AutoAdjudicateAsync(int claimId)
        {
            var claim = await _repo.GetClaimWithDetailsAsync(claimId);
            if (claim == null)
                return (false, $"Claim {claimId} not found.", null);

            // Load active rules
            var rules = await _repo.GetActiveRulesAsync();

            // ── Basic rule engine logic ───────────────────
            var firedRules = new List<string>();
            var decision = AdjDecision.Paid;
            string notes = "";

            // Rule 1: Member must be active
            if (claim.Member.Status != MemberStatus.Active)
            {
                decision = AdjDecision.Denied;
                notes = "Member is not active.";
                firedRules.Add("MemberActiveCheck: FAILED");
            }
            else firedRules.Add("MemberActiveCheck: PASSED");

            // Rule 2: Policy must be active
            if (claim.Member.Policy.Status != PolicyStatus.Active)
            {
                decision = AdjDecision.Denied;
                notes = "Policy is not active.";
                firedRules.Add("PolicyActiveCheck: FAILED");
            }
            else firedRules.Add("PolicyActiveCheck: PASSED");

            // Rule 3: Amount within policy limit
            if (claim.Member.Policy.OutOfPocketMax.HasValue
                && claim.TotalBilledAmount > claim.Member.Policy.OutOfPocketMax)
            {
                decision = AdjDecision.PendingReview;
                notes = "Amount exceeds policy limit. Routed for manual review.";
                firedRules.Add("AmountLimitCheck: EXCEEDED — Pending Review");
            }
            else firedRules.Add("AmountLimitCheck: PASSED");

            // Rule 4: Duplicate claim detection
            bool isDuplicate = await _repo.IsDuplicateClaimAsync(
                claim.MemberID, claim.TotalBilledAmount, claim.ClaimID);

            if (isDuplicate)
            {
                decision = AdjDecision.Denied;
                notes = "Duplicate claim detected within 30 days.";
                firedRules.Add("DuplicateCheck: DUPLICATE FOUND");
            }
            else firedRules.Add("DuplicateCheck: PASSED");

            // ── Create immutable AdjudicationRecord ──────
            var record = new AdjudicationRecord
            {
                ClaimID = claimId,
                ExecutedAt = DateTime.UtcNow,
                EngineVersion = "1.0.0",
                Decision = decision,
                AppliedRulesJSON = System.Text.Json.JsonSerializer.Serialize(firedRules),
                CalculationsJSON = System.Text.Json.JsonSerializer.Serialize(new
                {
                    BilledAmount = claim.TotalBilledAmount,
                    Deductible = claim.Member.Policy.DeductibleAmount,
                    ApprovedAmount = decision == AdjDecision.Paid
                        ? claim.TotalBilledAmount - (claim.Member.Policy.DeductibleAmount ?? 0)
                        : 0
                }),
                Notes = notes,
                PerformedByID = null
            };

            var log = new AuditLog
            {
                UserID = claim.ProviderID,
                Action = "AutoAdjudication",
                ResourceType = "Claim",
                ResourceID = claimId.ToString(),
                DetailsJSON = $"{{\"Decision\":\"{decision}\"}}",
                Timestamp = DateTime.UtcNow
            };

            await _repo.AutoAdjudicateAsync(record, claim, log);
            return (true, "", record);
        }

        public async Task<(bool Success, string Error, AdjudicationRecord? Record)> ManualAdjudicateAsync(AdjudicationRecord record)
        {
            var claim = await _repo.GetClaimWithDetailsAsync(record.ClaimID);
            if (claim == null)
                return (false, $"Claim {record.ClaimID} not found.", null);

            var log = new AuditLog
            {
                UserID = record.PerformedByID ?? 0,
                Action = "ManualAdjudication",
                ResourceType = "Claim",
                ResourceID = record.ClaimID.ToString(),
                DetailsJSON = $"{{\"Decision\":\"{record.Decision}\"}}",
                Timestamp = DateTime.UtcNow
            };

            await _repo.ManualAdjudicateAsync(record, claim, log);
            return (true, "", record);
        }
    }
}