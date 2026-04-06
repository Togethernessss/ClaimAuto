# ClaimAuto Health Systems - Project Flow Documentation

## 📋 Project Overview

**ClaimAuto** is an enterprise health insurance claim management system built with ASP.NET Core 8.0 and SQL Server. It automates the entire claim lifecycle from submission through payment, including adjudication, fraud detection, appeals, and reporting.

---

## 🏗️ Architecture Overview

### Technology Stack
- **Backend**: ASP.NET Core 8.0
- **Database**: SQL Server LocalDB / SQL Server
- **ORM**: Entity Framework Core 8.0
- **Frontend**: Vue.js 3 (SPA - Single Page Application)
- **API Style**: RESTful

### Project Structure
```
ClaimAuto.HealthSystems.Server/
├── Controllers/          # API endpoints (PolicyAndMember, Claim, Adjudication, etc.)
├── Model/               # Domain models (Claim, Member, Policy, Payment, etc.)
├── DTOs/                # Data Transfer Objects (for API input/output)
├── Data/                # Entity Framework DbContext
├── Migrations/          # Database migrations
└── Program.cs           # Startup configuration
```

---

## 📊 Core Data Flow

### 1. **User Management Module**
```
User Creation/Authentication
    ↓
Roles: Admin, InsuranceStaff, Policyholder, Hospital
    ↓
Account Status: Active, Inactive
    ↓
Audit Logging (tracks all user actions)
```

### 2. **Policy & Member Module** 
```
CREATE POLICY
    ├── Policy Details (PlanCode, PlanName, DeductibleAmount, OutOfPocketMax)
    ├── Effective Period (EffectiveFrom, EffectiveTo)
    └── Status: Active, Expired, Suspended
    
    ↓
    
ADD MEMBER TO POLICY
    ├── Member Details (Name, DOB, Gender, MemberNumber)
    ├── Coverage Period (CoverageStart, CoverageEnd)
    └── Status: Active, Inactive, Suspended
```

### 3. **Claim Submission Flow**
```
CLAIM SUBMISSION (via Portal, EDI, API, BatchCSV)
    ├── Provider: Hospital/Healthcare Provider
    ├── Member: Insurance Policyholder
    ├── Claim Details:
    │   ├── ClaimType: Inpatient, Outpatient, Pharmacy
    │   ├── TotalBilledAmount (Decimal)
    │   ├── Status: Submitted → Validated → Adjudicated → Rejected/Paid
    │   └── Priority: Normal, High, Urgent
    │
    └── Claim Lines (individual services/items)
        ├── Service/Item Details
        ├── Billed Amount
        ├── Status: Pending → Approved/Denied
        └── Line-level Adjudication
```

### 4. **Claim Validation**
```
VALIDATE CLAIM
    ├── Check Provider exists (Hospital user role)
    ├── Check Member exists and is covered
    ├── Check Policy is Active
    ├── Verify Member has Active coverage
    ├── Validate claim amounts
    └── Extract and validate claim line items
    
    ↓
    
Update Claim Status: Submitted → Validated
```

### 5. **Adjudication Engine Flow**
```
ADJUDICATION PROCESS
    ├── Auto-Adjudication (Rules-based)
    │   ├── Apply Coverage Rules from Policy
    │   ├── Apply Business Rules from Rule Engine
    │   ├── Calculate eligible amounts
    │   └── Decision: Paid, Denied, Partial, PendingReview
    │
    └── Manual Adjudication (InsuranceStaff)
        ├── Review Validation results
        ├── Review Rule calculations
        ├── Override if necessary
        └── Document decisions with notes
    
    ↓
    
Create AdjudicationRecord
    ├── Engine Version used
    ├── Decision made
    ├── Calculations JSON
    ├── Applied Rules JSON
    └── Performed By (User who adjudicated)
    
    ↓
    
Update Claim Status: Validated → Adjudicated
```

### 6. **Payment Processing Flow**
```
PAYMENT EXECUTION
    ├── Create Payment Record
    │   ├── Link to Adjudicated Claim
    │   ├── Payee (Provider/Hospital user)
    │   ├── Amount (from adjudication)
    │   └── PaymentMethod: EFT, ACH, Check
    │
    ├── Payment Status Transition
    │   ├── Pending → Authorized → Executed
    │   └── Or: Failed, OnHold
    │
    └── Generate Remittance (Payment Summary)
        ├── Group payments by Payee
        ├── Create Remittance Record
        ├── Track: Generated → Sent → Acknowledged
        └── Reconcile payments
    
    ↓
    
Update Claim Status: Adjudicated → Paid
```

