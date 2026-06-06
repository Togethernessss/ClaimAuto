using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationIdToSecondaryEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ─── Add OrganizationID column to all 11 secondary entities ────
            migrationBuilder.AddColumn<int>(name: "OrganizationID", table: "FraudCases", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "OrganizationID", table: "FraudScores", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "OrganizationID", table: "ClaimTasks", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "OrganizationID", table: "AdjudicationRecords", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "OrganizationID", table: "Subrogations", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "OrganizationID", table: "EligibilityChecks", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "OrganizationID", table: "Reconciliations", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "OrganizationID", table: "Reports", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "OrganizationID", table: "KPIs", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "OrganizationID", table: "AuditPackages", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "OrganizationID", table: "AuditLogs", type: "int", nullable: true);

            // ─── Create indexes ─────────────────────────────────────────────
            migrationBuilder.CreateIndex(name: "IX_FraudCases_OrganizationID", table: "FraudCases", column: "OrganizationID");
            migrationBuilder.CreateIndex(name: "IX_FraudScores_OrganizationID", table: "FraudScores", column: "OrganizationID");
            migrationBuilder.CreateIndex(name: "IX_ClaimTasks_OrganizationID", table: "ClaimTasks", column: "OrganizationID");
            migrationBuilder.CreateIndex(name: "IX_AdjudicationRecords_OrganizationID", table: "AdjudicationRecords", column: "OrganizationID");
            migrationBuilder.CreateIndex(name: "IX_Subrogations_OrganizationID", table: "Subrogations", column: "OrganizationID");
            migrationBuilder.CreateIndex(name: "IX_EligibilityChecks_OrganizationID", table: "EligibilityChecks", column: "OrganizationID");
            migrationBuilder.CreateIndex(name: "IX_Reconciliations_OrganizationID", table: "Reconciliations", column: "OrganizationID");
            migrationBuilder.CreateIndex(name: "IX_Reports_OrganizationID", table: "Reports", column: "OrganizationID");
            migrationBuilder.CreateIndex(name: "IX_KPIs_OrganizationID", table: "KPIs", column: "OrganizationID");
            migrationBuilder.CreateIndex(name: "IX_AuditPackages_OrganizationID", table: "AuditPackages", column: "OrganizationID");
            migrationBuilder.CreateIndex(name: "IX_AuditLogs_OrganizationID", table: "AuditLogs", column: "OrganizationID");

            // ─── Add FK constraints to Organizations ────────────────────────
            migrationBuilder.AddForeignKey(name: "FK_FraudCases_Organizations_OrganizationID", table: "FraudCases", column: "OrganizationID", principalTable: "Organizations", principalColumn: "OrganizationID", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_FraudScores_Organizations_OrganizationID", table: "FraudScores", column: "OrganizationID", principalTable: "Organizations", principalColumn: "OrganizationID", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_ClaimTasks_Organizations_OrganizationID", table: "ClaimTasks", column: "OrganizationID", principalTable: "Organizations", principalColumn: "OrganizationID", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_AdjudicationRecords_Organizations_OrganizationID", table: "AdjudicationRecords", column: "OrganizationID", principalTable: "Organizations", principalColumn: "OrganizationID", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_Subrogations_Organizations_OrganizationID", table: "Subrogations", column: "OrganizationID", principalTable: "Organizations", principalColumn: "OrganizationID", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_EligibilityChecks_Organizations_OrganizationID", table: "EligibilityChecks", column: "OrganizationID", principalTable: "Organizations", principalColumn: "OrganizationID", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_Reconciliations_Organizations_OrganizationID", table: "Reconciliations", column: "OrganizationID", principalTable: "Organizations", principalColumn: "OrganizationID", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_Reports_Organizations_OrganizationID", table: "Reports", column: "OrganizationID", principalTable: "Organizations", principalColumn: "OrganizationID", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_KPIs_Organizations_OrganizationID", table: "KPIs", column: "OrganizationID", principalTable: "Organizations", principalColumn: "OrganizationID", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_AuditPackages_Organizations_OrganizationID", table: "AuditPackages", column: "OrganizationID", principalTable: "Organizations", principalColumn: "OrganizationID", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_AuditLogs_Organizations_OrganizationID", table: "AuditLogs", column: "OrganizationID", principalTable: "Organizations", principalColumn: "OrganizationID", onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ─── Drop FK constraints first ──────────────────────────────────
            migrationBuilder.DropForeignKey(name: "FK_FraudCases_Organizations_OrganizationID", table: "FraudCases");
            migrationBuilder.DropForeignKey(name: "FK_FraudScores_Organizations_OrganizationID", table: "FraudScores");
            migrationBuilder.DropForeignKey(name: "FK_ClaimTasks_Organizations_OrganizationID", table: "ClaimTasks");
            migrationBuilder.DropForeignKey(name: "FK_AdjudicationRecords_Organizations_OrganizationID", table: "AdjudicationRecords");
            migrationBuilder.DropForeignKey(name: "FK_Subrogations_Organizations_OrganizationID", table: "Subrogations");
            migrationBuilder.DropForeignKey(name: "FK_EligibilityChecks_Organizations_OrganizationID", table: "EligibilityChecks");
            migrationBuilder.DropForeignKey(name: "FK_Reconciliations_Organizations_OrganizationID", table: "Reconciliations");
            migrationBuilder.DropForeignKey(name: "FK_Reports_Organizations_OrganizationID", table: "Reports");
            migrationBuilder.DropForeignKey(name: "FK_KPIs_Organizations_OrganizationID", table: "KPIs");
            migrationBuilder.DropForeignKey(name: "FK_AuditPackages_Organizations_OrganizationID", table: "AuditPackages");
            migrationBuilder.DropForeignKey(name: "FK_AuditLogs_Organizations_OrganizationID", table: "AuditLogs");

            // ─── Drop indexes ───────────────────────────────────────────────
            migrationBuilder.DropIndex(name: "IX_FraudCases_OrganizationID", table: "FraudCases");
            migrationBuilder.DropIndex(name: "IX_FraudScores_OrganizationID", table: "FraudScores");
            migrationBuilder.DropIndex(name: "IX_ClaimTasks_OrganizationID", table: "ClaimTasks");
            migrationBuilder.DropIndex(name: "IX_AdjudicationRecords_OrganizationID", table: "AdjudicationRecords");
            migrationBuilder.DropIndex(name: "IX_Subrogations_OrganizationID", table: "Subrogations");
            migrationBuilder.DropIndex(name: "IX_EligibilityChecks_OrganizationID", table: "EligibilityChecks");
            migrationBuilder.DropIndex(name: "IX_Reconciliations_OrganizationID", table: "Reconciliations");
            migrationBuilder.DropIndex(name: "IX_Reports_OrganizationID", table: "Reports");
            migrationBuilder.DropIndex(name: "IX_KPIs_OrganizationID", table: "KPIs");
            migrationBuilder.DropIndex(name: "IX_AuditPackages_OrganizationID", table: "AuditPackages");
            migrationBuilder.DropIndex(name: "IX_AuditLogs_OrganizationID", table: "AuditLogs");

            // ─── Drop columns ───────────────────────────────────────────────
            migrationBuilder.DropColumn(name: "OrganizationID", table: "FraudCases");
            migrationBuilder.DropColumn(name: "OrganizationID", table: "FraudScores");
            migrationBuilder.DropColumn(name: "OrganizationID", table: "ClaimTasks");
            migrationBuilder.DropColumn(name: "OrganizationID", table: "AdjudicationRecords");
            migrationBuilder.DropColumn(name: "OrganizationID", table: "Subrogations");
            migrationBuilder.DropColumn(name: "OrganizationID", table: "EligibilityChecks");
            migrationBuilder.DropColumn(name: "OrganizationID", table: "Reconciliations");
            migrationBuilder.DropColumn(name: "OrganizationID", table: "Reports");
            migrationBuilder.DropColumn(name: "OrganizationID", table: "KPIs");
            migrationBuilder.DropColumn(name: "OrganizationID", table: "AuditPackages");
            migrationBuilder.DropColumn(name: "OrganizationID", table: "AuditLogs");
        }
    }
}