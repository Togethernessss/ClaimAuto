using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace ClaimAuto.HealthSystems.Server.Models
{
    public class UserPolicyTable
    {
        [Key] public int UserPolicyId { get; set; }
        public int UserId { get; set; }
        [ForeignKey("UserId")] public UserTable User { get; set; }
        public int PolicyId { get; set; }
        [ForeignKey("PolicyId")] public PolicyTable Policy { get; set; }
        public DateTime StartDate { get; set; } 
        public DateTime EndDate { get; set; }
        [Column(TypeName = "decimal(18,2)")]  public decimal RemainingDedeuctible { get; set; }

    }
}
