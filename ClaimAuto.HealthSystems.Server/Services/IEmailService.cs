namespace ClaimAuto.HealthSystems.Server.Services
{
    public interface IEmailService
    {
        Task SendInvitationAsync(string toEmail, string toName, string tempPassword, string role);
    }
}