using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class PaymentRepository : IPaymentRepository
    {
        private readonly ApplicationDbContext _context;
        private readonly INotificationRepository _notificationRepo;

        public PaymentRepository(ApplicationDbContext context, INotificationRepository notificationRepo)
        {
            _context = context;
            _notificationRepo = notificationRepo;
        }

        public async Task<List<PaymentResponseDto>> GetAllPaymentsAsync(
            string? status, int? claimId)
        {
            var query = _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                .AsQueryable();

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
            using var transaction = await _context.Database   // Transaction guarantees: BOTH succeed or NEITHER happens remittance and payment generation
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

                var payeeName = await _context.Users     // for response
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
                    .ThenInclude(c => c.Member)   // to find Arjun for notification
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
            }

            await _context.SaveChangesAsync();

            // Notify Hospital — payment sent to your account
            await _notificationRepo.CreateAsync(new Notification
            {
                UserID = payment.PayeeID,
                ClaimID = payment.ClaimID,
                Message = $"Payment of ₹{payment.Amount} has been sent to your account. " +
                          $"Reference: {payment.ReferenceNumber}.",
                Category = NotificationCategory.Payment,
                Severity = NotificationSeverity.Info
            });

            // Notify Policyholder — your claim has been paid
            if (payment.Claim != null)
            {
                var memberUser = await _context.Users
                    .Where(u => u.Name == payment.Claim.Member.Name
                             && u.Role == UserRole.Policyholder
                             && u.Status == AccountStatus.Active)
                    .FirstOrDefaultAsync();

                if (memberUser != null)
                {
                    await _notificationRepo.CreateAsync(new Notification
                    {
                        UserID = memberUser.UserID,
                        ClaimID = payment.ClaimID,
                        Message = $"₹{payment.Amount} has been paid to your provider " +
                                  $"for your claim. Reference: {payment.ReferenceNumber}.",
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
                && payment.Status !=
                    PaymentStatus.Authorized)
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
                RemitFileURI = remittance.RemitFileURI,
                GeneratedAt = remittance.GeneratedAt,
                SentToProviderAt = remittance.SentToProviderAt,
                Status = remittance.Status.ToString()
            };
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
                .Where(p =>
                    p.Status == PaymentStatus.Executed)
                .Sum(p => p.Amount);    // adding every amount whose status is executed

            var summary = System.Text.Json.JsonSerializer
                .Serialize(new                      // it converts c# object to json
                {
                    totalPayments = totalCount,
                    totalAmount = totalAmount,
                    periodStart = dto.PeriodStart
                        .ToString("yyyy-MM-dd"),
                    periodEnd = dto.PeriodEnd
                        .ToString("yyyy-MM-dd")
                });

            var discrepancies = System.Text.Json    // Discrepancies = MISMATCHES between your records and bank's records.
                .JsonSerializer.Serialize(new
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
                RemitFileURI = remittance.RemitFileURI,
                GeneratedAt = remittance.GeneratedAt,
                SentToProviderAt = remittance.SentToProviderAt,
                Status = remittance.Status.ToString()
            };
        }
    }
}