using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using OtpNet;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class TotpRepository : ITotpRepository
    {
        private const string ISSUER = "ClaimAuto";// This is the name that will appear in the Authenticator app

        // Generate a random Base32 secret key
        public string GenerateSecretKey()
        {
            var key = KeyGeneration.GenerateRandomKey(20); // 160-bit key
            return Base32Encoding.ToString(key);// Convert to Base32 string for storage and QR code generation
        }

        // Generate the otpauth:// URI that Authenticator apps scan as QR
        public string GenerateQrCodeUri(string secretKey, string userEmail)
        {
            // Format: otpauth://totp/ISSUER:email?secret=KEY&issuer=ISSUER&digits=6&period=30
            var encodedIssuer = Uri.EscapeDataString(ISSUER);// Encode the Issuer to ensure it is URL-safe
            var encodedEmail = Uri.EscapeDataString(userEmail);// Encode the email to ensure it is URL-safe
            return $"otpauth://totp/{encodedIssuer}:{encodedEmail}?secret={secretKey}&issuer={encodedIssuer}&digits=6&period=30"; // This URI can be converted to a QR code for the user to scan with their Authenticator app
        }

        // Verify a 6-digit TOTP code (allows ±1 time step for clock drift)
        public bool VerifyCode(string secretKey, string code)
        {
            var keyBytes = Base32Encoding.ToBytes(secretKey);
            var totp = new Totp(keyBytes, step: 30, totpSize: 6);

            return totp.VerifyTotp(code, out _, new VerificationWindow(previous: 1, future: 1));// This allows for a ±30 second window to account for potential clock drift between the server and the user's device
        }
    }
}
