using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddIsInNetworkToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsInNetwork",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsInNetwork",
                table: "Users");
        }
    }
}
