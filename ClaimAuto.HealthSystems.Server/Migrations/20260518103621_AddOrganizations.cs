using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OrganizationID",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Organizations",
                columns: table => new
                {
                    OrganizationID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ShortCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    BrandColor = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    SupportEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    SupportPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organizations", x => x.OrganizationID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_OrganizationID",
                table: "Users",
                column: "OrganizationID");

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_ShortCode",
                table: "Organizations",
                column: "ShortCode",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Organizations_OrganizationID",
                table: "Users",
                column: "OrganizationID",
                principalTable: "Organizations",
                principalColumn: "OrganizationID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Organizations_OrganizationID",
                table: "Users");

            migrationBuilder.DropTable(
                name: "Organizations");

            migrationBuilder.DropIndex(
                name: "IX_Users_OrganizationID",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OrganizationID",
                table: "Users");
        }
    }
}
