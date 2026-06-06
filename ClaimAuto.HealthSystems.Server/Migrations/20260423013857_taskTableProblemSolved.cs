using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    public partial class taskTableProblemSolved : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Claims_ClaimID",
                table: "Tasks");

            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Users_AssignedTo",
                table: "Tasks");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Tasks",
                table: "Tasks");

            migrationBuilder.RenameTable(
                name: "Tasks",
                newName: "ClaimTasks");

            migrationBuilder.RenameIndex(
                name: "IX_Tasks_ClaimID",
                table: "ClaimTasks",
                newName: "IX_ClaimTasks_ClaimID");

            migrationBuilder.RenameIndex(
                name: "IX_Tasks_AssignedTo",
                table: "ClaimTasks",
                newName: "IX_ClaimTasks_AssignedTo");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ClaimTasks",
                table: "ClaimTasks",
                column: "TaskID");

            migrationBuilder.AddForeignKey(
                name: "FK_ClaimTasks_Claims_ClaimID",
                table: "ClaimTasks",
                column: "ClaimID",
                principalTable: "Claims",
                principalColumn: "ClaimID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ClaimTasks_Users_AssignedTo",
                table: "ClaimTasks",
                column: "AssignedTo",
                principalTable: "Users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ClaimTasks_Claims_ClaimID",
                table: "ClaimTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_ClaimTasks_Users_AssignedTo",
                table: "ClaimTasks");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ClaimTasks",
                table: "ClaimTasks");

            migrationBuilder.RenameTable(
                name: "ClaimTasks",
                newName: "Tasks");

            migrationBuilder.RenameIndex(
                name: "IX_ClaimTasks_ClaimID",
                table: "Tasks",
                newName: "IX_Tasks_ClaimID");

            migrationBuilder.RenameIndex(
                name: "IX_ClaimTasks_AssignedTo",
                table: "Tasks",
                newName: "IX_Tasks_AssignedTo");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Tasks",
                table: "Tasks",
                column: "TaskID");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Claims_ClaimID",
                table: "Tasks",
                column: "ClaimID",
                principalTable: "Claims",
                principalColumn: "ClaimID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Users_AssignedTo",
                table: "Tasks",
                column: "AssignedTo",
                principalTable: "Users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
