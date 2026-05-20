using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddReportFilePDF1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReportURI",
                table: "Reports");

            migrationBuilder.AddColumn<byte[]>(
                name: "ReportFilePDF",
                table: "Reports",
                type: "varbinary(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReportFilePDF",
                table: "Reports");

            migrationBuilder.AddColumn<string>(
                name: "ReportURI",
                table: "Reports",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
