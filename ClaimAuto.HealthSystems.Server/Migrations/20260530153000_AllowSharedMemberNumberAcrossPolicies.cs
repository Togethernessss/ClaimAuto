using ClaimAuto.HealthSystems.Server.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClaimAuto.HealthSystems.Server.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260530153000_AllowSharedMemberNumberAcrossPolicies")]
    public partial class AllowSharedMemberNumberAcrossPolicies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Members_MemberNumber",
                table: "Members");

            migrationBuilder.Sql(@"
                WITH CanonicalMembers AS
                (
                    SELECT
                        PolicyholderUserID,
                        OrganizationID,
                        MIN(MemberID) AS CanonicalMemberID
                    FROM Members
                    WHERE PolicyholderUserID IS NOT NULL
                      AND MemberNumber IS NOT NULL
                    GROUP BY PolicyholderUserID, OrganizationID
                )
                UPDATE target
                SET MemberNumber = source.MemberNumber
                FROM Members AS target
                INNER JOIN CanonicalMembers AS canonical
                    ON target.PolicyholderUserID = canonical.PolicyholderUserID
                    AND (
                        target.OrganizationID = canonical.OrganizationID
                        OR (target.OrganizationID IS NULL AND canonical.OrganizationID IS NULL)
                    )
                INNER JOIN Members AS source
                    ON source.MemberID = canonical.CanonicalMemberID
                WHERE target.MemberNumber IS NOT NULL
                  AND source.MemberNumber IS NOT NULL
                  AND target.MemberNumber <> source.MemberNumber;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Members_MemberNumber",
                table: "Members",
                column: "MemberNumber",
                filter: "[MemberNumber] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Members_MemberNumber",
                table: "Members");

            migrationBuilder.Sql(@"
                UPDATE Members
                SET MemberNumber =
                    CASE
                        WHEN MemberID < 1000000
                            THEN 'MEM-' + RIGHT('000000' + CAST(MemberID AS varchar(20)), 6)
                        ELSE 'MEM-' + CAST(MemberID AS varchar(20))
                    END
                WHERE MemberNumber IS NOT NULL;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Members_MemberNumber",
                table: "Members",
                column: "MemberNumber",
                unique: true,
                filter: "[MemberNumber] IS NOT NULL");
        }
    }
}
