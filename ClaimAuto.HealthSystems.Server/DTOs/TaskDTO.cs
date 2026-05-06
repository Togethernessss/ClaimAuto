using ClaimAuto.HealthSystems.Server.Model;

namespace ClaimAuto.HealthSystems.Server.DTOs
{
    // ── CreateTaskDto 
     public class CreateTaskDto
    {
        public int AssignedTo { get; set; }                      // Sneha or Vikram's UserID
        public int ClaimID { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public string Priority { get; set; } = string.Empty;    // "Low","Medium","High"
    }

    // ── UpdateTaskDto 
    public class UpdateTaskDto
    {

        public string? Description { get; set; }
        public int? AssignedTo { get; set; }                     // can be reassigned
        public DateTime? DueDate { get; set; }
        public string? Priority { get; set; }
    }

    // ── TaskResponseDto 
    public class TaskResponseDto
    {
        public int TaskID { get; set; }
        public int AssignedTo { get; set; }
        public string AssignedToName { get; set; } = string.Empty; // resolved
        public int ClaimID { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public string Priority { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;      // "Pending","InProgress","Completed","Overdue"
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }               // null until completed
    }
}