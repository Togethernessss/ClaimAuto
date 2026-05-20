using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationIdToNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "Notifications",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_OrganizationID",
                table: "Notifications",
                column: "OrganizationID");

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Organizations_OrganizationID",
                table: "Notifications",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Organizations_OrganizationID",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_OrganizationID",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "Notifications");
        }
    }
}
