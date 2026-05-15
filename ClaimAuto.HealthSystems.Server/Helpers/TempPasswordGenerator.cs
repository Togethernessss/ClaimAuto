using System.Security.Cryptography;

namespace ClaimAuto.HealthSystems.Server.Helpers
{
    /// <summary>
    /// Generates a cryptographically random temp password that satisfies PasswordPolicy.
    /// Guaranteed to contain ≥1 uppercase, lowercase, digit, special.
    /// </summary>
    public static class TempPasswordGenerator
    {
        private const string Upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";   // no I, O for clarity
        private const string Lower = "abcdefghijkmnpqrstuvwxyz";   // no l, o
        private const string Digits = "23456789";                   // no 0, 1
        private const string Special = "!@#$%^&*";

        public static string Generate(int length = 12)
        {
            if (length < 8) length = 8;

            // Guarantee one of each required class
            var chars = new char[length];
            chars[0] = PickRandom(Upper);
            chars[1] = PickRandom(Lower);
            chars[2] = PickRandom(Digits);
            chars[3] = PickRandom(Special);

            // Fill remaining slots from all classes pooled
            var pool = Upper + Lower + Digits + Special;
            for (int i = 4; i < length; i++)
                chars[i] = PickRandom(pool);

            // Shuffle so the guaranteed chars aren't always at the front
            return Shuffle(chars);
        }

        private static char PickRandom(string pool) =>
            pool[RandomNumberGenerator.GetInt32(pool.Length)];

        private static string Shuffle(char[] chars)
        {
            for (int i = chars.Length - 1; i > 0; i--)
            {
                int j = RandomNumberGenerator.GetInt32(i + 1);
                (chars[i], chars[j]) = (chars[j], chars[i]);
            }
            return new string(chars);
        }
    }
}