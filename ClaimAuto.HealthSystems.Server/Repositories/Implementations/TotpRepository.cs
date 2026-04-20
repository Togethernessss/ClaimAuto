using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using OtpNet;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class TotpRepository : ITotpRepository
    {
        private const string ISSUER = "ClaimAuto";

        // Generate a random Base32 secret key
        public string GenerateSecretKey()
        {
            var key = KeyGeneration.GenerateRandomKey(20); // 160-bit key
            return Base32Encoding.ToString(key);
        }

        // Generate the otpauth:// URI that Authenticator apps scan as QR
        public string GenerateQrCodeUri(string secretKey, string userEmail)
        {
            // Format: otpauth://totp/ISSUER:email?secret=KEY&issuer=ISSUER&digits=6&period=30
            var encodedIssuer = Uri.EscapeDataString(ISSUER);
            var encodedEmail = Uri.EscapeDataString(userEmail);
            return $"otpauth://totp/{encodedIssuer}:{encodedEmail}?secret={secretKey}&issuer={encodedIssuer}&digits=6&period=30";
        }

        // Verify a 6-digit TOTP code (allows ±1 time step for clock drift)
        public bool VerifyCode(string secretKey, string code)
        {
            var keyBytes = Base32Encoding.ToBytes(secretKey);
            var totp = new Totp(keyBytes, step: 30, totpSize: 6);

            return totp.VerifyTotp(code, out _, new VerificationWindow(previous: 1, future: 1));
        }
    }
}
