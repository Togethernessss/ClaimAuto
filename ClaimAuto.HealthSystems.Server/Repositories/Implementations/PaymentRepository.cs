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
            {
                if (Enum.TryParse<PaymentStatus>(
                    status, true, out var statusEnum))
                {
                    query = query.Where(
                        p => p.Status == statusEnum);
                }
            }

            if (claimId.HasValue)
            {
                query = query.Where(
                    p => p.ClaimID == claimId.Value);
            }

            var payments = await query
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return payments.Select(p => new PaymentResponseDto
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
            }).ToList();
        }

        public async Task<PaymentResponseDto?> GetPaymentByIdAsync(
            int id)
        {
            var payment = await _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                .Include(p => p.Remittance)
                .FirstOrDefaultAsync(
                    p => p.PaymentID == id);

            if (payment == null)
                return null;

            return new PaymentResponseDto
            {
                PaymentID = payment.PaymentID,
                ClaimID = payment.ClaimID,
                PayeeID = payment.PayeeID,
                PayeeName = payment.Payee?.Name ?? "Unknown",
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

        public async Task<PaymentResponseDto> CreatePaymentAsync(
            Payment payment)
        {
            using var transaction = await _context.Database
                .BeginTransactionAsync();
            try
            {
                payment.CreatedAt = DateTime.UtcNow;
                payment.Status = PaymentStatus.Pending;

                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                var remittance = new Remittance
                {
                    PaymentID = payment.PaymentID,
                    GeneratedAt = DateTime.UtcNow,
                    Status = RemittanceStatus.Generated
                };
                _context.Remittances.Add(remittance);
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

        public async Task<PaymentResponseDto?> AuthorizePaymentAsync(
            int id)
        {
            var payment = await _context.Payments
                .Include(p => p.Payee)
                .FirstOrDefaultAsync(
                    p => p.PaymentID == id);

            if (payment == null)
                return null;

            if (payment.Status != PaymentStatus.Pending)
                return null;

            payment.Status = PaymentStatus.Authorized;

            await _context.SaveChangesAsync();

            return new PaymentResponseDto
            {
                PaymentID = payment.PaymentID,
                ClaimID = payment.ClaimID,
                PayeeID = payment.PayeeID,
                PayeeName = payment.Payee?.Name ?? "Unknown",
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

        public async Task<PaymentResponseDto?> ExecutePaymentAsync(
            int id, string referenceNumber)
        {
            var payment = await _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                    .ThenInclude(c => c.Member)
                .Include(p => p.Remittance)
                .FirstOrDefaultAsync(
                    p => p.PaymentID == id);

            if (payment == null)
                return null;

            if (payment.Status != PaymentStatus.Authorized)
                return null;

            payment.Status = PaymentStatus.Executed;
            payment.ExecutedAt = DateTime.UtcNow;
            payment.ReferenceNumber = referenceNumber;

            if (payment.Claim != null)
                payment.Claim.Status = ClaimStatus.Paid;

            if (payment.Remittance != null)
            {
                payment.Remittance.Status = RemittanceStatus.Sent;
                payment.Remittance.SentToProviderAt = DateTime.UtcNow;

                // ── Generate and store PDF ────────────────────────
                payment.Remittance.RemitFilePDF =
                    _pdfService.GenerateRemittancePdf(
                        payment.Remittance, payment);
            }

            await _context.SaveChangesAsync();

            // Notify Hospital — payment sent to your account
            await _notificationRepo.CreateAsync(new Notification
            {
                UserID = payment.PayeeID,
                ClaimID = payment.ClaimID,
                Message = $"Payment of ₹{payment.Amount} has been sent " +
                           $"to your account. " +
                           $"Reference: {payment.ReferenceNumber}.",
                Category = NotificationCategory.Payment,
                Severity = NotificationSeverity.Info
            });

            // Notify Policyholder — your claim has been paid
            if (payment.Claim != null)
            {
                var memberUser = await _context.Users
                    .Where(u =>
                        u.Name == payment.Claim.Member.Name &&
                        u.Role == UserRole.Policyholder &&
                        u.Status == AccountStatus.Active)
                    .FirstOrDefaultAsync();

                if (memberUser != null)
                {
                    await _notificationRepo.CreateAsync(new Notification
                    {
                        UserID = memberUser.UserID,
                        ClaimID = payment.ClaimID,
                        Message = $"₹{payment.Amount} has been paid to " +
                                   $"your provider for your claim. " +
                                   $"Reference: {payment.ReferenceNumber}.",
                        Category = NotificationCategory.Payment,
                        Severity = NotificationSeverity.Info
                    });
                }
            }

            return new PaymentResponseDto
            {
                PaymentID = payment.PaymentID,
                ClaimID = payment.ClaimID,
                PayeeID = payment.PayeeID,
                PayeeName = payment.Payee?.Name ?? "Unknown",
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

        public async Task<PaymentResponseDto?> HoldPaymentAsync(int id)
        {
            var payment = await _context.Payments
                .Include(p => p.Payee)
                .FirstOrDefaultAsync(
                    p => p.PaymentID == id);

            if (payment == null)
                return null;

            if (payment.Status != PaymentStatus.Pending
                && payment.Status != PaymentStatus.Authorized)
                return null;

            payment.Status = PaymentStatus.OnHold;

            await _context.SaveChangesAsync();

            return new PaymentResponseDto
            {
                PaymentID = payment.PaymentID,
                ClaimID = payment.ClaimID,
                PayeeID = payment.PayeeID,
                PayeeName = payment.Payee?.Name ?? "Unknown",
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

        public async Task<RemittanceResponseDto?>
            GetRemittanceByPaymentIdAsync(int paymentId)
        {
            var remittance = await _context.Remittances
                .Include(r => r.Payment)
                .FirstOrDefaultAsync(
                    r => r.PaymentID == paymentId);

            if (remittance == null)
                return null;

            return new RemittanceResponseDto
            {
                RemittanceID = remittance.RemittanceID,
                PaymentID = remittance.PaymentID,
                GeneratedAt = remittance.GeneratedAt,
                SentToProviderAt = remittance.SentToProviderAt,
                Status = remittance.Status.ToString(),
                HasPDF = remittance.RemitFilePDF != null
                                   && remittance.RemitFilePDF.Length > 0,
            };
        }

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

            // Hospital sees only their own remittances
            if (userRole == "Hospital" && userId.HasValue)
                query = query.Where(
                    r => r.Payment.PayeeID == userId.Value);

            // Filter by status
            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<RemittanceStatus>(
                    status, true, out var statusEnum))
                    query = query.Where(
                        r => r.Status == statusEnum);
            }

            // Filter by claimId
            if (claimId.HasValue)
                query = query.Where(
                    r => r.Payment.ClaimID == claimId.Value);

            // Search by payee name or remittance ID
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(r =>
                    r.Payment.Payee.Name
                        .ToLower().Contains(searchLower) ||
                    r.RemittanceID.ToString()
                        .Contains(search));
            }

            // Filter by date range
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

        public async Task<List<ReconciliationResponseDto>>
            GetReconciliationsAsync()
        {
            var reconciliations = await _context.Reconciliations
                .Include(r => r.PerformedBy)
                .OrderByDescending(r => r.ReconciledAt)
                .ToListAsync();

            return reconciliations.Select(r => new ReconciliationResponseDto
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

        public async Task<ReconciliationResponseDto>
            CreateReconciliationAsync(
                CreateReconciliationDto dto,
                int performedById)
        {
            var paymentsInPeriod = await _context.Payments
                .Where(p =>
                    p.CreatedAt >= dto.PeriodStart
                    && p.CreatedAt <= dto.PeriodEnd)
                .ToListAsync();

            var totalCount = paymentsInPeriod.Count;
            var totalAmount = paymentsInPeriod
                .Where(p => p.Status == PaymentStatus.Executed)
                .Sum(p => p.Amount);

            var summary = System.Text.Json.JsonSerializer
                .Serialize(new
                {
                    totalPayments = totalCount,
                    totalAmount = totalAmount,
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

        public async Task<RemittanceResponseDto?>
            AcknowledgeRemittanceAsync(int paymentId)
        {
            var remittance = await _context.Remittances
                .FirstOrDefaultAsync(r =>
                    r.PaymentID == paymentId);

            if (remittance == null)
                return null;

            if (remittance.Status != RemittanceStatus.Sent)
                return null;

            remittance.Status = RemittanceStatus.Acknowledged;
            remittance.SentToProviderAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new RemittanceResponseDto
            {
                RemittanceID = remittance.RemittanceID,
                PaymentID = remittance.PaymentID,
                GeneratedAt = remittance.GeneratedAt,
                SentToProviderAt = remittance.SentToProviderAt,
                Status = remittance.Status.ToString(),
                HasPDF = remittance.RemitFilePDF != null
                                   && remittance.RemitFilePDF.Length > 0,
            };
        }

        public async Task<PaymentResponseDto?> ResumePaymentAsync(int id)
        {
            var payment = await _context.Payments
                .Include(p => p.Payee)
                .FirstOrDefaultAsync(p => p.PaymentID == id);

            if (payment == null)
                return null;

            if (payment.Status != PaymentStatus.OnHold)
                return null;

            payment.Status = PaymentStatus.Pending;
            await _context.SaveChangesAsync();

            return new PaymentResponseDto
            {
                PaymentID = payment.PaymentID,
                ClaimID = payment.ClaimID,
                PayeeID = payment.PayeeID,
                PayeeName = payment.Payee?.Name ?? "Unknown",
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

        public async Task<byte[]?> GetRemittancePdfAsync(int paymentId)
        {
            var remittance = await _context.Remittances
                .FirstOrDefaultAsync(r =>
                    r.PaymentID == paymentId);

            return remittance?.RemitFilePDF;
        }
    }
}