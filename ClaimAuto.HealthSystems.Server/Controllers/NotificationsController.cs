using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _service;

        public NotificationsController(INotificationService service)
        {
            _service = service;
        }

        // GET: api/notifications
        [HttpGet]
        public async Task<ActionResult<IEnumerable<NotificationResponseDto>>> GetAllNotifications()
        {
            var notifications = await _service.GetAllAsync();
            return Ok(notifications);
        }

        // GET: api/notifications/user/5
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<NotificationResponseDto>>> GetByUser(int userId)
        {
            var notifications = await _service.GetByUserAsync(userId);
            return Ok(notifications);
        }

        // GET: api/notifications/user/5/unread
        [HttpGet("user/{userId}/unread")]
        public async Task<ActionResult<IEnumerable<NotificationResponseDto>>> GetUnreadByUser(int userId)
        {
            var notifications = await _service.GetUnreadByUserAsync(userId);
            return Ok(notifications);
        }

        // GET: api/notifications/5
        [HttpGet("{id}")]
        public async Task<ActionResult<NotificationResponseDto>> GetNotification(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return Ok(result.Notification);
        }

        // POST: api/notifications
        [HttpPost]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<ActionResult<NotificationResponseDto>> CreateNotification(CreateNotificationDto dto)
        {
            var result = await _service.CreateAsync(dto);
            if (!result.Success)
                return BadRequest(result.Error);

            return CreatedAtAction(nameof(GetNotification),
                new { id = result.Notification!.NotificationID }, result.Notification);
        }

        // PUT: api/notifications/5/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var result = await _service.MarkAsReadAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        // PUT: api/notifications/5/dismiss
        [HttpPut("{id}/dismiss")]
        public async Task<IActionResult> Dismiss(int id)
        {
            var result = await _service.DismissAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }

        // DELETE: api/notifications/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (!result.Success)
                return NotFound(result.Error);

            return NoContent();
        }
    }
}