using System.ComponentModel.DataAnnotations;
namespace ClaimAuto.HealthSystems.Server.Models
{
    public class ProviderTable
    {
        [Key]
        public int providerID { get; set; }

        [Required] public string ProviderName { get; set; }
        public string NPI_Number { get; set; }
        public bool InNetwork { get; set; } = true;
        public string Location { get; set; }
    }
}