### 7. **Fraud Detection & Investigation**
```
FRAUD DETECTION
    ├── Calculate FraudScore per Claim
    │   ├── Pattern Analysis
    │   ├── Risk Scoring
    │   └── Threshold-based Alerts
    │
    ├── If Score > Threshold
    │   ├── Create FraudCase
    │   ├── Priority: Low, Medium, High, Critical
    │   ├── Status: Open → UnderInvestigation → Resolved/Escalated
    │   └── Assign Investigator
    │
    └── Investigation Outcome
        ├── Cleared (No fraud detected)
        ├── Confirmed (Fraud found - escalate)
        └── Escalated (High-risk case)
```

### 8. **Appeals & Dispute Resolution**
```
MEMBER APPEAL
    ├── File Appeal on Claim Decision
    │   ├── Appeal Details
    │   ├── Reason for Appeal
    │   └── Supporting Documents
    │
    ├── Appeal Status: Filed → UnderReview → Decided → Withdrawn
    │
    └── Appeal Outcome
        ├── Upheld (Original decision stands)
        ├── Overturned (New payment)
        └── PartiallyUpheld (Partial adjustment)
```

### 9. **Subrogation & Recovery**
```
SUBROGATION PROCESS
    ├── Initiate on eligible claims
    ├── Track recovery from Third Party
    ├── Status: Initiated → InProgress → Recovered → Closed
    └── Record recovered amounts
```

### 10. **Reconciliation Flow**
```
RECONCILIATION
    ├── Compare Payments Executed vs. Remittances Sent
    ├── Identify Discrepancies
    ├── Adjust/Reverse if needed
    └── Generate Reconciliation Records
```

### 11. **Reporting & Analytics**
```
REPORTING
    ├── Operational Reports (Claims processed, avg processing time)
    ├── Regulatory Reports (Compliance, audit trails)
    ├── Financial Reports (Paid amounts, reserves, etc.)
    ├── Fraud Reports (Cases, outcomes, recovered amounts)
    │
    └── KPI Tracking
        ├── Claim approval rate
        ├── Average processing time
        ├── Fraud detection rate
        └── Appeal outcomes
```

---

## 🎯 Key Business Workflows

### **Complete Claim Lifecycle**

```
1. CLAIM SUBMISSION
   ClaimController.SubmitClaim()
   └── DTO: ClaimDto
   └── Create Claim with ClaimLines
   └── Status: Submitted

2. VALIDATION
   ClaimController.ValidateClaim()
   └── Verify all entities (Provider, Member, Policy)
   └── Status: Validated
   
3. ADJUDICATION
   AdjudicationController.ProcessAdjudication()
   └── Apply Rules
   └── Create AdjudicationRecord
   └── Status: Adjudicated
   
4. PAYMENT
   PaymentController.ExecutePayment()
   └── Create Payment Record
   └── Update Payment Status
   └── Generate Remittance
   └── Status: Paid

5. CLOSURE & REPORTING
   ReportsController.GenerateReport()
   └── Aggregate metrics
   └── Track KPIs
```

---

## 📦 API Endpoints Structure

### **Policy & Member Management**
```
POST   /api/policyandmember/policy          → Create Policy
GET    /api/policyandmember/policy/{id}     → Get Policy by ID
GET    /api/policyandmember/policy          → Get All Policies

POST   /api/policyandmember/member          → Create Member
GET    /api/policyandmember/member/{id}     → Get Member by ID
GET    /api/policyandmember/member          → Get All Members
```

### **Claim Management**
```
POST   /api/claim                           → Submit Claim
GET    /api/claim/{id}                      → Get Claim Details
PUT    /api/claim/{id}/validate             → Validate Claim
GET    /api/claim                           → Get All Claims (filtered)
```

### **Adjudication**
```
POST   /api/adjudication/{claimId}          → Process Adjudication
GET    /api/adjudication/{claimId}          → Get Adjudication Record
```

### **Payment Processing**
```
POST   /api/payment                         → Create Payment
POST   /api/payment/{paymentId}/execute     → Execute Payment
GET    /api/payment/{paymentId}             → Get Payment Status
```

### **Other Modules**
```
POST   /api/appeals                         → File Appeal
GET    /api/fraud/{claimId}                 → Get Fraud Score
POST   /api/audit                           → Log Audit Event
GET    /api/reports/{type}                  → Generate Report
POST   /api/tasks                           → Create Task
GET    /api/notifications                   → Get Notifications
```

---

## 🔄 Data Model Relationships

