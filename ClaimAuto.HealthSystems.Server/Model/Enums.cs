namespace ClaimAuto.HealthSystems.Server.Model
{

    public enum UserRole { Admin, InsuranceStaff, Policyholder, Hospital }
    public enum AccountStatus { Active, Inactive }
    public enum ClaimType { Inpatient, Outpatient, Pharmacy, Emergency }
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
    // Notification taxonomy — see docs/notifications.md or the team handover.
    // Categories are the "what is this about" axis; Severity (below) is the
    // "how urgent" axis. Don't conflate the two.
    //   Payment   — money movement (created, executed, complete)
    //   Appeal    — appeal lifecycle (filed, decided, withdrawn)
    //   Exception — true system errors / process failures only
    //   Claim     — claim lifecycle (submitted, status change, rejected)
    //   Document  — document upload / verification / re-upload requests
    //   Fraud     — fraud alerts and case events
    //   Policy    — policy expiry warnings / status changes
    //   Account   — auth / identity / security events
    //   Member    — enrollment lifecycle (enrolled, status change, profile update)
    public enum NotificationCategory
    {
        Payment,
        Appeal,
        Exception,
        Claim,
        Document,
        Fraud,
        Policy,
        Account,
        Member
    }
    public enum NotificationSeverity { Info, Warning, Critical }
    public enum NotificationStatus { Unread, Read, Dismissed }
    public enum TaskPriority { Low, Medium, High }
    public enum TaskStatus { Pending, InProgress, Completed, Overdue }
    public enum GenderType { Male, Female, Other }
}