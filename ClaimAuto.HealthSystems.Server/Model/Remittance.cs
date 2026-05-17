using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Model
{
    [Table("Remittances")]
    public class Remittance
    {

        [Key]
        public int RemittanceID { get; set; }

        [ForeignKey("Payment")]
        public int PaymentID { get; set; }
        public Payment Payment { get; set; } = null!;

        public byte[]? RemitFilePDF { get; set; }   

        [Required]
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        public DateTime? SentToProviderAt { get; set; }

        [Required]
        public RemittanceStatus Status { get; set; } = RemittanceStatus.Generated;
    }
}
