using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRemitFileURIAddRemitFilePDF : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RemitFileURI",
                table: "Remittances");

            migrationBuilder.AddColumn<byte[]>(
                name: "RemitFilePDF",
                table: "Remittances",
                type: "varbinary(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RemitFilePDF",
                table: "Remittances");

            migrationBuilder.AddColumn<string>(
                name: "RemitFileURI",
                table: "Remittances",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
