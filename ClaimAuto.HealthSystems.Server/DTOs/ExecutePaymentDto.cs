namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // Simple DTO just for executing a payment
    // Only needs the bank reference number
    public class ExecutePaymentDto
    {
        public string ReferenceNumber { get; set; } = string.Empty;
        // Bank transaction reference — Example: "BANK-TXN-20250302-9871"
    }
}