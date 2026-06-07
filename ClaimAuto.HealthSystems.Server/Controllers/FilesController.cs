using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClaimAuto.HealthSystems.Server.Controllers
{
    /// <summary>Handles binary document storage and retrieval for claim documents.</summary>
    [ApiController]
    [Route("api/files")]
    public class FilesController : BaseController
    {
        private static readonly Dictionary<string, string> MimeMap =
            new(StringComparer.OrdinalIgnoreCase)
            {
                { ".pdf",  "application/pdf" },
                { ".jpg",  "image/jpeg" },
                { ".jpeg", "image/jpeg" },
                { ".png",  "image/png" },
                { ".doc",  "application/msword" },
                { ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
            };

        private static readonly HashSet<string> AllowedExtensions =
            new(StringComparer.OrdinalIgnoreCase)
            { ".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx" };

        private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

        private readonly ApplicationDbContext _db;

        public FilesController(ApplicationDbContext db)
        {
            _db = db;
        }

        // ── Upload ──────────────────────────────────────────────────────────
        /// <summary>
        /// Accepts a file via multipart/form-data, stores the bytes in the
        /// ClaimDocumentContents table, and returns a virtual URI that can be
        /// stored in ClaimDocument.FileURI and used to stream the file back.
        /// </summary>
        [HttpPost("upload")]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            if (file.Length > MaxFileSizeBytes)
                return BadRequest(new { message = "File too large. Maximum size is 10 MB." });

            var ext = Path.GetExtension(file.FileName);
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new
                {
                    message = $"File type '{ext}' is not allowed. Accepted: PDF, JPG, PNG, DOC, DOCX."
                });

            var guid = Guid.NewGuid().ToString();
            var contentType = MimeMap.TryGetValue(ext, out var ct)
                ? ct : "application/octet-stream";

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);

            _db.ClaimDocumentContents.Add(new ClaimDocumentContent
            {
                FileGuid = guid,
                FileBytes = ms.ToArray(),
                ContentType = contentType,
                OriginalFileName = file.FileName,
                UploadedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();

            // Full URL so the frontend can use it directly in <img src> / <a href>
            var fileUrl = $"{Request.Scheme}://{Request.Host}/api/files/{guid}";

            return Ok(new
            {
                fileUrl,
                originalName = file.FileName,
                sizeBytes = file.Length,
            });
        }

        // ── Stream ──────────────────────────────────────────────────────────
        /// <summary>
        /// Streams the stored file bytes back with the correct Content-Type.
        /// AllowAnonymous so browsers can load <img src> and open PDFs/images
        /// directly in a new tab without forwarding the JWT token.
        /// The unguessable GUID acts as a capability token.
        /// </summary>
        [HttpGet("{guid}")]
        [Authorize]
        public async Task<IActionResult> GetFile(string guid)
        {
            var content = await _db.ClaimDocumentContents.FindAsync(guid);
            if (content == null) return NotFound();

            return File(content.FileBytes, content.ContentType, content.OriginalFileName);
        }
    }
}