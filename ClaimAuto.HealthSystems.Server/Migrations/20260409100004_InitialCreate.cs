using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Claims_ClaimID",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_Reports_Users_GeneratedBy",
                table: "Reports");

            migrationBuilder.DropIndex(
                name: "IX_Policies_PlanCode",
                table: "Policies");

            migrationBuilder.AddColumn<string>(
                name: "PasswordHash",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "PlanCode",
                table: "Policies",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ClaimID",
                table: "Notifications",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.CreateIndex(
                name: "IX_Policies_PlanCode",
                table: "Policies",
                column: "PlanCode",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Claims_ClaimID",
                table: "Notifications",
                column: "ClaimID",
                principalTable: "Claims",
                principalColumn: "ClaimID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reports_Users_GeneratedBy",
                table: "Reports",
                column: "GeneratedBy",
                principalTable: "Users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Claims_ClaimID",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_Reports_Users_GeneratedBy",
                table: "Reports");

            migrationBuilder.DropIndex(
                name: "IX_Policies_PlanCode",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "PasswordHash",
                table: "Users");

            migrationBuilder.AlterColumn<string>(
                name: "PlanCode",
                table: "Policies",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<int>(
                name: "ClaimID",
                table: "Notifications",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Policies_PlanCode",
                table: "Policies",
                column: "PlanCode",
                unique: true,
                filter: "[PlanCode] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Claims_ClaimID",
                table: "Notifications",
                column: "ClaimID",
                principalTable: "Claims",
                principalColumn: "ClaimID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Reports_Users_GeneratedBy",
                table: "Reports",
                column: "GeneratedBy",
                principalTable: "Users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
