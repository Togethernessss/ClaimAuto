using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditPackagePdf : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PackageURI",
                table: "AuditPackages");

            migrationBuilder.AddColumn<int>(
                name: "GeneratedByID",
                table: "AuditPackages",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "PackageFilePDF",
                table: "AuditPackages",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuditPackages_GeneratedByID",
                table: "AuditPackages",
                column: "GeneratedByID");

            migrationBuilder.AddForeignKey(
                name: "FK_AuditPackages_Users_GeneratedByID",
                table: "AuditPackages",
                column: "GeneratedByID",
                principalTable: "Users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AuditPackages_Users_GeneratedByID",
                table: "AuditPackages");

            migrationBuilder.DropIndex(
                name: "IX_AuditPackages_GeneratedByID",
                table: "AuditPackages");

            migrationBuilder.DropColumn(
                name: "GeneratedByID",
                table: "AuditPackages");

            migrationBuilder.DropColumn(
                name: "PackageFilePDF",
                table: "AuditPackages");

            migrationBuilder.AddColumn<string>(
                name: "PackageURI",
                table: "AuditPackages",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
