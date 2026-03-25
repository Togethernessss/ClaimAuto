using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.Identity.Client;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class ClaimPolicyTable
    {
        [Key] public int ItemId { get; set; }
        public int ClaimId { get; set; }
        [ForeignKey("ClaimId")] public ClaimTable Claim { get; set; }
        public string ProcedureCode { get; set; } = string.Empty;
        public string Description { get; set; }
        [Column(TypeName = "decimal(18,2)")] public decimal Cost { get; set; }
    }
}
