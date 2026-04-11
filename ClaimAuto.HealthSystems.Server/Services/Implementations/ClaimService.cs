using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class ClaimService: IClaimService
    {
        private readonly IClaimRepository _repo;

        public ClaimService(IClaimRepository repo)
        {
            _repo = repo;
        }

        // ── Claims ──────────────────────────────────────

        public async Task<List<ClaimResponseDto>> GetAllAsync()
        {
            var claims = await _repo.GetAllAsync();
            return claims.Select(MapToDto).ToList();
        }

        public async Task<ClaimResponseDto?> GetByIdAsync(int id)
        {
            var claim = await _repo.GetByIdDetailedAsync(id);
            return claim == null ? null : MapToDto(claim);
        }

        public async Task<List<ClaimResponseDto>> GetByMemberAsync(int memberId)
        {
            var claims = await _repo.GetByMemberAsync(memberId);
            return claims.Select(MapToDto).ToList();
        }

        public async Task<List<ClaimResponseDto>> GetByStatusAsync(ClaimStatus status)
        {
            var claims = await _repo.GetByStatusAsync(status);
            return claims.Select(MapToDto).ToList();
        }

        public async Task<(bool Success, string Error, ClaimResponseDto? Claim)> SubmitClaimAsync(CreateClaimDto dto, int providerID)
        {
            if (!string.IsNullOrEmpty(dto.ExternalClaimRef))
            {
                if (await _repo.ExternalRefExistsAsync(dto.ExternalClaimRef))
                    return (false, "A claim with this external reference already exists.", null);
            }

            if (!Enum.TryParse<ClaimType>(dto.ClaimType, true, out var claimType))
                return (false, $"Invalid ClaimType: {dto.ClaimType}", null);

            if (!Enum.TryParse<SourceChannel>(dto.SourceChannel, true, out var sourceChannel))
                sourceChannel = SourceChannel.Portal;

            var claim = new Claim
            {
                MemberID = dto.MemberID,
                PolicyID = dto.PolicyID,
                ProviderID = providerID,
                ClaimType = claimType,
                TotalBilledAmount = dto.TotalBilledAmount,
                Currency = dto.Currency,
                SourceChannel = sourceChannel,
                ExternalClaimRef = dto.ExternalClaimRef,
                SubmittedAt = DateTime.UtcNow,
                ReceivedAt = DateTime.UtcNow,
                Status = ClaimStatus.Submitted,
                Priority = ClaimPriority.Normal
            };

            var log = new AuditLog
            {
                UserID = providerID,
                Action = "SubmitClaim",
                ResourceType = "Claim",
                Timestamp = DateTime.UtcNow
            };

            await _repo.CreateClaimWithAuditAsync(claim, log);

            await _repo.LoadMemberAsync(claim);
            await _repo.LoadProviderAsync(claim);

            return (true, "", MapToDto(claim));
        }

        public async Task<(bool Success, string Error)> UpdateStatusAsync(int id, ClaimStatus newStatus)
        {
            var claim = await _repo.GetByIdAsync(id);
            if (claim == null)
                return (false, $"Claim with ID {id} not found.");

            await _repo.UpdateStatusAsync(claim, newStatus);
            return (true, "");
        }

        public async Task<(bool Success, string Error)> DeleteAsync(int id)
        {
            var claim = await _repo.GetByIdAsync(id);
            if (claim == null)
                return (false, $"Claim with ID {id} not found.");

            await _repo.DeleteAsync(claim);
            return (true, "");
        }

        // ── Claim Lines ─────────────────────────────────

        public async Task<(bool Success, string Error, List<ClaimLine>? Lines)> GetLinesAsync(int claimId)
        {
            var claim = await _repo.GetByIdAsync(claimId);
            if (claim == null)
                return (false, $"Claim with ID {claimId} not found.", null);

            var lines = await _repo.GetLinesByClaimAsync(claimId);
            return (true, "", lines);
        }

        public async Task<(bool Success, string Error, ClaimLine? Line)> GetLineAsync(int claimId, int lineId)
        {
            var line = await _repo.GetLineAsync(claimId, lineId);
            if (line == null)
                return (false, $"Line {lineId} not found on Claim {claimId}.", null);

            return (true, "", line);
        }

        public async Task<(bool Success, string Error, ClaimLine? Line)> AddLineAsync(int claimId, ClaimLine line)
        {
            var claim = await _repo.GetByIdAsync(claimId);
            if (claim == null)
                return (false, $"Claim with ID {claimId} not found.", null);

            line.ClaimID = claimId;
            await _repo.AddLineAsync(line);
            return (true, "", line);
        }

        public async Task<(bool Success, string Error)> UpdateLineAsync(int claimId, int lineId, ClaimLine updated)
        {
            var line = await _repo.GetLineAsync(claimId, lineId);
            if (line == null)
                return (false, $"Line {lineId} not found on Claim {claimId}.");

            line.ServiceCode = updated.ServiceCode;
            line.ServiceDate = updated.ServiceDate;
            line.Quantity = updated.Quantity;
            line.UnitPrice = updated.UnitPrice;
            line.LineBilledAmount = updated.LineBilledAmount;
            line.DiagnosisCodesJSON = updated.DiagnosisCodesJSON;
            line.ProcedureCodesJSON = updated.ProcedureCodesJSON;
            line.LineStatus = updated.LineStatus;

            await _repo.SaveChangesAsync();
            return (true, "");
        }

        public async Task<(bool Success, string Error)> DeleteLineAsync(int claimId, int lineId)
        {
            var line = await _repo.GetLineAsync(claimId, lineId);
            if (line == null)
                return (false, $"Line {lineId} not found on Claim {claimId}.");

            await _repo.DeleteLineAsync(line);
            return (true, "");
        }

        // ── Claim Documents ─────────────────────────────

        public async Task<(bool Success, string Error, List<ClaimDocument>? Docs)> GetDocumentsAsync(int claimId)
        {
            var claim = await _repo.GetByIdAsync(claimId);
            if (claim == null)
                return (false, $"Claim with ID {claimId} not found.", null);

            var docs = await _repo.GetDocumentsByClaimAsync(claimId);
            return (true, "", docs);
        }

        public async Task<(bool Success, string Error, ClaimDocument? Doc)> GetDocumentAsync(int claimId, int docId)
        {
            var doc = await _repo.GetDocumentAsync(claimId, docId);
            if (doc == null)
                return (false, $"Document {docId} not found on Claim {claimId}.", null);

            return (true, "", doc);
        }

        public async Task<(bool Success, string Error, ClaimDocument? Doc)> UploadDocumentAsync(int claimId, ClaimDocument doc)
        {
            var claim = await _repo.GetByIdAsync(claimId);
            if (claim == null)
                return (false, $"Claim with ID {claimId} not found.", null);

            doc.ClaimID = claimId;
            doc.UploadedAt = DateTime.UtcNow;
            await _repo.AddDocumentAsync(doc);
            return (true, "", doc);
        }

        public async Task<(bool Success, string Error)> VerifyDocumentAsync(int claimId, int docId, int verifiedByUserId)
        {
            var doc = await _repo.GetDocumentAsync(claimId, docId);
            if (doc == null)
                return (false, $"Document {docId} not found on Claim {claimId}.");

            await _repo.VerifyDocumentAsync(doc, verifiedByUserId);
            return (true, "");
        }

        public async Task<(bool Success, string Error)> DeleteDocumentAsync(int claimId, int docId)
        {
            var doc = await _repo.GetDocumentAsync(claimId, docId);
            if (doc == null)
                return (false, $"Document {docId} not found on Claim {claimId}.");

            await _repo.DeleteDocumentAsync(doc);
            return (true, "");
        }

        // ── Mapper ──────────────────────────────────────

        private static ClaimResponseDto MapToDto(Claim c)
        {
            return new ClaimResponseDto
            {
                ClaimID = c.ClaimID,
                ExternalClaimRef = c.ExternalClaimRef,
                ProviderID = c.ProviderID,
                ProviderName = c.Provider?.Name ?? "",
                MemberID = c.MemberID,
                MemberName = c.Member?.Name ?? "",
                ClaimType = c.ClaimType.ToString(),
                TotalBilledAmount = c.TotalBilledAmount,
                Status = c.Status.ToString(),
                Priority = c.Priority.ToString(),
                SubmittedAt = c.SubmittedAt
            };
        }
    }
}