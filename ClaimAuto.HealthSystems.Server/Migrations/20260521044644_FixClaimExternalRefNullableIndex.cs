using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class FixClaimExternalRefNullableIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "Remittances",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "ClaimLines",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "ClaimDocuments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Remittances_OrganizationID",
                table: "Remittances",
                column: "OrganizationID");

            migrationBuilder.CreateIndex(
                name: "IX_ClaimLines_OrganizationID",
                table: "ClaimLines",
                column: "OrganizationID");

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

            migrationBuilder.AddForeignKey(
                name: "FK_ClaimLines_Organizations_OrganizationID",
                table: "ClaimLines",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Remittances_Organizations_OrganizationID",
                table: "Remittances",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);

            // ── Fix: ExternalClaimRef unique index — add NULL filter ──────────
            // Drops the existing index (if any) and recreates it with a filter
            // so that multiple NULL values are allowed (optional field).
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_Claims_ExternalClaimRef'
                    AND object_id = OBJECT_ID('Claims')
                )
                BEGIN
                    DROP INDEX [IX_Claims_ExternalClaimRef] ON [Claims];
                END

                CREATE UNIQUE INDEX [IX_Claims_ExternalClaimRef]
                ON [Claims] ([ExternalClaimRef])
                WHERE [ExternalClaimRef] IS NOT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ── Rollback: restore ExternalClaimRef index without NULL filter ──
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_Claims_ExternalClaimRef'
                    AND object_id = OBJECT_ID('Claims')
                )
                BEGIN
                    DROP INDEX [IX_Claims_ExternalClaimRef] ON [Claims];
                END

                CREATE UNIQUE INDEX [IX_Claims_ExternalClaimRef]
                ON [Claims] ([ExternalClaimRef]);
            ");

            migrationBuilder.DropForeignKey(
                name: "FK_ClaimDocuments_Organizations_OrganizationID",
                table: "ClaimDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_ClaimLines_Organizations_OrganizationID",
                table: "ClaimLines");

            migrationBuilder.DropForeignKey(
                name: "FK_Remittances_Organizations_OrganizationID",
                table: "Remittances");

            migrationBuilder.DropIndex(
                name: "IX_Remittances_OrganizationID",
                table: "Remittances");

            migrationBuilder.DropIndex(
                name: "IX_ClaimLines_OrganizationID",
                table: "ClaimLines");

            migrationBuilder.DropIndex(
                name: "IX_ClaimDocuments_OrganizationID",
                table: "ClaimDocuments");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "Remittances");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "ClaimLines");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "ClaimDocuments");
        }
    }
}
