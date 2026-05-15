namespace ClaimAuto.HealthSystems.Server.Helpers
{
    public class PasswordPolicy
    {
        public const int MinLength = 8;
        public const int MaxLength = 128;

        /// <summary>
        /// Validates a password against the policy.
        /// Returns null if the password is valid.
        /// Returns a user-facing error message if it's not.
        /// </summary>
        public static string? Validate(string? password)
        {
            if (string.IsNullOrEmpty(password))
                return "Password is required.";

            if (password.Length < MinLength)
                return $"Password must be at least {MinLength} characters long.";

            if (password.Length > MaxLength)
                return $"Password must be at most {MaxLength} characters long.";

            if (!password.Any(char.IsUpper))
                return "Password must contain at least one uppercase letter (A-Z).";

            if (!password.Any(char.IsLower))
                return "Password must contain at least one lowercase letter (a-z).";

            if (!password.Any(char.IsDigit))
                return "Password must contain at least one digit (0-9).";

            if (!password.Any(c => !char.IsLetterOrDigit(c)))
                return "Password must contain at least one special character (!@#$ etc.).";

            return null; // valid
        }
    }
}