using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class Add_Member_PolicyholderUserID : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PolicyholderUserID",
                table: "Members",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Members_PolicyholderUserID",
                table: "Members",
                column: "PolicyholderUserID");

            migrationBuilder.AddForeignKey(
                name: "FK_Members_Users_PolicyholderUserID",
                table: "Members",
                column: "PolicyholderUserID",
                principalTable: "Users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Members_Users_PolicyholderUserID",
                table: "Members");

            migrationBuilder.DropIndex(
                name: "IX_Members_PolicyholderUserID",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "PolicyholderUserID",
                table: "Members");
        }
    }
}
