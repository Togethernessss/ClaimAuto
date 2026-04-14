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

        public PaymentRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // ── Method 1 — GetAllPaymentsAsync ───────────────────
        public async Task<List<Payment>> GetAllPaymentsAsync(
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

            return await query
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        // ── Method 2 — GetPaymentByIdAsync ───────────────────
        public async Task<Payment?> GetPaymentByIdAsync(
            int id)
        {
            return await _context.Payments
                .Include(p => p.Payee)
                .Include(p => p.Claim)
                .Include(p => p.Remittance)
                .FirstOrDefaultAsync(
                    p => p.PaymentID == id);
        }

        // ── Method 3 — CreatePaymentAsync ────────────────────
        // ACID Transaction:
        // Payment + Remittance saved together
        // or neither saves
        public async Task<Payment> CreatePaymentAsync(
            Payment payment)
        {
            using var transaction = await _context.Database
                .BeginTransactionAsync();
            try
            {
                // Set server controlled fields
                payment.CreatedAt = DateTime.UtcNow;
                payment.Status = PaymentStatus.Pending;

                // Step 1 — Save Payment
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                // Step 2 — Auto create Remittance
                var remittance = new Remittance
                {
                    PaymentID = payment.PaymentID,
                    GeneratedAt = DateTime.UtcNow,
                    Status = RemittanceStatus.Generated
                };
                _context.Remittances.Add(remittance);
                await _context.SaveChangesAsync();

                // Commit both together
                await transaction.CommitAsync();

                return payment;
            }
            catch
            {
                // If anything fails roll back both
                await transaction.RollbackAsync();
                throw;
            }
        }

        // ── Method 4 — AuthorizePaymentAsync ─────────────────
        public async Task<Payment?> AuthorizePaymentAsync(
            int id)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(
                    p => p.PaymentID == id);

            if (payment == null)
                return null;

            // Only Pending payments can be authorized
            if (payment.Status != PaymentStatus.Pending)
                return null;

            payment.Status = PaymentStatus.Authorized;

            await _context.SaveChangesAsync();

            return payment;
        }

        // ── Method 5 — ExecutePaymentAsync ───────────────────
        // Stamps ExecutedAt + ReferenceNumber
        // Updates Claim.Status → Paid
        // Updates Remittance.Status → Sent
        public async Task<Payment?> ExecutePaymentAsync(
            int id, string referenceNumber)
        {
            var payment = await _context.Payments
                .Include(p => p.Claim)
                .Include(p => p.Remittance)
                .FirstOrDefaultAsync(
                    p => p.PaymentID == id);

            if (payment == null)
                return null;

            // Only Authorized payments can be executed
            if (payment.Status != PaymentStatus.Authorized)
                return null;

            // Update payment
            payment.Status = PaymentStatus.Executed;
            payment.ExecutedAt = DateTime.UtcNow;
            payment.ReferenceNumber = referenceNumber;

            // Update Claim status to Paid
            if (payment.Claim != null)
                payment.Claim.Status = ClaimStatus.Paid;

            // Update Remittance status to Sent
            // Now that payment is done
            // remittance is sent to hospital
            if (payment.Remittance != null)
            {
                payment.Remittance.Status =
                    RemittanceStatus.Sent;
                payment.Remittance.SentToProviderAt =
                    DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return payment;
        }

        // ── Method 6 — HoldPaymentAsync ──────────────────────
        public async Task<Payment?> HoldPaymentAsync(int id)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(
                    p => p.PaymentID == id);

            if (payment == null)
                return null;

            // Only Pending or Authorized can be held
            if (payment.Status != PaymentStatus.Pending
                && payment.Status !=
                    PaymentStatus.Authorized)
                return null;

            payment.Status = PaymentStatus.OnHold;

            await _context.SaveChangesAsync();

            return payment;
        }

        // ── Method 7 — GetRemittanceByPaymentIdAsync ─────────
        public async Task<Remittance?>
            GetRemittanceByPaymentIdAsync(int paymentId)
        {
            return await _context.Remittances
                .Include(r => r.Payment)
                .FirstOrDefaultAsync(
                    r => r.PaymentID == paymentId);
        }

        // ── Method 8 — GetReconciliationsAsync ───────────────
        public async Task<List<Reconciliation>>
            GetReconciliationsAsync()
        {
            return await _context.Reconciliations
                .Include(r => r.PerformedBy)
                .OrderByDescending(r => r.ReconciledAt)
                .ToListAsync();
        }

        // ── Method 9 — CreateReconciliationAsync ─────────────
        public async Task<Reconciliation>
            CreateReconciliationAsync(
                CreateReconciliationDto dto,
                int performedById)
        {
            // Get all payments in the period
            var paymentsInPeriod = await _context.Payments
                .Where(p =>
                    p.CreatedAt >= dto.PeriodStart
                    && p.CreatedAt <= dto.PeriodEnd)
                .ToListAsync();

            // Calculate summary
            var totalCount = paymentsInPeriod.Count;
            var totalAmount = paymentsInPeriod
                .Where(p =>
                    p.Status == PaymentStatus.Executed)
                .Sum(p => p.Amount);

            // Build summary JSON
            var summary = System.Text.Json.JsonSerializer
                .Serialize(new
                {
                    totalPayments = totalCount,
                    totalAmount = totalAmount,
                    periodStart = dto.PeriodStart
                        .ToString("yyyy-MM-dd"),
                    periodEnd = dto.PeriodEnd
                        .ToString("yyyy-MM-dd")
                });

            // In MVP no real discrepancy detection
            // In production compare vs bank statement
            var discrepancies = System.Text.Json
                .JsonSerializer.Serialize(new
                {
                    count = 0,
                    items = new List<object>()
                });

            // Build Reconciliation model
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

            return reconciliation;
        }

        // ── Method 10 — AcknowledgeRemittanceAsync ───────────
        // Rahul acknowledges remittance
        // Sent → Acknowledged
        public async Task<Remittance?>
            AcknowledgeRemittanceAsync(int paymentId)
        {
            var remittance = await _context.Remittances
                .FirstOrDefaultAsync(r =>
                    r.PaymentID == paymentId);

            if (remittance == null)
                return null;

            // Only Sent remittances can be acknowledged
            if (remittance.Status != RemittanceStatus.Sent)
                return null;

            // Update status
            remittance.Status =
                RemittanceStatus.Acknowledged;
            remittance.SentToProviderAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return remittance;
        }
    }
}
