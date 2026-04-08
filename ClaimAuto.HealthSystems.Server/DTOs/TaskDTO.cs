namespace ClaimAuto.HealthSystems.Server.DTOs
{
    public class CreateTaskDto
    {
        public int AssignedTo { get; set; }
        public int ClaimID { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public string Priority { get; set; } = string.Empty;  // "Low", "Medium", "High"
    }


    public class UpdateTaskDto
    {
        public string Description { get; set; } = string.Empty;
        public int AssignedTo { get; set; }
        public DateTime? DueDate { get; set; }
        public string Priority { get; set; } = string.Empty;
    }

    public class TaskResponseDto
    {
        public int TaskID { get; set; }
        public int AssignedTo { get; set; }
        public string AssignedToName { get; set; } = string.Empty;
        public int ClaimID { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public string Priority { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }
}
