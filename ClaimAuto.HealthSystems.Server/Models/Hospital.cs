using System.ComponentModel.DataAnnotations;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Hospital
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }

        public string Code { get; set; }
        public string Address { get; set; }
        public bool IsInNetwork { get; set; }
        public string Contact { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;



    }
}
