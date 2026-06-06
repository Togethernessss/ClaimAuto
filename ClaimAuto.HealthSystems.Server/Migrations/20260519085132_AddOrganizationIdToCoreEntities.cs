using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationIdToCoreEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "Policies",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "Payments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "Members",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "Claims",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "Appeals",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Policies_OrganizationID",
                table: "Policies",
                column: "OrganizationID");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_OrganizationID",
                table: "Payments",
                column: "OrganizationID");

            migrationBuilder.CreateIndex(
                name: "IX_Members_OrganizationID",
                table: "Members",
                column: "OrganizationID");

            migrationBuilder.CreateIndex(
                name: "IX_Claims_OrganizationID",
                table: "Claims",
                column: "OrganizationID");

            migrationBuilder.CreateIndex(
                name: "IX_Appeals_OrganizationID",
                table: "Appeals",
                column: "OrganizationID");

            migrationBuilder.AddForeignKey(
                name: "FK_Appeals_Organizations_OrganizationID",
                table: "Appeals",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Claims_Organizations_OrganizationID",
                table: "Claims",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Members_Organizations_OrganizationID",
                table: "Members",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_Organizations_OrganizationID",
                table: "Payments",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Policies_Organizations_OrganizationID",
                table: "Policies",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appeals_Organizations_OrganizationID",
                table: "Appeals");

            migrationBuilder.DropForeignKey(
                name: "FK_Claims_Organizations_OrganizationID",
                table: "Claims");

            migrationBuilder.DropForeignKey(
                name: "FK_Members_Organizations_OrganizationID",
                table: "Members");

            migrationBuilder.DropForeignKey(
                name: "FK_Payments_Organizations_OrganizationID",
                table: "Payments");

            migrationBuilder.DropForeignKey(
                name: "FK_Policies_Organizations_OrganizationID",
                table: "Policies");

            migrationBuilder.DropIndex(
                name: "IX_Policies_OrganizationID",
                table: "Policies");

            migrationBuilder.DropIndex(
                name: "IX_Payments_OrganizationID",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Members_OrganizationID",
                table: "Members");

            migrationBuilder.DropIndex(
                name: "IX_Claims_OrganizationID",
                table: "Claims");

            migrationBuilder.DropIndex(
                name: "IX_Appeals_OrganizationID",
                table: "Appeals");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "Appeals");
        }
    }
}
