using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Http;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IAppealPdfRepository
    {
        byte[] CompileDocumentsPdf(
            Appeal appeal,
            string filedByName,
            List<IFormFile> files);
    }
}