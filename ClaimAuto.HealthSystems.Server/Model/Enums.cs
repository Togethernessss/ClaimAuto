namespace ClaimAuto.HealthSystems.Server.Model
{

    public enum UserRole { Admin, InsuranceStaff, Policyholder, Hospital }
    public enum AccountStatus { Active, Inactive }
    public enum ClaimType { Inpatient, Outpatient, Pharmacy, Emergency, Reimbursement }
    public enum ClaimStatus { Submitted, UnderReview, Approved, Rejected, Paid, DocsVerificationPending }
    public enum ClaimPriority { Normal, High, Urgent }
    public enum SourceChannel { Portal, EDI, API, BatchCSV }
    public enum LineStatus { Pending, Approved, Denied }
    public enum DocType { Invoice, MedicalRecord, LabReport, Prescription, DischargeSummary }
    public enum DocStatus { Pending, Verified, Rejected }
    public enum MemberStatus { Active, Inactive, Suspended }
    public enum PolicyStatus { Active, Expired, Suspended }
    public enum RuleStatus { Active, Inactive, Draft }
    // NOTE: "Approved" (formerly "Paid") = adjudication decided to approve for payment.
    // The actual payment status lives in PaymentStatus on the Payment record.
    // Order is preserved so existing integer-ordinal storage stays compatible.
    public enum AdjDecision { Approved, Denied, Partial, PendingReview }
    public enum PaymentMethod { EFT, ACH, Check }
    public enum PaymentStatus { Pending, Authorized, Executed, Failed, OnHold }
    public enum RemittanceStatus { Generated, Sent, Acknowledged }
    public enum FraudCasePriority { Low, Medium, High, Critical }
    public enum FraudCaseStatus { Open, UnderInvestigation, Resolved, Escalated }
    public enum FraudOutcome { Cleared, Confirmed, Escalated }
    public enum AppealStatus { Filed, UnderReview, Decided, Withdrawn }
    public enum AppealOutcome { Upheld, Overturned, PartiallyUpheld }
    public enum SubrogationStatus { Initiated, InProgress, Recovered, Closed }
    public enum ReportScope { Operational, Regulatory, Financial, Fraud }
    public enum NotificationCategory { Exception, Payment, Appeal }
    public enum NotificationSeverity { Info, Warning, Critical }
    public enum NotificationStatus { Unread, Read, Dismissed }
    public enum TaskPriority { Low, Medium, High }
    public enum TaskStatus { Pending, InProgress, Completed, Overdue }
    public enum GenderType { Male, Female, Other }
}