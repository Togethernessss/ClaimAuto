using Microsoft.EntityFrameworkCore.Migrations;

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    public class _20260520075229_AddOrganizationIdToClaimLineDocumentRemittance: Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── ClaimLines ──────────────────────────────────────────────
            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "ClaimLines",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClaimLines_OrganizationID",
                table: "ClaimLines",
                column: "OrganizationID");

            migrationBuilder.AddForeignKey(
                name: "FK_ClaimLines_Organizations_OrganizationID",
                table: "ClaimLines",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);

            // ── ClaimDocuments ──────────────────────────────────────────
            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "ClaimDocuments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClaimDocuments_OrganizationID",
                table: "ClaimDocuments",
                column: "OrganizationID");

            migrationBuilder.AddForeignKey(
                name: "FK_ClaimDocuments_Organizations_OrganizationID",
                table: "ClaimDocuments",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);

            // ── Remittances ─────────────────────────────────────────────
            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "Remittances",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Remittances_OrganizationID",
                table: "Remittances",
                column: "OrganizationID");

            migrationBuilder.AddForeignKey(
                name: "FK_Remittances_Organizations_OrganizationID",
                table: "Remittances",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Remittances_Organizations_OrganizationID",
                table: "Remittances");

            migrationBuilder.DropIndex(
                name: "IX_Remittances_OrganizationID",
                table: "Remittances");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "Remittances");

            migrationBuilder.DropForeignKey(
                name: "FK_ClaimDocuments_Organizations_OrganizationID",
                table: "ClaimDocuments");

            migrationBuilder.DropIndex(
                name: "IX_ClaimDocuments_OrganizationID",
                table: "ClaimDocuments");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "ClaimDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_ClaimLines_Organizations_OrganizationID",
                table: "ClaimLines");

            migrationBuilder.DropIndex(
                name: "IX_ClaimLines_OrganizationID",
                table: "ClaimLines");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "ClaimLines");
        }
    }
}