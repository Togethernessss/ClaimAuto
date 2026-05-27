using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.Services.Interfaces
{
    public interface IAuditPackagePdfService
    {
        byte[] GenerateAuditPackagePdf(
            AuditPackage package,
            AuditPackageData data);
    }

    // ── Data carrier for all 9 sections ──────────────────────────
    public class AuditPackageData
    {
        public string OrganizationName { get; set; } = string.Empty;
        public string GeneratedByName { get; set; } = string.Empty;

        // Section 2 — Claims
        public int TotalClaims { get; set; }
        public int ClaimsSubmitted { get; set; }
        public int ClaimsUnderReview { get; set; }
        public int ClaimsValidated { get; set; }
        public int ClaimsAdjudicated { get; set; }
        public int ClaimsApproved { get; set; }
        public int ClaimsPaid { get; set; }
        public int ClaimsRejected { get; set; }

        // Section 3 — Payments
        public int TotalPayments { get; set; }
        public int ExecutedPayments { get; set; }
        public int PendingPayments { get; set; }
        public int OnHoldPayments { get; set; }
        public decimal TotalAmountPaid { get; set; }

        // Section 4 — Adjudication
        public int TotalAdjudications { get; set; }
        public int AutoAdjudicated { get; set; }
        public int ManualAdjudicated { get; set; }
        public int AdjApproved { get; set; }
        public int AdjDenied { get; set; }
        public double DenialRate { get; set; }

        // Section 5 — Remittance
        public int TotalRemittances { get; set; }
        public int RemittancesSent { get; set; }
        public int RemittancesAcknowledged { get; set; }
        public int RemittancesPending { get; set; }

        // Section 6 — Fraud
        public int TotalScored { get; set; }
        public int HighRisk { get; set; }
        public int CasesOpened { get; set; }
        public int CasesResolved { get; set; }
        public double FraudRate { get; set; }

        // Section 7 — Audit Activity
        public int TotalLogs { get; set; }
        public int PaymentLogs { get; set; }
        public int ClaimLogs { get; set; }
        public int ReportLogs { get; set; }
        public int RemittanceLogs { get; set; }
        public int ReconciliationLogs { get; set; }
        public int OtherLogs { get; set; }

        // Section 8 — Reports
        public List<ReportSummaryItem> Reports { get; set; }
            = new();

        // Section 9 — KPIs
        public List<KPISummaryItem> KPIs { get; set; }
            = new();
    }

    public class ReportSummaryItem
    {
        public int ReportID { get; set; }
        public string Scope { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }
        public string GeneratedBy { get; set; } = string.Empty;
    }

    public class KPISummaryItem
    {
        public string Name { get; set; } = string.Empty;
        public string Target { get; set; } = string.Empty;
        public string CurrentValue { get; set; } = string.Empty;
        public bool OnTarget { get; set; }
    }
}