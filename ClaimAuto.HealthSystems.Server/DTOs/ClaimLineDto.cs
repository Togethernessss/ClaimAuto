namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // LineID is auto-generated
    // ClaimID comes from the URL — not needed in body
    public class ClaimLineDto
    {
        public string ServiceCode { get; set; } = string.Empty;
        // CPT code — Example: "99223"

        public DateTime ServiceDate { get; set; }
        // Example: "2025-02-28"

        public int Quantity { get; set; } = 1;
        // Number of units — Example: 2 (for 2 sessions)

        public decimal UnitPrice { get; set; }
        // Price per unit — Example: 3000.00

        public decimal LineBilledAmount { get; set; }
        // Quantity × UnitPrice — Example: 6000.00

        public string? DiagnosisCodesJSON { get; set; }
        // Example: "[\"J18.9\"]"

        public string? ProcedureCodesJSON { get; set; }
        // Example: "[\"94640\"]"
    }
}