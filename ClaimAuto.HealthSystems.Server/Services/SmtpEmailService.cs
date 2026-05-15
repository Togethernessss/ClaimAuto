using MailKit.Security;
using MailKit.Net.Smtp;
using MimeKit;

namespace ClaimAuto.HealthSystems.Server.Services
{
    public class SmtpEmailService : IEmailServices
    {
        private readonly IConfiguration _config;
        private readonly ILogger<SmtpEmailService> _logger;

        public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendInvitationAsync(string toEmail, string toName, string tempPassword, string role)
        {
            var host = _config["Smtp:Host"]!;
            var port = int.Parse(_config["Smtp:Port"]!);
            var user = _config["Smtp:User"]!;
            var pass = _config["Smtp:Pass"]!;
            var fromEmail = _config["Smtp:FromEmail"]!;
            var fromName = _config["Smtp:FromName"] ?? "ClaimAuto";

            var msg = new MimeMessage();
            msg.From.Add(new MailboxAddress(fromName, fromEmail));
            msg.To.Add(new MailboxAddress(toName, toEmail));
            msg.Subject = "You've been invited to ClaimAuto Health Systems";

            msg.Body = new TextPart("html")
            {
                Text = $@"
                  <div style='font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f7f5ff;border-radius:12px;'>
                    <h2 style='color:#5a3ea8;margin-top:0;'>Welcome to ClaimAuto, {toName}!</h2>
                    <p>An administrator has invited you to join ClaimAuto Health Systems as a <b>{role}</b>.</p>
                    <p>Use the credentials below to log in for the first time:</p>
                    <div style='background:#fff;border:1px solid #d8d3f5;border-radius:8px;padding:16px;margin:16px 0;'>
                      <p style='margin:0 0 6px;'><b>Email:</b> {toEmail}</p>
                      <p style='margin:0;'><b>Temporary Password:</b> <code style='background:#eee;padding:2px 6px;border-radius:4px;'>{tempPassword}</code></p>
                    </div>
                    <p style='color:#d9534f;'><b>Important:</b> You will be required to change this password immediately after your first login.</p>
                    <p style='font-size:12px;color:#888;margin-top:32px;'>If you weren't expecting this email, you can safely ignore it.</p>
                  </div>"
            };

            try
            {
                using var smtp = new SmtpClient();
                await smtp.ConnectAsync(host, port, SecureSocketOptions.StartTlsWhenAvailable);
                await smtp.AuthenticateAsync(user, pass);
                await smtp.SendAsync(msg);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation("Invitation email sent to {Email}", toEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send invitation email to {Email}", toEmail);
                throw;   // bubble up so the controller can return 500/return a clear message
            }
        }

        public async Task SendPasswordResetAsync(string toEmail, string toName, string resetLink)
        {
            var host = _config["Smtp:Host"]!;
            var port = int.Parse(_config["Smtp:Port"]!);
            var user = _config["Smtp:User"]!;
            var pass = _config["Smtp:Pass"]!;
            var fromEmail = _config["Smtp:FromEmail"]!;
            var fromName = _config["Smtp:FromName"] ?? "ClaimAuto";

            var msg = new MimeMessage();
            msg.From.Add(new MailboxAddress(fromName, fromEmail));
            msg.To.Add(new MailboxAddress(toName, toEmail));
            msg.Subject = "Reset your ClaimAuto password";

            msg.Body = new TextPart("html")
            {
                Text = $@"
          <div style='font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f7f5ff;border-radius:12px;'>
            <h2 style='color:#5a3ea8;margin-top:0;'>Reset your password</h2>
            <p>Hi {toName},</p>
            <p>We received a request to reset the password on your ClaimAuto account. Click the button below to choose a new password. This link will expire in <b>30 minutes</b> and can be used only once.</p>
            <p style='text-align:center;margin:28px 0;'>
              <a href='{resetLink}'
                 style='background:#5a3ea8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;'>
                Reset password
              </a>
            </p>
            <p style='font-size:13px;color:#555;'>Or paste this URL into your browser:<br/>
              <span style='word-break:break-all;color:#5a3ea8;'>{resetLink}</span>
            </p>
            <p style='color:#d9534f;font-size:13px;'><b>Didn't request this?</b> You can safely ignore this email — your password won't change.</p>
            <p style='font-size:12px;color:#888;margin-top:32px;'>For your security, never share this link with anyone.</p>
          </div>"
            };

            try
            {
                using var smtp = new SmtpClient();
                await smtp.ConnectAsync(host, port, SecureSocketOptions.StartTlsWhenAvailable);
                await smtp.AuthenticateAsync(user, pass);
                await smtp.SendAsync(msg);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation("Password reset email sent to {Email}", toEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", toEmail);
                throw;
            }
        }
    }
}