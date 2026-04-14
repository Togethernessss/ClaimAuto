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

        // Payment + Remittance saved together or neither saves
        public async Task<Payment> CreatePaymentAsync(
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

                return payment;
            }
            catch
            {

                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<Payment?> AuthorizePaymentAsync(
            int id)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(
                    p => p.PaymentID == id);

            if (payment == null)
                return null;

            if (payment.Status != PaymentStatus.Pending)
                return null;

            payment.Status = PaymentStatus.Authorized;

            await _context.SaveChangesAsync();

            return payment;
        }


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

            if (payment.Status != PaymentStatus.Authorized)
                return null;

            payment.Status = PaymentStatus.Executed;
            payment.ExecutedAt = DateTime.UtcNow;
            payment.ReferenceNumber = referenceNumber;

            if (payment.Claim != null)
                payment.Claim.Status = ClaimStatus.Paid;

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

        public async Task<Payment?> HoldPaymentAsync(int id)
        {
            var payment = await _context.Payments
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

            return payment;
        }


        public async Task<Remittance?>
            GetRemittanceByPaymentIdAsync(int paymentId)
        {
            return await _context.Remittances
                .Include(r => r.Payment)
                .FirstOrDefaultAsync(
                    r => r.PaymentID == paymentId);
        }


        public async Task<List<Reconciliation>>
            GetReconciliationsAsync()
        {
            return await _context.Reconciliations
                .Include(r => r.PerformedBy)
                .OrderByDescending(r => r.ReconciledAt)
                .ToListAsync();
        }


        public async Task<Reconciliation>
            CreateReconciliationAsync(
                CreateReconciliationDto dto,
                int performedById)
        {
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

            // Reconciliation model
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



        public async Task<Remittance?>
            AcknowledgeRemittanceAsync(int paymentId)
        {
            var remittance = await _context.Remittances
                .FirstOrDefaultAsync(r =>
                    r.PaymentID == paymentId);

            if (remittance == null)
                return null;


            if (remittance.Status != RemittanceStatus.Sent)
                return null;

            remittance.Status =
                RemittanceStatus.Acknowledged;
            remittance.SentToProviderAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return remittance;
        }
    }
}
