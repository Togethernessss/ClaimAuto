using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class AutomationRuleTable
    {
        [Key] public int RuleId { get; set; }
        public string RuleName { get; set; } = string.Empty;
        [Column(TypeName = "decimal(18,2)")] public decimal ThresholdAmount { get; set; }
        public bool RequiresInNetwork { get; set; } = true;
        public bool IsActive { get; set; } = true;
    }
}
