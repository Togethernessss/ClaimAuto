using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class PaymentRepository : IPaymentRepository
    {
        private readonly ApplicationDbContext _context;
        private readonly INotificationRepository _notificationRepo;
        private readonly IRemittancePdfService _pdfService;
        private readonly IReconciliationPdfService _reconciliationPdfService;
        public PaymentRepository(
            ApplicationDbContext context,
            INotificationRepository notificationRepo,
            IRemittancePdfService pdfService,
            IReconciliationPdfService reconciliationPdfService)
        {
            _context = context;
            _notificationRepo = notificationRepo;
            _pdfService = pdfService;
            _reconciliationPdfService = reconciliationPdfService;
        }
        // ── GET ALL PAYMENTS ──────────────────────────────────────────
        public async Task<List<PaymentResponseDto>> GetAllPaymentsAsync(
            int? userId, string? userRole,
            string? status, int? claimId,
            int? userOrgId = null)
        {
            var query = _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                    .ThenInclude(c => c.Member)
                .AsQueryable();
            if (userOrgId.HasValue)
                query = query.Where(
                    p => p.OrganizationID == userOrgId.Value);
            if (userRole == "Policyholder" && userId.HasValue)
            {
                query = query.Where(p =>
                    p.Claim != null &&
                    p.Claim.Member != null &&
                    p.Claim.Member.PolicyholderUserID == userId.Value);
            }
            if (!string.IsNullOrEmpty(status))
                if (Enum.TryParse<PaymentStatus>(
                    status, true, out var s))
                    query = query.Where(p => p.Status == s);
            if (claimId.HasValue)
                query = query.Where(p => p.ClaimID == claimId.Value);
            var payments = await query
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
            return payments.Select(p => MapPayment(p)).ToList();
        }
        // ── GET PAYMENT BY ID ─────────────────────────────────────────
        public async Task<PaymentResponseDto?> GetPaymentByIdAsync(
            int id, int? userOrgId = null)
        {
            var query = _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                .Include(p => p.Remittance)
                .AsQueryable();
            if (userOrgId.HasValue)
                query = query.Where(
                    p => p.OrganizationID == userOrgId.Value);
            var payment = await query
                .FirstOrDefaultAsync(p => p.PaymentID == id);
            return payment == null ? null : MapPayment(payment);
        }
        // ── CREATE PAYMENT ────────────────────────────────────────────
        // 4.1 — Guard against double-payment. Inside the transaction we check
        // for any active (non-Failed) payment on the same claim before inserting.
        // Returns null if a duplicate exists; controller maps that to 409.
        public async Task<PaymentResponseDto?> CreatePaymentAsync(
            Payment payment, int createdByUserId)
        {
            using var transaction = await _context.Database
                .BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            try
            {
                var hasActivePayment = await _context.Payments.AnyAsync(p =>
                    p.ClaimID == payment.ClaimID &&
                    p.Status != PaymentStatus.Failed);

                if (hasActivePayment)
                {
                    await transaction.RollbackAsync();
                    return null;
                }

                payment.CreatedAt = DateTime.UtcNow;
                payment.Status = PaymentStatus.Pending;
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();
                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = createdByUserId,
                    Action = "CreatePayment",
                    ResourceType = "Payment",
                    ResourceID = payment.PaymentID.ToString(),
                    DetailsJSON = $"{{\"claimID\":{payment.ClaimID}," +
                                     $"\"payeeID\":{payment.PayeeID}," +
                                     $"\"amount\":{payment.Amount}," +
                                     $"\"currency\":\"{payment.Currency}\"," +
                                     $"\"method\":\"{payment.PaymentMethod}\"}}",
                    Timestamp = DateTime.UtcNow,
                    OrganizationID = payment.OrganizationID,
                });
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                var payeeName = await _context.Users
                    .Where(u => u.UserID == payment.PayeeID)
                    .Select(u => u.Name)
                    .FirstOrDefaultAsync() ?? "Unknown";
                return new PaymentResponseDto
                {
                    PaymentID = payment.PaymentID,
                    ClaimID = payment.ClaimID,
                    PayeeID = payment.PayeeID,
                    PayeeName = payeeName,
                    Amount = payment.Amount,
                    Currency = payment.Currency,
                    PaymentMethod = payment.PaymentMethod.ToString(),
                    Status = payment.Status.ToString(),
                    CreatedAt = payment.CreatedAt,
                    ScheduledAt = payment.ScheduledAt,
                    ExecutedAt = payment.ExecutedAt,
                    ReferenceNumber = payment.ReferenceNumber
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        // ── AUTHORIZE PAYMENT ─────────────────────────────────────────
        // 4.2 — Race-safe: wrap the whole read-modify-write in a Serializable
        // transaction so two concurrent calls can't both observe Pending. The
        // second caller will see Status = Authorized after the first commits
        // and bail with null (controller maps to 409).
        public async Task<PaymentResponseDto?> AuthorizePaymentAsync(
            int id, int authorizedByUserId)
        {
            using var transaction = await _context.Database
                .BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            try
            {
                var payment = await _context.Payments
                    .Include(p => p.Payee)
                    .Include(p => p.Claim)
                    .FirstOrDefaultAsync(p => p.PaymentID == id);

                if (payment == null)
                {
                    await transaction.RollbackAsync();
                    return null;
                }
                if (payment.Status != PaymentStatus.Pending)
                {
                    await transaction.RollbackAsync();
                    return null;
                }

                payment.Status = PaymentStatus.Authorized;
                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = authorizedByUserId,
                    Action = "AuthorizePayment",
                    ResourceType = "Payment",
                    ResourceID = id.ToString(),
                    DetailsJSON = $"{{\"paymentID\":{id}," +
                                     $"\"claimID\":{payment.ClaimID}," +
                                     $"\"amount\":{payment.Amount}," +
                                     $"\"previousStatus\":\"Pending\"," +
                                     $"\"newStatus\":\"Authorized\"}}",
                    Timestamp = DateTime.UtcNow,
                    OrganizationID = payment.OrganizationID,
                });
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return MapPayment(payment);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        // ── EXECUTE PAYMENT ───────────────────────────────────────────
        public async Task<PaymentResponseDto?> ExecutePaymentAsync(
            int id, string referenceNumber, int executedByUserId)
        {
            var payment = await _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                    .ThenInclude(c => c.Member)
                .Include(p => p.Remittance)
                .FirstOrDefaultAsync(p => p.PaymentID == id);
            if (payment == null) return null;
            if (payment.Status != PaymentStatus.Authorized) return null;
            payment.Status = PaymentStatus.Executed;
            payment.ExecutedAt = DateTime.UtcNow;
            payment.ReferenceNumber = referenceNumber;
            if (payment.Claim != null)
                payment.Claim.Status = ClaimStatus.Paid;
            // ── Generate remittance PDF 
            Remittance? remittance = null;
            if (payment.Claim != null)
            {
                remittance = new Remittance
                {
                    PaymentID = payment.PaymentID,
                    GeneratedAt = DateTime.UtcNow,
                    Status = RemittanceStatus.Sent,
                    SentToProviderAt = DateTime.UtcNow,
                };
                try
                {
                    remittance.RemitFilePDF =
                        _pdfService.GenerateRemittancePdf(
                            remittance, payment);
                }
                catch (Exception ex)
                {
                    Console.WriteLine(
                        $"[PDF ERROR] Payment {id}: " +
                        $"{ex.Message}\n{ex.StackTrace}");
                    remittance.RemitFilePDF = null;
                }
                _context.Remittances.Add(remittance);
                payment.Remittance = remittance;
                _context.AuditLogs.Add(new AuditLog
                {
                    UserID = executedByUserId,
                    Action = "GenerateRemittance",
                    ResourceType = "Remittance",
                    ResourceID = payment.PaymentID.ToString(),
                    DetailsJSON = $"{{\"paymentID\":{payment.PaymentID}," +
                                     $"\"claimID\":{payment.ClaimID}," +
                                     $"\"amount\":{payment.Amount}," +
                                     $"\"payeeID\":{payment.PayeeID}," +
                                     $"\"payeeName\":\"{payment.Payee?.Name}\"}}",
                    Timestamp = DateTime.UtcNow,
                    OrganizationID = payment.OrganizationID,
                });
            }
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = executedByUserId,
                Action = "ExecutePayment",
                ResourceType = "Payment",
                ResourceID = id.ToString(),
                DetailsJSON = $"{{\"paymentID\":{id}," +
                                 $"\"claimID\":{payment.ClaimID}," +
                                 $"\"amount\":{payment.Amount}," +
                                 $"\"referenceNumber\":\"{referenceNumber}\"," +
                                 $"\"payeeID\":{payment.PayeeID}," +
                                 $"\"payeeName\":\"{payment.Payee?.Name}\"," +
                                 $"\"previousStatus\":\"Authorized\"," +
                                 $"\"newStatus\":\"Executed\"}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = payment.OrganizationID,
            });
            await _context.SaveChangesAsync();
            // ── Notify Hospital ───────────────────────────────────────
            await _notificationRepo.CreateAsync(new Notification
            {
                UserID = payment.PayeeID,
                ClaimID = payment.ClaimID,
                Message = $"Payment of Rs.{payment.Amount:N0} for " +
                          $"Claim #{payment.ClaimID} has been sent " +
                          $"to your account. " +
                          $"Reference: {payment.ReferenceNumber}.",
                Category = NotificationCategory.Payment,
                Severity = NotificationSeverity.Info,
                CreatedAt = DateTime.UtcNow,
                Status = NotificationStatus.Unread,
                OrganizationID = payment.OrganizationID,
            });
            // ── Notify Policyholder ───────────────────────────────────
            if (payment.Claim?.Member?.PolicyholderUserID != null)
            {
                await _notificationRepo.CreateAsync(new Notification
                {
                    UserID = payment.Claim.Member
                                         .PolicyholderUserID.Value,
                    ClaimID = payment.ClaimID,
                    Message = $"Your Claim #{payment.ClaimID} has been " +
                              $"processed and payment of " +
                              $"Rs.{payment.Amount:N0} has been sent to " +
                              $"{payment.Payee?.Name ?? "your hospital"}. " +
                              $"Reference: {payment.ReferenceNumber}.",
                    Category = NotificationCategory.Payment,
                    Severity = NotificationSeverity.Info,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread,
                    OrganizationID = payment.OrganizationID,
                });
            }
            // ── Notify Admin + Staff
            var adminAndStaff = await _context.Users
                .Where(u =>
                    (u.Role == UserRole.Admin ||
                     u.Role == UserRole.InsuranceStaff) &&
                    u.Status == AccountStatus.Active &&
                    u.OrganizationID == payment.OrganizationID)
                .ToListAsync();
            foreach (var member in adminAndStaff)
            {
                await _notificationRepo.CreateAsync(new Notification
                {
                    UserID = member.UserID,
                    ClaimID = payment.ClaimID,
                    Message = $"Payment #PAY-{payment.PaymentID} of " +
                              $"Rs.{payment.Amount:N0} for " +
                              $"Claim #{payment.ClaimID} has been " +
                              $"successfully executed. " +
                              $"Payee: {payment.Payee?.Name ?? "Unknown"}. " +
                              $"Reference: {payment.ReferenceNumber}.",
                    Category = NotificationCategory.Payment,
                    Severity = NotificationSeverity.Info,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread,
                    OrganizationID = payment.OrganizationID,
                });
            }
            return MapPayment(payment);
        }
        // ── HOLD PAYMENT
        public async Task<PaymentResponseDto?> HoldPaymentAsync(
            int id, int heldByUserId)
        {
            var payment = await _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                .FirstOrDefaultAsync(p => p.PaymentID == id);
            if (payment == null) return null;
            if (payment.Status != PaymentStatus.Pending &&
                payment.Status != PaymentStatus.Authorized) return null;
            var previousStatus = payment.Status.ToString();
            payment.Status = PaymentStatus.OnHold;
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = heldByUserId,
                Action = "HoldPayment",
                ResourceType = "Payment",
                ResourceID = id.ToString(),
                DetailsJSON = $"{{\"paymentID\":{id}," +
                                 $"\"claimID\":{payment.ClaimID}," +
                                 $"\"amount\":{payment.Amount}," +
                                 $"\"previousStatus\":\"{previousStatus}\"," +
                                 $"\"newStatus\":\"OnHold\"}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = payment.OrganizationID,
            });
            await _context.SaveChangesAsync();
            return MapPayment(payment);
        }
        // ── RESUME PAYMENT 
        public async Task<PaymentResponseDto?> ResumePaymentAsync(
            int id, int resumedByUserId)
        {
            var payment = await _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                .FirstOrDefaultAsync(p => p.PaymentID == id);
            if (payment == null) return null;
            if (payment.Status != PaymentStatus.OnHold) return null;
            payment.Status = PaymentStatus.Pending;
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = resumedByUserId,
                Action = "ResumePayment",
                ResourceType = "Payment",
                ResourceID = id.ToString(),
                DetailsJSON = $"{{\"paymentID\":{id}," +
                                 $"\"claimID\":{payment.ClaimID}," +
                                 $"\"amount\":{payment.Amount}," +
                                 $"\"previousStatus\":\"OnHold\"," +
                                 $"\"newStatus\":\"Pending\"}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = payment.OrganizationID,
            });
            await _context.SaveChangesAsync();
            return MapPayment(payment);
        }
        // ── GET REMITTANCE BY PAYMENT ID 
        public async Task<RemittanceResponseDto?>
            GetRemittanceByPaymentIdAsync(int paymentId)
        {
            var remittance = await _context.Remittances
                .Include(r => r.Payment)
                .FirstOrDefaultAsync(r => r.PaymentID == paymentId);
            return remittance == null ? null : MapRemittance(remittance);
        }
        // ── GET ALL REMITTANCES 
        public async Task<List<RemittanceResponseDto>> GetAllRemittancesAsync(
            int? userId,
            string? userRole,
            string? status,
            string? search,
            int? claimId,
            DateTime? dateFrom,
            DateTime? dateTo,
            int? userOrgId = null)
        {
            var query = _context.Remittances
                .Include(r => r.Payment)
                    .ThenInclude(p => p.Payee)
                .Include(r => r.Payment)
                    .ThenInclude(p => p.Claim)
                .AsQueryable();
            if (userOrgId.HasValue)
                query = query.Where(
                    r => r.Payment.OrganizationID == userOrgId.Value);
            if (userRole == "Hospital" && userId.HasValue)
                query = query.Where(
                    r => r.Payment.PayeeID == userId.Value);
            if (!string.IsNullOrEmpty(status))
                if (Enum.TryParse<RemittanceStatus>(
                    status, true, out var s))
                    query = query.Where(r => r.Status == s);
            if (claimId.HasValue)
                query = query.Where(
                    r => r.Payment.ClaimID == claimId.Value);
            if (!string.IsNullOrEmpty(search))
            {
                var sl = search.ToLower();
                query = query.Where(r =>
                    r.Payment.Payee.Name.ToLower().Contains(sl) ||
                    r.RemittanceID.ToString().Contains(search));
            }
            if (dateFrom.HasValue)     // for showing 30 days remittance
                query = query.Where(
                    r => r.GeneratedAt >= dateFrom.Value);
            if (dateTo.HasValue)
                query = query.Where(
                    r => r.GeneratedAt <=
                         dateTo.Value.Date.AddDays(1).AddTicks(-1));
            var remittances = await query
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();
            return remittances.Select(r => new RemittanceResponseDto
            {
                RemittanceID = r.RemittanceID,
                PaymentID = r.PaymentID,
                GeneratedAt = r.GeneratedAt,
                SentToProviderAt = r.SentToProviderAt,
                Status = r.Status.ToString(),
                PayeeName = r.Payment?.Payee?.Name ?? "Unknown",
                Amount = r.Payment?.Amount ?? 0,
                Currency = r.Payment?.Currency ?? "INR",
                ClaimID = r.Payment?.ClaimID ?? 0,
                HasPDF = r.RemitFilePDF != null
                                   && r.RemitFilePDF.Length > 0,
            }).ToList();
        }
        // ── ACKNOWLEDGE REMITTANCE ────────────────────────────────────
        public async Task<RemittanceResponseDto?> AcknowledgeRemittanceAsync(
            int paymentId, int acknowledgedByUserId)
        {
            var remittance = await _context.Remittances
                .Include(r => r.Payment)
                    .ThenInclude(p => p.Payee)
                .Include(r => r.Payment)
                    .ThenInclude(p => p.Claim)
                        .ThenInclude(c => c.Member)
                .FirstOrDefaultAsync(r => r.PaymentID == paymentId);
            if (remittance == null) return null;
            if (remittance.Status != RemittanceStatus.Sent) return null;
            remittance.Status = RemittanceStatus.Acknowledged;
            remittance.SentToProviderAt = DateTime.UtcNow;
            var payment = remittance.Payment;
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = acknowledgedByUserId,
                Action = "AcknowledgeRemittance",
                ResourceType = "Remittance",
                ResourceID = remittance.RemittanceID.ToString(),
                DetailsJSON = $"{{\"remittanceID\":{remittance.RemittanceID}," +
                                 $"\"paymentID\":{paymentId}," +
                                 $"\"claimID\":{payment.ClaimID}," +
                                 $"\"amount\":{payment.Amount}," +
                                 $"\"referenceNumber\":\"{payment.ReferenceNumber}\"," +
                                 $"\"acknowledgedBy\":{acknowledgedByUserId}}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = payment.OrganizationID,
            });
            await _context.SaveChangesAsync();
            // ── Notify Hospital ───────────────────────────────────────
            await _notificationRepo.CreateAsync(new Notification
            {
                UserID = payment.PayeeID,
                ClaimID = payment.ClaimID,
                Message = $"Your acknowledgement for payment " +
                          $"#PAY-{payment.PaymentID} of " +
                          $"Rs.{payment.Amount:N0} has been recorded. " +
                          $"Reference: {payment.ReferenceNumber}. " +
                          $"The payment cycle for Claim " +
                          $"#{payment.ClaimID} is now complete.",
                Category = NotificationCategory.Payment,
                Severity = NotificationSeverity.Info,
                CreatedAt = DateTime.UtcNow,
                Status = NotificationStatus.Unread,
                OrganizationID = payment.OrganizationID,
            });
            // ── Notify Policyholder ───────────────────────────────────
            if (payment.Claim?.Member?.PolicyholderUserID != null)
            {
                await _notificationRepo.CreateAsync(new Notification
                {
                    UserID = payment.Claim.Member
                                           .PolicyholderUserID.Value,
                    ClaimID = payment.ClaimID,
                    Message = $"Your Claim #{payment.ClaimID} payment " +
                              $"of Rs.{payment.Amount:N0} has been fully " +
                              $"completed. Your provider " +
                              $"({payment.Payee?.Name ?? "your hospital"}) " +
                              $"has confirmed receipt. " +
                              $"Reference: {payment.ReferenceNumber}.",
                    Category = NotificationCategory.Payment,
                    Severity = NotificationSeverity.Info,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread,
                    OrganizationID = payment.OrganizationID,
                });
            }
            // ── Notify Admin + Staff 
            var adminAndStaff = await _context.Users
                .Where(u =>
                    (u.Role == UserRole.Admin ||
                     u.Role == UserRole.InsuranceStaff) &&
                    u.Status == AccountStatus.Active &&
                    u.OrganizationID == payment.OrganizationID)
                .ToListAsync();
            foreach (var member in adminAndStaff)
            {
                await _notificationRepo.CreateAsync(new Notification
                {
                    UserID = member.UserID,
                    ClaimID = payment.ClaimID,
                    Message = $"Payment #PAY-{payment.PaymentID} of " +
                              $"Rs.{payment.Amount:N0} for " +
                              $"Claim #{payment.ClaimID} has been " +
                              $"acknowledged by " +
                              $"{payment.Payee?.Name ?? "the provider"}. " +
                              $"The payment cycle is now complete. " +
                              $"Reference: {payment.ReferenceNumber}.",
                    Category = NotificationCategory.Payment,
                    Severity = NotificationSeverity.Info,
                    CreatedAt = DateTime.UtcNow,
                    Status = NotificationStatus.Unread,
                    OrganizationID = payment.OrganizationID,
                });
            }
            return MapRemittance(remittance);
        }
        // ── GET RECONCILIATIONS ───────────────────────────────────────
        public async Task<List<ReconciliationResponseDto>>
            GetReconciliationsAsync(int? userOrgId = null)
        {
            var query = _context.Reconciliations
                .Include(r => r.PerformedBy)
                .AsQueryable();
            if (userOrgId.HasValue)
                query = query.Where(
                    r => r.OrganizationID == userOrgId.Value);
            return await query
                .OrderByDescending(r => r.ReconciledAt)
                .Select(r => new ReconciliationResponseDto
                {
                    ReconID = r.ReconID,
                    PeriodStart = r.PeriodStart,
                    PeriodEnd = r.PeriodEnd,
                    PaymentsSummaryJSON = r.PaymentsSummaryJSON,
                    DiscrepanciesJSON = r.DiscrepanciesJSON,
                    ReconciledAt = r.ReconciledAt,
                    PerformedByName = r.PerformedBy != null
                                             ? r.PerformedBy.Name
                                             : "System",
                    HasPDF = r.ReconFilePDF != null
                                           && r.ReconFilePDF.Length > 0,
                })
                .ToListAsync();
        }
        // ── CREATE RECONCILIATION ─────────────────────────────────────
        public async Task<ReconciliationResponseDto>
            CreateReconciliationAsync(
                CreateReconciliationDto dto,
                int performedById,
                int? userOrgId = null)
        {
            var endOfDay = dto.PeriodEnd.Date
                .AddDays(1).AddTicks(-1);
            var paymentsQuery = _context.Payments
                .Include(p => p.Payee)
                .Where(p =>
                    p.CreatedAt >= dto.PeriodStart &&
                    p.CreatedAt <= endOfDay);
            if (userOrgId.HasValue)
                paymentsQuery = paymentsQuery.Where(
                    p => p.OrganizationID == userOrgId.Value);
            var paymentsInPeriod = await paymentsQuery
                .ToListAsync();
            var totalAmount = paymentsInPeriod
                .Where(p => p.Status == PaymentStatus.Executed)
                .Sum(p => p.Amount);
            var summary = System.Text.Json.JsonSerializer
                .Serialize(new
                {
                    totalPayments = paymentsInPeriod.Count,
                    totalAmount,
                    periodStart = dto.PeriodStart
                        .ToString("yyyy-MM-dd"),
                    periodEnd = dto.PeriodEnd
                        .ToString("yyyy-MM-dd")
                });
            var discrepancies = System.Text.Json.JsonSerializer
                .Serialize(new
                {
                    count = 0,
                    items = new List<object>()
                });
            var reconciliation = new Reconciliation
            {
                PeriodStart = dto.PeriodStart,
                PeriodEnd = dto.PeriodEnd,
                PaymentsSummaryJSON = summary,
                DiscrepanciesJSON = discrepancies,
                ReconciledAt = DateTime.UtcNow,
                PerformedByID = performedById,
                OrganizationID = userOrgId,
            };
            _context.Reconciliations.Add(reconciliation);
            await _context.SaveChangesAsync();
            _context.AuditLogs.Add(new AuditLog
            {
                UserID = performedById,
                Action = "GenerateReconciliation",
                ResourceType = "Reconciliation",
                ResourceID = reconciliation.ReconID.ToString(),
                DetailsJSON = $"{{\"reconID\":{reconciliation.ReconID}," +
                                 $"\"periodStart\":\"{dto.PeriodStart:yyyy-MM-dd}\"," +
                                 $"\"periodEnd\":\"{dto.PeriodEnd:yyyy-MM-dd}\"," +
                                 $"\"totalPayments\":{paymentsInPeriod.Count}," +
                                 $"\"totalAmount\":{totalAmount}}}",
                Timestamp = DateTime.UtcNow,
                OrganizationID = userOrgId,
            });
            await _context.SaveChangesAsync();
            try
            {
                reconciliation.ReconFilePDF =
                    _reconciliationPdfService
                        .GenerateReconciliationPdf(
                            reconciliation, paymentsInPeriod);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"[RECON PDF ERROR] " +
                    $"ReconID {reconciliation.ReconID}: " +
                    $"{ex.Message}");
                reconciliation.ReconFilePDF = null;
            }
            var performedByName = await _context.Users
                .Where(u => u.UserID == performedById)
                .Select(u => u.Name)
                .FirstOrDefaultAsync() ?? "System";
            return new ReconciliationResponseDto
            {
                ReconID = reconciliation.ReconID,
                PeriodStart = reconciliation.PeriodStart,
                PeriodEnd = reconciliation.PeriodEnd,
                PaymentsSummaryJSON = reconciliation
                                        .PaymentsSummaryJSON,
                DiscrepanciesJSON = reconciliation
                                        .DiscrepanciesJSON,
                ReconciledAt = reconciliation.ReconciledAt,
                PerformedByName = performedByName,
                HasPDF = reconciliation.ReconFilePDF
                                        != null &&
                                      reconciliation.ReconFilePDF
                                        .Length > 0,
            };
        }
        // ── GET REMITTANCE PDF 
        public async Task<byte[]?> GetRemittancePdfAsync(
            int paymentId)
        {
            var remittance = await _context.Remittances
                .FirstOrDefaultAsync(
                    r => r.PaymentID == paymentId);
            return remittance?.RemitFilePDF;    // only if remittance is not null
        }
        // ── GET RECONCILIATION PDF
        public async Task<byte[]?> GetReconciliationPdfAsync(
            int reconId, int? userOrgId = null)
        {
            var query = _context.Reconciliations
                .Where(r => r.ReconID == reconId);
            if (userOrgId.HasValue)
                query = query.Where(
                    r => r.OrganizationID == userOrgId.Value);
            var reconciliation = await query
                .FirstOrDefaultAsync();
            return reconciliation?.ReconFilePDF;
        }
        // ── PRIVATE HELPERS
        private static PaymentResponseDto MapPayment(Payment p) =>
            new PaymentResponseDto
            {
                PaymentID = p.PaymentID,
                ClaimID = p.ClaimID,
                PayeeID = p.PayeeID,
                PayeeName = p.Payee?.Name ?? "Unknown",
                Amount = p.Amount,
                Currency = p.Currency,
                PaymentMethod = p.PaymentMethod.ToString(),
                Status = p.Status.ToString(),
                CreatedAt = p.CreatedAt,
                ScheduledAt = p.ScheduledAt,
                ExecutedAt = p.ExecutedAt,
                ReferenceNumber = p.ReferenceNumber
            };
        private static RemittanceResponseDto MapRemittance(
            Remittance r) =>
            new RemittanceResponseDto
            {
                RemittanceID = r.RemittanceID,
                PaymentID = r.PaymentID,
                GeneratedAt = r.GeneratedAt,
                SentToProviderAt = r.SentToProviderAt,
                Status = r.Status.ToString(),
                HasPDF = r.RemitFilePDF != null
                                   && r.RemitFilePDF.Length > 0,
            };
    }
}