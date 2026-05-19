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

        public PaymentRepository(
            ApplicationDbContext context,
            INotificationRepository notificationRepo,
            IRemittancePdfService pdfService)
        {
            _context = context;
            _notificationRepo = notificationRepo;
            _pdfService = pdfService;
        }

        // ── GET ALL PAYMENTS ──────────────────────────────────────────
        public async Task<List<PaymentResponseDto>> GetAllPaymentsAsync(
    int? userId, string? userRole,
    string? status, int? claimId)
        {
            var query = _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                    .ThenInclude(c => c.Member)
                .AsQueryable();

            // Policyholder sees only payments tied to their own claims
            // (i.e., the claim's member is enrolled under this Policyholder).
            // Admin and InsuranceStaff fall through with no filter — they see all.
            if (userRole == "Policyholder" && userId.HasValue)
            {
                query = query.Where(p =>
                    p.Claim != null &&
                    p.Claim.Member != null &&
                    p.Claim.Member.PolicyholderUserID == userId.Value);
            }

            if (!string.IsNullOrEmpty(status))
                if (Enum.TryParse<PaymentStatus>(status, true, out var s))
                    query = query.Where(p => p.Status == s);

            if (claimId.HasValue)
                query = query.Where(p => p.ClaimID == claimId.Value);

            var payments = await query
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return payments.Select(p => MapPayment(p)).ToList();
        }

        // ── GET PAYMENT BY ID ─────────────────────────────────────────
        public async Task<PaymentResponseDto?> GetPaymentByIdAsync(int id)
        {
            var payment = await _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                .Include(p => p.Remittance)
                .FirstOrDefaultAsync(p => p.PaymentID == id);

            return payment == null ? null : MapPayment(payment);
        }

        // ── CREATE PAYMENT ────────────────────────────────────────────
        public async Task<PaymentResponseDto> CreatePaymentAsync(
            Payment payment, int createdByUserId)
        {
            using var transaction = await _context.Database
                .BeginTransactionAsync();
            try
            {
                payment.CreatedAt = DateTime.UtcNow;
                payment.Status = PaymentStatus.Pending;

                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                // NOTE: Remittance is NOT created here.
                // It is created automatically when staff Executes the payment (ExecutePaymentAsync).
                // Remittance = bank transfer confirmation — it only exists after money moves.
                // Reimbursement claims never get a Remittance (payee is Policyholder directly).

                // ── Audit log ─────────────────────────────────────────
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
                    Timestamp = DateTime.UtcNow
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
        public async Task<PaymentResponseDto?> AuthorizePaymentAsync(
            int id, int authorizedByUserId)
        {
            var payment = await _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                .FirstOrDefaultAsync(p => p.PaymentID == id);

            if (payment == null) return null;
            if (payment.Status != PaymentStatus.Pending) return null;

            payment.Status = PaymentStatus.Authorized;

            // ── Audit log ─────────────────────────────────────────────
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
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return MapPayment(payment);
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

            // ── Create Remittance on Execute (not on Create) ──────────────
            // Remittance = bank transfer confirmation — created only when money moves.
            // Reimbursement claims: payee is the Policyholder directly — no remittance.
            // All other claim types (Inpatient, Outpatient, Pharmacy, Emergency): create remittance.
            Remittance? remittance = null;
            if (payment.Claim != null && payment.Claim.ClaimType != ClaimType.Reimbursement)
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
                        _pdfService.GenerateRemittancePdf(remittance, payment);
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
            }

            // ── Audit log ─────────────────────────────────────────────
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
                Timestamp = DateTime.UtcNow
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
                Severity = NotificationSeverity.Info
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
                    Severity = NotificationSeverity.Info
                });
            }

            return MapPayment(payment);
        }

        // ── HOLD PAYMENT ──────────────────────────────────────────────
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

            // ── Audit log ─────────────────────────────────────────────
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
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return MapPayment(payment);
        }

        // ── RESUME PAYMENT ────────────────────────────────────────────
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

            // ── Audit log ─────────────────────────────────────────────
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
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return MapPayment(payment);
        }

        // ── GET REMITTANCE BY PAYMENT ID ──────────────────────────────
        public async Task<RemittanceResponseDto?>
            GetRemittanceByPaymentIdAsync(int paymentId)
        {
            var remittance = await _context.Remittances
                .Include(r => r.Payment)
                .FirstOrDefaultAsync(r => r.PaymentID == paymentId);

            return remittance == null ? null : MapRemittance(remittance);
        }

        // ── GET ALL REMITTANCES ───────────────────────────────────────
        public async Task<List<RemittanceResponseDto>> GetAllRemittancesAsync(
            int? userId,
            string? userRole,
            string? status,
            string? search,
            int? claimId,
            DateTime? dateFrom,
            DateTime? dateTo)
        {
            var query = _context.Remittances
                .Include(r => r.Payment)
                    .ThenInclude(p => p.Payee)
                .Include(r => r.Payment)
                    .ThenInclude(p => p.Claim)
                .AsQueryable();

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

            if (dateFrom.HasValue)
                query = query.Where(
                    r => r.GeneratedAt >= dateFrom.Value);

            if (dateTo.HasValue)
                query = query.Where(
                    r => r.GeneratedAt <= dateTo.Value);

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

            // ── Audit log ─────────────────────────────────────────────
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
                Timestamp = DateTime.UtcNow
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
                Severity = NotificationSeverity.Info
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
                    Severity = NotificationSeverity.Info
                });
            }

            // ── Notify all InsuranceStaff ─────────────────────────────
            var staffUsers = await _context.Users
                .Where(u =>
                    u.Role == UserRole.InsuranceStaff &&
                    u.Status == AccountStatus.Active)
                .ToListAsync();

            foreach (var staff in staffUsers)
            {
                await _notificationRepo.CreateAsync(new Notification
                {
                    UserID = staff.UserID,
                    ClaimID = payment.ClaimID,
                    Message = $"Payment #PAY-{payment.PaymentID} of " +
                               $"Rs.{payment.Amount:N0} for " +
                               $"Claim #{payment.ClaimID} has been " +
                               $"acknowledged by " +
                               $"{payment.Payee?.Name ?? "the provider"}. " +
                               $"The payment cycle is now complete. " +
                               $"Reference: {payment.ReferenceNumber}.",
                    Category = NotificationCategory.Payment,
                    Severity = NotificationSeverity.Info
                });
            }

            return MapRemittance(remittance);
        }

        // ── GET RECONCILIATIONS ───────────────────────────────────────
        public async Task<List<ReconciliationResponseDto>>
            GetReconciliationsAsync()
        {
            var list = await _context.Reconciliations
                .Include(r => r.PerformedBy)
                .OrderByDescending(r => r.ReconciledAt)
                .ToListAsync();

            return list.Select(r => new ReconciliationResponseDto
            {
                ReconID = r.ReconID,
                PeriodStart = r.PeriodStart,
                PeriodEnd = r.PeriodEnd,
                PaymentsSummaryJSON = r.PaymentsSummaryJSON,
                DiscrepanciesJSON = r.DiscrepanciesJSON,
                ReconciledAt = r.ReconciledAt,
                PerformedByName = r.PerformedBy?.Name ?? "System"
            }).ToList();
        }

        // ── CREATE RECONCILIATION ─────────────────────────────────────
        public async Task<ReconciliationResponseDto>
            CreateReconciliationAsync(
                CreateReconciliationDto dto,
                int performedById)
        {
            var paymentsInPeriod = await _context.Payments
                .Where(p =>
                    p.CreatedAt >= dto.PeriodStart &&
                    p.CreatedAt <= dto.PeriodEnd)
                .ToListAsync();

            var totalAmount = paymentsInPeriod
                .Where(p => p.Status == PaymentStatus.Executed)
                .Sum(p => p.Amount);

            var summary = System.Text.Json.JsonSerializer.Serialize(new
            {
                totalPayments = paymentsInPeriod.Count,
                totalAmount,
                periodStart = dto.PeriodStart.ToString("yyyy-MM-dd"),
                periodEnd = dto.PeriodEnd.ToString("yyyy-MM-dd")
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
                BankStatementURI = dto.BankStatementURI,
                PaymentsSummaryJSON = summary,
                DiscrepanciesJSON = discrepancies,
                ReconciledAt = DateTime.UtcNow,
                PerformedByID = performedById
            };

            _context.Reconciliations.Add(reconciliation);
            await _context.SaveChangesAsync();

            var performedByName = await _context.Users
                .Where(u => u.UserID == performedById)
                .Select(u => u.Name)
                .FirstOrDefaultAsync() ?? "System";

            return new ReconciliationResponseDto
            {
                ReconID = reconciliation.ReconID,
                PeriodStart = reconciliation.PeriodStart,
                PeriodEnd = reconciliation.PeriodEnd,
                PaymentsSummaryJSON = reconciliation.PaymentsSummaryJSON,
                DiscrepanciesJSON = reconciliation.DiscrepanciesJSON,
                ReconciledAt = reconciliation.ReconciledAt,
                PerformedByName = performedByName
            };
        }

        // ── GET REMITTANCE PDF ────────────────────────────────────────
        public async Task<byte[]?> GetRemittancePdfAsync(int paymentId)
        {
            var remittance = await _context.Remittances
                .FirstOrDefaultAsync(r => r.PaymentID == paymentId);

            return remittance?.RemitFilePDF;
        }

        // ── PRIVATE HELPERS ───────────────────────────────────────────
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

        private static RemittanceResponseDto MapRemittance(Remittance r) =>
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