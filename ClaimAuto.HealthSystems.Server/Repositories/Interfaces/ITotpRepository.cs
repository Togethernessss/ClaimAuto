namespace ClaimAuto.HealthSystems.Server.Repositories.Interfaces
{
    public interface ITotpRepository
    {
        string GenerateSecretKey();
        string GenerateQrCodeUri(string secretKey, string userEmail);
        bool VerifyCode(string secretKey, string code);
    }
}
