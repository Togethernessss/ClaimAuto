using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationIdToRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "Rules",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rules_OrganizationID",
                table: "Rules",
                column: "OrganizationID");

            migrationBuilder.AddForeignKey(
                name: "FK_Rules_Organizations_OrganizationID",
                table: "Rules",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Rules_Organizations_OrganizationID",
                table: "Rules");

            migrationBuilder.DropIndex(
                name: "IX_Rules_OrganizationID",
                table: "Rules");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "Rules");
        }
    }
}
