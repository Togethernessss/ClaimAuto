using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Globalization;

namespace ClaimAuto.HealthSystems.Server.Models
{
    public class Claim
    {
        public int Id { get; set; }
        
        public int PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient Patient { get; set; }

        public int PolicyId { get; set; }
        [ForeignKey("PolicyId")]
        public Policy Policy { get; set; }

        public int HospitalId { get; set; }
        [ForeignKey("HospitalId")]
        public Hospital Hospital { get; set; }

        public int DoctorId { get; set; }
        [ForeignKey("DoctorId")]
        public Doctor Doctor { get; set; }

        public string ClaimType { get; set; }
        public DateTime DateOfService { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal ClaimedAmount { get; set; }

        public string DiagnosisCode { get; set; }

        public string Description { get; set; }
        public string Status { get; set; }
        public int CreatedBy { get; set; }  
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

    }
}
