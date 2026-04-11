using ClaimAuto.HealthSystems.Server.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]   // FIX APPLIED — was missing auth in teammate's version
    public class NotificationsController : BaseController
    {
        // GET /api/notifications
        // Returns notifications for the logged-in user only.
        // Filter by Status (Unread/Read/Dismissed), Category.
        // Users can only see their OWN notifications — enforced by
        // reading UserID from JWT token, not from query params.
        [HttpGet]
        public async Task<IActionResult> GetMyNotifications(
            [FromQuery] string? status,
            [FromQuery] string? category)
        {
            throw new NotImplementedException(); 
        }

        // GET /api/notifications/unread
        // Returns only unread notifications for quick badge count.
        [HttpGet("unread")]
        public async Task<IActionResult> GetUnreadNotifications() 
        {
            throw new NotImplementedException();
        }

        // POST /api/notifications
        // Creates a notification. Used by the system internally
        // and by staff for manual alerts.
        [HttpPost]
        [Authorize(Roles = "Admin,InsuranceStaff")]
        public async Task<IActionResult> CreateNotification(
            [FromBody] CreateNotificationDto dto)
        {
            throw new NotImplementedException(); 
        }

        // PUT /api/notifications/{id}/read
        // Marks a notification as Read. Stamps ReadAt timestamp.
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id) 
        {
            throw new NotImplementedException();
        }

        // PUT /api/notifications/{id}/dismiss
        // Marks a notification as Dismissed.
        [HttpPut("{id}/dismiss")]
        public async Task<IActionResult> DismissNotification(int id) 
        {
            throw new NotImplementedException();
        }

        // DELETE /api/notifications/{id}
        // Hard deletes a notification.
        // Can only delete your own notifications.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id) 
        {
            throw new NotImplementedException();
        }
    }
}
