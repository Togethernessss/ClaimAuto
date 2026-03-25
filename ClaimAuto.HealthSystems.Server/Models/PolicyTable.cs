using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace ClaimAuto.HealthSystems.Server.Models
{
    public class PolicyTable
    {
        [Key] public int PolicyId { get; set; }
        [Required] public string PolicyName { get; set; }
        [Column(TypeName = "decimal(18,2)")] public decimal CoverageLimit { get; set; }

        [Column(TypeName = "decimal(18,2)")] public decimal Deductible { get; set; }
        public decimal CoPayPercentage { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
