using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class DatabaseCreated : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Claims_Providers_PolicyId",
                table: "Claims");

            migrationBuilder.DropForeignKey(
                name: "FK_Claims_Users_UserId",
                table: "Claims");

            migrationBuilder.DropTable(
                name: "AutomationRules");

            migrationBuilder.DropTable(
                name: "ClaimPolicies");

            migrationBuilder.DropTable(
                name: "Providers");

            migrationBuilder.DropTable(
                name: "UserPolicies");

            migrationBuilder.DropIndex(
                name: "IX_Claims_UserId",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "CoPayPercentage",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "CoverageLimit",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "Deductible",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "ApprovedAmount",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "TotalAmount",
                table: "Claims");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "Users",
                newName: "UserID");

            migrationBuilder.RenameColumn(
                name: "UserRole",
                table: "Users",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "FullName",
                table: "Users",
                newName: "Role");

            migrationBuilder.RenameColumn(
                name: "PolicyId",
                table: "Policies",
                newName: "PolicyID");

            migrationBuilder.RenameColumn(
                name: "PolicyName",
                table: "Policies",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "ProviderId",
                table: "Claims",
                newName: "ProviderID");

            migrationBuilder.RenameColumn(
                name: "PolicyId",
                table: "Claims",
                newName: "PolicyID");

            migrationBuilder.RenameColumn(
                name: "ClaimId",
                table: "Claims",
                newName: "ClaimID");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "Claims",
                newName: "MemberID");

            migrationBuilder.RenameColumn(
                name: "SubmissionDate",
                table: "Claims",
                newName: "SubmittedAt");

            migrationBuilder.RenameColumn(
                name: "Remarks",
                table: "Claims",
                newName: "SourceChannel");

            migrationBuilder.RenameColumn(
                name: "ClamStatus",
                table: "Claims",
                newName: "Priority");

            migrationBuilder.RenameIndex(
                name: "IX_Claims_PolicyId",
                table: "Claims",
                newName: "IX_Claims_PolicyID");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Users",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MFAEnabled",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Users",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Users",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "CoverageRulesJSON",
                table: "Policies",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DeductibleAmount",
                table: "Policies",
                type: "decimal(12,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveFrom",
                table: "Policies",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveTo",
                table: "Policies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OutOfPocketMax",
                table: "Policies",
                type: "decimal(12,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlanCode",
                table: "Policies",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlanName",
                table: "Policies",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ClaimType",
                table: "Claims",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Claims",
                type: "nvarchar(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExternalClaimRef",
                table: "Claims",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReceivedAt",
                table: "Claims",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Claims",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "TotalBilledAmount",
                table: "Claims",
                type: "decimal(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "AdjudicationRecords",
                columns: table => new
                {
                    AdjID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClaimID = table.Column<int>(type: "int", nullable: false),
                    ExecutedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EngineVersion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Decision = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CalculationsJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AppliedRulesJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PerformedByID = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdjudicationRecords", x => x.AdjID);
                    table.ForeignKey(
                        name: "FK_AdjudicationRecords_Claims_ClaimID",
                        column: x => x.ClaimID,
                        principalTable: "Claims",
                        principalColumn: "ClaimID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AdjudicationRecords_Users_PerformedByID",
                        column: x => x.PerformedByID,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Appeals",
                columns: table => new
                {
                    AppealID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClaimID = table.Column<int>(type: "int", nullable: false),
                    FiledBy = table.Column<int>(type: "int", nullable: false),
                    FiledAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DocumentsJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DecisionAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DecisionByID = table.Column<int>(type: "int", nullable: true),
                    Outcome = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appeals", x => x.AppealID);
                    table.ForeignKey(
                        name: "FK_Appeals_Claims_ClaimID",
                        column: x => x.ClaimID,
                        principalTable: "Claims",
                        principalColumn: "ClaimID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Appeals_Users_DecisionByID",
                        column: x => x.DecisionByID,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Appeals_Users_FiledBy",
                        column: x => x.FiledBy,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    AuditID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserID = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ResourceType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ResourceID = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DetailsJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.AuditID);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Users_UserID",
                        column: x => x.UserID,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuditPackages",
                columns: table => new
                {
                    PackageID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PeriodStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ContentsJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PackageURI = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditPackages", x => x.PackageID);
                });

            migrationBuilder.CreateTable(
                name: "ClaimDocuments",
                columns: table => new
                {
                    DocID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClaimID = table.Column<int>(type: "int", nullable: false),
                    UploadedBy = table.Column<int>(type: "int", nullable: false),
                    DocType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileURI = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SHA256 = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OCRTextURI = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VerifiedByID = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClaimDocuments", x => x.DocID);
                    table.ForeignKey(
                        name: "FK_ClaimDocuments_Claims_ClaimID",
                        column: x => x.ClaimID,
                        principalTable: "Claims",
                        principalColumn: "ClaimID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClaimDocuments_Users_UploadedBy",
                        column: x => x.UploadedBy,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClaimDocuments_Users_VerifiedByID",
                        column: x => x.VerifiedByID,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ClaimLines",
                columns: table => new
                {
                    LineID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClaimID = table.Column<int>(type: "int", nullable: false),
                    ServiceCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ServiceDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    LineBilledAmount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    DiagnosisCodesJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProcedureCodesJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LineStatus = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClaimLines", x => x.LineID);
                    table.ForeignKey(
                        name: "FK_ClaimLines_Claims_ClaimID",
                        column: x => x.ClaimID,
                        principalTable: "Claims",
                        principalColumn: "ClaimID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FraudCases",
                columns: table => new
                {
                    CaseID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClaimID = table.Column<int>(type: "int", nullable: false),
                    OpenedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OpenedBy = table.Column<int>(type: "int", nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InvestigationNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EvidenceURIsJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Outcome = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FraudCases", x => x.CaseID);
                    table.ForeignKey(
                        name: "FK_FraudCases_Claims_ClaimID",
                        column: x => x.ClaimID,
                        principalTable: "Claims",
                        principalColumn: "ClaimID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FraudCases_Users_OpenedBy",
                        column: x => x.OpenedBy,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FraudScores",
                columns: table => new
                {
                    ScoreID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClaimID = table.Column<int>(type: "int", nullable: false),
                    ScoringModel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ScoreValue = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    FactorsJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FraudScores", x => x.ScoreID);
                    table.ForeignKey(
                        name: "FK_FraudScores_Claims_ClaimID",
                        column: x => x.ClaimID,
                        principalTable: "Claims",
                        principalColumn: "ClaimID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KPIs",
                columns: table => new
                {
                    KPIID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Definition = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Target = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    CurrentValue = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    ReportingPeriod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KPIs", x => x.KPIID);
                });

            migrationBuilder.CreateTable(
                name: "Members",
                columns: table => new
                {
                    MemberID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PolicyID = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DOB = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MemberNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ContactInfoJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CoverageStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CoverageEnd = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Members", x => x.MemberID);
                    table.ForeignKey(
                        name: "FK_Members_Policies_PolicyID",
                        column: x => x.PolicyID,
                        principalTable: "Policies",
                        principalColumn: "PolicyID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    NotificationID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserID = table.Column<int>(type: "int", nullable: false),
                    ClaimID = table.Column<int>(type: "int", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.NotificationID);
                    table.ForeignKey(
                        name: "FK_Notifications_Claims_ClaimID",
                        column: x => x.ClaimID,
                        principalTable: "Claims",
                        principalColumn: "ClaimID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_UserID",
                        column: x => x.UserID,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    PaymentID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClaimID = table.Column<int>(type: "int", nullable: false),
                    PayeeID = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    PaymentMethod = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExecutedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.PaymentID);
                    table.ForeignKey(
                        name: "FK_Payments_Claims_ClaimID",
                        column: x => x.ClaimID,
                        principalTable: "Claims",
                        principalColumn: "ClaimID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Payments_Users_PayeeID",
                        column: x => x.PayeeID,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Reconciliations",
                columns: table => new
                {
                    ReconID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PeriodStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "datetime2", nullable: false),
                    BankStatementURI = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaymentsSummaryJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DiscrepanciesJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReconciledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PerformedByID = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reconciliations", x => x.ReconID);
                    table.ForeignKey(
                        name: "FK_Reconciliations_Users_PerformedByID",
                        column: x => x.PerformedByID,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Reports",
                columns: table => new
                {
                    ReportID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Scope = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ParametersJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MetricsJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GeneratedBy = table.Column<int>(type: "int", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReportURI = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reports", x => x.ReportID);
                    table.ForeignKey(
                        name: "FK_Reports_Users_GeneratedBy",
                        column: x => x.GeneratedBy,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Rules",
                columns: table => new
                {
                    RuleID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RuleType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConditionExpressionJSON = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ActionExpressionJSON = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rules", x => x.RuleID);
                    table.ForeignKey(
                        name: "FK_Rules_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Subrogations",
                columns: table => new
                {
                    SubroID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClaimID = table.Column<int>(type: "int", nullable: false),
                    RecoverableAmount = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    ThirdPartyDetailsJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InitiatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RecoveryAmount = table.Column<decimal>(type: "decimal(12,2)", nullable: true),
                    RecoveredAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subrogations", x => x.SubroID);
                    table.ForeignKey(
                        name: "FK_Subrogations_Claims_ClaimID",
                        column: x => x.ClaimID,
                        principalTable: "Claims",
                        principalColumn: "ClaimID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Tasks",
                columns: table => new
                {
                    TaskID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssignedTo = table.Column<int>(type: "int", nullable: false),
                    ClaimID = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Priority = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tasks", x => x.TaskID);
                    table.ForeignKey(
                        name: "FK_Tasks_Claims_ClaimID",
                        column: x => x.ClaimID,
                        principalTable: "Claims",
                        principalColumn: "ClaimID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Tasks_Users_AssignedTo",
                        column: x => x.AssignedTo,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EligibilityChecks",
                columns: table => new
                {
                    CheckID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MemberID = table.Column<int>(type: "int", nullable: false),
                    PolicyID = table.Column<int>(type: "int", nullable: false),
                    CheckedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ResultJSON = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TTL = table.Column<int>(type: "int", nullable: true),
                    PerformedByID = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EligibilityChecks", x => x.CheckID);
                    table.ForeignKey(
                        name: "FK_EligibilityChecks_Members_MemberID",
                        column: x => x.MemberID,
                        principalTable: "Members",
                        principalColumn: "MemberID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EligibilityChecks_Policies_PolicyID",
                        column: x => x.PolicyID,
                        principalTable: "Policies",
                        principalColumn: "PolicyID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EligibilityChecks_Users_PerformedByID",
                        column: x => x.PerformedByID,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Remittances",
                columns: table => new
                {
                    RemittanceID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PaymentID = table.Column<int>(type: "int", nullable: false),
                    RemitFileURI = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SentToProviderAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Remittances", x => x.RemittanceID);
                    table.ForeignKey(
                        name: "FK_Remittances_Payments_PaymentID",
                        column: x => x.PaymentID,
                        principalTable: "Payments",
                        principalColumn: "PaymentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Policies_PlanCode",
                table: "Policies",
                column: "PlanCode",
                unique: true,
                filter: "[PlanCode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Claims_ExternalClaimRef",
                table: "Claims",
                column: "ExternalClaimRef",
                unique: true,
                filter: "[ExternalClaimRef] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Claims_MemberID_PolicyID",
                table: "Claims",
                columns: new[] { "MemberID", "PolicyID" });

            migrationBuilder.CreateIndex(
                name: "IX_Claims_ProviderID_ReceivedAt",
                table: "Claims",
                columns: new[] { "ProviderID", "ReceivedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Claims_Status_SubmittedAt",
                table: "Claims",
                columns: new[] { "Status", "SubmittedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AdjudicationRecords_ClaimID",
                table: "AdjudicationRecords",
                column: "ClaimID");

            migrationBuilder.CreateIndex(
                name: "IX_AdjudicationRecords_PerformedByID",
                table: "AdjudicationRecords",
                column: "PerformedByID");

            migrationBuilder.CreateIndex(
                name: "IX_Appeals_ClaimID",
                table: "Appeals",
                column: "ClaimID");

            migrationBuilder.CreateIndex(
                name: "IX_Appeals_DecisionByID",
                table: "Appeals",
                column: "DecisionByID");

            migrationBuilder.CreateIndex(
                name: "IX_Appeals_FiledBy",
                table: "Appeals",
                column: "FiledBy");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserID",
                table: "AuditLogs",
                column: "UserID");

            migrationBuilder.CreateIndex(
                name: "IX_ClaimDocuments_ClaimID",
                table: "ClaimDocuments",
                column: "ClaimID");

            migrationBuilder.CreateIndex(
                name: "IX_ClaimDocuments_UploadedBy",
                table: "ClaimDocuments",
                column: "UploadedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ClaimDocuments_VerifiedByID",
                table: "ClaimDocuments",
                column: "VerifiedByID");

            migrationBuilder.CreateIndex(
                name: "IX_ClaimLines_ClaimID",
                table: "ClaimLines",
                column: "ClaimID");

            migrationBuilder.CreateIndex(
                name: "IX_EligibilityChecks_MemberID",
                table: "EligibilityChecks",
                column: "MemberID");

            migrationBuilder.CreateIndex(
                name: "IX_EligibilityChecks_PerformedByID",
                table: "EligibilityChecks",
                column: "PerformedByID");

            migrationBuilder.CreateIndex(
                name: "IX_EligibilityChecks_PolicyID",
                table: "EligibilityChecks",
                column: "PolicyID");

            migrationBuilder.CreateIndex(
                name: "IX_FraudCases_ClaimID",
                table: "FraudCases",
                column: "ClaimID");

            migrationBuilder.CreateIndex(
                name: "IX_FraudCases_OpenedBy",
                table: "FraudCases",
                column: "OpenedBy");

            migrationBuilder.CreateIndex(
                name: "IX_FraudScores_ClaimID",
                table: "FraudScores",
                column: "ClaimID");

            migrationBuilder.CreateIndex(
                name: "IX_Members_MemberNumber",
                table: "Members",
                column: "MemberNumber",
                unique: true,
                filter: "[MemberNumber] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Members_PolicyID",
                table: "Members",
                column: "PolicyID");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_ClaimID",
                table: "Notifications",
                column: "ClaimID");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserID",
                table: "Notifications",
                column: "UserID");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ClaimID",
                table: "Payments",
                column: "ClaimID");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_PayeeID",
                table: "Payments",
                column: "PayeeID");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ReferenceNumber",
                table: "Payments",
                column: "ReferenceNumber",
                unique: true,
                filter: "[ReferenceNumber] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Reconciliations_PerformedByID",
                table: "Reconciliations",
                column: "PerformedByID");

            migrationBuilder.CreateIndex(
                name: "IX_Remittances_PaymentID",
                table: "Remittances",
                column: "PaymentID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reports_GeneratedBy",
                table: "Reports",
                column: "GeneratedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Rules_CreatedBy",
                table: "Rules",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Subrogations_ClaimID",
                table: "Subrogations",
                column: "ClaimID");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_AssignedTo",
                table: "Tasks",
                column: "AssignedTo");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ClaimID",
                table: "Tasks",
                column: "ClaimID");

            migrationBuilder.AddForeignKey(
                name: "FK_Claims_Members_MemberID",
                table: "Claims",
                column: "MemberID",
                principalTable: "Members",
                principalColumn: "MemberID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Claims_Policies_PolicyID",
                table: "Claims",
                column: "PolicyID",
                principalTable: "Policies",
                principalColumn: "PolicyID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Claims_Users_ProviderID",
                table: "Claims",
                column: "ProviderID",
                principalTable: "Users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Claims_Members_MemberID",
                table: "Claims");

            migrationBuilder.DropForeignKey(
                name: "FK_Claims_Policies_PolicyID",
                table: "Claims");

            migrationBuilder.DropForeignKey(
                name: "FK_Claims_Users_ProviderID",
                table: "Claims");

            migrationBuilder.DropTable(
                name: "AdjudicationRecords");

            migrationBuilder.DropTable(
                name: "Appeals");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "AuditPackages");

            migrationBuilder.DropTable(
                name: "ClaimDocuments");

            migrationBuilder.DropTable(
                name: "ClaimLines");

            migrationBuilder.DropTable(
                name: "EligibilityChecks");

            migrationBuilder.DropTable(
                name: "FraudCases");

            migrationBuilder.DropTable(
                name: "FraudScores");

            migrationBuilder.DropTable(
                name: "KPIs");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "Reconciliations");

            migrationBuilder.DropTable(
                name: "Remittances");

            migrationBuilder.DropTable(
                name: "Reports");

            migrationBuilder.DropTable(
                name: "Rules");

            migrationBuilder.DropTable(
                name: "Subrogations");

            migrationBuilder.DropTable(
                name: "Tasks");

            migrationBuilder.DropTable(
                name: "Members");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Policies_PlanCode",
                table: "Policies");

            migrationBuilder.DropIndex(
                name: "IX_Claims_ExternalClaimRef",
                table: "Claims");

            migrationBuilder.DropIndex(
                name: "IX_Claims_MemberID_PolicyID",
                table: "Claims");

            migrationBuilder.DropIndex(
                name: "IX_Claims_ProviderID_ReceivedAt",
                table: "Claims");

            migrationBuilder.DropIndex(
                name: "IX_Claims_Status_SubmittedAt",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "Department",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MFAEnabled",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CoverageRulesJSON",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "DeductibleAmount",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "EffectiveFrom",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "EffectiveTo",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "OutOfPocketMax",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "PlanCode",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "PlanName",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "ClaimType",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "ExternalClaimRef",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "ReceivedAt",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "TotalBilledAmount",
                table: "Claims");

            migrationBuilder.RenameColumn(
                name: "UserID",
                table: "Users",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Users",
                newName: "UserRole");

            migrationBuilder.RenameColumn(
                name: "Role",
                table: "Users",
                newName: "FullName");

            migrationBuilder.RenameColumn(
                name: "PolicyID",
                table: "Policies",
                newName: "PolicyId");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Policies",
                newName: "PolicyName");

            migrationBuilder.RenameColumn(
                name: "ProviderID",
                table: "Claims",
                newName: "ProviderId");

            migrationBuilder.RenameColumn(
                name: "PolicyID",
                table: "Claims",
                newName: "PolicyId");

            migrationBuilder.RenameColumn(
                name: "ClaimID",
                table: "Claims",
                newName: "ClaimId");

            migrationBuilder.RenameColumn(
                name: "SubmittedAt",
                table: "Claims",
                newName: "SubmissionDate");

            migrationBuilder.RenameColumn(
                name: "SourceChannel",
                table: "Claims",
                newName: "Remarks");

            migrationBuilder.RenameColumn(
                name: "Priority",
                table: "Claims",
                newName: "ClamStatus");

            migrationBuilder.RenameColumn(
                name: "MemberID",
                table: "Claims",
                newName: "UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Claims_PolicyID",
                table: "Claims",
                newName: "IX_Claims_PolicyId");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(150)",
                oldMaxLength: 150);

            migrationBuilder.AddColumn<decimal>(
                name: "CoPayPercentage",
                table: "Policies",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CoverageLimit",
                table: "Policies",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Deductible",
                table: "Policies",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Policies",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "ApprovedAmount",
                table: "Claims",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalAmount",
                table: "Claims",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "AutomationRules",
                columns: table => new
                {
                    RuleId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RequiresInNetwork = table.Column<bool>(type: "bit", nullable: false),
                    RuleName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ThresholdAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AutomationRules", x => x.RuleId);
                });

            migrationBuilder.CreateTable(
                name: "ClaimPolicies",
                columns: table => new
                {
                    ItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClaimId = table.Column<int>(type: "int", nullable: false),
                    Cost = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProcedureCode = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClaimPolicies", x => x.ItemId);
                    table.ForeignKey(
                        name: "FK_ClaimPolicies_Claims_ClaimId",
                        column: x => x.ClaimId,
                        principalTable: "Claims",
                        principalColumn: "ClaimId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Providers",
                columns: table => new
                {
                    providerID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InNetwork = table.Column<bool>(type: "bit", nullable: false),
                    Location = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NPI_Number = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProviderName = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Providers", x => x.providerID);
                });

            migrationBuilder.CreateTable(
                name: "UserPolicies",
                columns: table => new
                {
                    UserPolicyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PolicyId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RemainingDedeuctible = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPolicies", x => x.UserPolicyId);
                    table.ForeignKey(
                        name: "FK_UserPolicies_Policies_PolicyId",
                        column: x => x.PolicyId,
                        principalTable: "Policies",
                        principalColumn: "PolicyId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserPolicies_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Claims_UserId",
                table: "Claims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ClaimPolicies_ClaimId",
                table: "ClaimPolicies",
                column: "ClaimId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPolicies_PolicyId",
                table: "UserPolicies",
                column: "PolicyId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPolicies_UserId",
                table: "UserPolicies",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Claims_Providers_PolicyId",
                table: "Claims",
                column: "PolicyId",
                principalTable: "Providers",
                principalColumn: "providerID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Claims_Users_UserId",
                table: "Claims",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