```
User
├── Role (Admin, InsuranceStaff, Policyholder, Hospital)
├── n:1 AuditLog (tracks user actions)
├── 1:n Claim (as Provider)
├── 1:n Payment (as Payee)
└── 1:n AdjudicationRecord (as PerformedBy)

Policy
├── 1:n Member
├── 1:n Claim
├── 1:n EligibilityCheck
└── CoverageRules JSON

Member
├── 1:1 Policy
├── 1:n Claim
├── 1:n EligibilityCheck
└── ContactInfo JSON

Claim
├── 1:1 Member
├── 1:1 Policy
├── 1:1 Provider (User)
├── 1:n ClaimLine
├── 1:n ClaimDocument
├── 1:1 AdjudicationRecord
├── 1:n Payment
├── 1:n FraudScore
└── Status (Submitted → Validated → Adjudicated → Paid)

ClaimLine
├── 1:1 Claim
└── Status (Pending → Approved/Denied)

AdjudicationRecord
├── 1:1 Claim
├── 1:1 PerformedBy (User - nullable for auto-adjudication)
├── Decision (Paid, Denied, Partial, PendingReview)
└── AppliedRules, Calculations JSON

Payment
├── 1:1 Claim
├── 1:1 Payee (User)
├── 1:1 Remittance (optional)
└── Status (Pending → Authorized → Executed)

Rule
├── Type (Coverage, Payment, Validation)
└── Status (Active, Inactive, Draft)

FraudScore
├── 1:1 Claim
├── Score calculation
└── Decision (Cleared, Confirmed, Escalated)

Appeal
├── 1:1 Claim
├── Status (Filed → UnderReview → Decided)
└── Outcome (Upheld, Overturned, PartiallyUpheld)

AuditLog
├── 1:1 User
├── Action logged
├── Timestamp
└── AffectedEntity info
```

---

## 📥 DTO Flow (Request/Response)

### **Input DTOs** (From Frontend)
```
PolicyDto → Create/Update Policy
MemberDto → Create/Update Member
ClaimDto → Submit Claim
ClaimLineDto → Individual claim line items
AdjudicationDto → Adjudication decision
PaymentDto → Create payment
ExecutePaymentDto → Execute/authorize payment
RemittanceDto → Generate remittance
UserDto → User management
```

### **Output** (To Frontend)
```
Full Model entities (with all related data)
↓
Serialized to JSON
↓
Sent as HTTP Response (200 OK, 201 Created, 400 Bad Request, etc.)
```

---

## 🛡️ Validation & Error Handling

### **Enum Validation**
- ClaimType, Status, Priority, Gender → TryParse before use
- Return 400 BadRequest if invalid

### **Entity Existence Checks**
- Verify Provider, Member, Policy exist
- Verify Policy is Active
- Verify Member has Active coverage
- Return 404 NotFound or 400 BadRequest

### **Business Rule Validation**
- Unique constraint: PlanCode, MemberNumber
- Amount validations (non-negative, within policy limits)
- Date range validations (EffectiveFrom < EffectiveTo)

---

## 🚀 Deployment & Environment

### **Configuration**
```
appsettings.json
├── ConnectionStrings.DBConnection
├── Logging configuration
└── AllowedHosts

launchSettings.json
├── Profiles (http, IIS Express)
├── HTTPS endpoints
└── SPA proxy configuration (https://localhost:51832)
```

### **Database**
```
SQL Server LocalDB (Development)
├── Connection: (localdb)\MSSQLLocalDB
├── Database: ClaimAutoDB
└── Migrations applied automatically
```

---

## 📝 Key Design Patterns

1. **Repository Pattern** → DbContext with DbSet entities
2. **DTO Pattern** → Decouple API contracts from models
3. **Enum Usage** → Type-safe status/priority/role management
4. **Nullable Reference Types** → C# 12 non-null safety
5. **Async/Await** → All DB operations are async
6. **Soft Deletes** → Status field instead of hard deletes
7. **Audit Trail** → AuditLog entity tracks all changes
8. **JSON Storage** → Complex data (rules, calculations) as JSON

---

## 🎯 Next Steps

1. **Frontend Integration** - Implement Vue.js SPA with API calls
2. **Authentication/Authorization** - Add JWT/OAuth with role-based access
3. **Rules Engine** - Implement complex adjudication rules
4. **Fraud Detection** - Implement scoring algorithm
5. **Batch Processing** - Handle EDI/CSV claim imports
6. **Notifications** - Email/SMS alerts for claims, appeals, etc.
7. **Reporting** - Build analytics dashboard
8. **Testing** - Unit/Integration tests for critical workflows
9. **API Documentation** - Swagger/OpenAPI documentation
10. **Logging & Monitoring** - Structured logging, error tracking

---

## 📞 API Response Patterns

### **Success Responses**
```json
200 OK - Single object
201 Created - New entity created (with Location header)
200 OK - List of entities
```

### **Error Responses**
```json
400 Bad Request - Invalid input, failed validation
404 Not Found - Entity not found
500 Internal Server Error - Unhandled exception
```

---

**Document Version**: 1.0  
**Last Updated**: 2025  
**Framework**: .NET 8 (C# 12)  
**Database**: SQL Server
