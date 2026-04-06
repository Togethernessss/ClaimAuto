namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // RemittanceID, GeneratedAt, Status are auto-generated
    public class RemittanceDto
    {
        public int PaymentID { get; set; }
        // The PaymentID this remittance is for

        public string? RemitFileURI { get; set; }
        // Path to EDI 835 file — Example: "s3://remit/REM001_835.edi"
    }
}