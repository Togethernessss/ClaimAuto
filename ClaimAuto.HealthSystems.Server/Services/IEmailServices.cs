namespace ClaimAuto.HealthSystems.Server.Services
{
    public interface IEmailServices
    {
        Task SendInvitationAsync(string toEmail, string toName, string tempPassword, string role);
        Task SendPasswordResetAsync(string toEmail, string toName, string resetLink);
    

    }
}