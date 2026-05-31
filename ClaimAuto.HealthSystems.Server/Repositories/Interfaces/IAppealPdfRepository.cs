using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Http;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    /// <summary>
    /// Extra metadata used to render a professional, audit-ready appeal PDF.
    /// All fields are optional — the renderer shows "—" when a value is missing
    /// so the PDF still generates cleanly for partial data.
    /// </summary>
    public record AppealPdfContext(
        string  FilerName,                  // "aayush"
        string? FilerRole,                  // "Hospital" / "Policyholder"
        string? ClaimReference,             // "CLM-12" or external ref
        string? MemberName,                 // patient on the policy
        string? ProviderName,               // hospital that filed claim
        string? ClaimTypeDisplay,           // "Inpatient" / "Reimbursement" etc.
        decimal? ClaimAmount,               // billed amount
        string? ClaimStatusDisplay,         // "Rejected"
        string? OrganizationName            // insurer (tenant)
    );

    public interface IAppealPdfRepository
    {
        byte[] CompileDocumentsPdf(
            Appeal appeal,
            AppealPdfContext context,
            List<IFormFile> files);
    }
}