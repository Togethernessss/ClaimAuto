using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class ClaimDocument
    {
        [Key]
        public int Id { get; set; }

        //Foreign Key to Claims table
        public int ClaimId { get; set; }

        [ForeignKey("ClaimId")]
        public Claim Claim { get; set; }

        [Required]
        public string DocumentName { get; set; }

        [Required]
        public string DocumentPath { get; set; }

        public string DocType { get; set; }

        public int UploadedBy { get; set; }
        [ForeignKey("UploadedBy")]
        public ApplicationUser User { get; set; }

        public DateTime UploadedAt { get; set; }

    }
}
