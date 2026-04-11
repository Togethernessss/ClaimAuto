using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repository.Interfaces;
using Microsoft.EntityFrameworkCore; 

namespace ClaimAuto.HealthSystems.Server.Repository.Implementations
{
    public class PaymentRepository : IPaymentRepository
    {
        private readonly ApplicationDbContext _context;

        public PaymentRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Payment>> GetAllWithDetailsAsync()
        {
            return await _context.Payments
                .Include(p => p.Claim)
                .Include(p => p.Payee)
                .Include(p => p.Remittance)
                .ToListAsync();
        }

        public async Task<Payment?> GetByIdWithDetailsAsync(int id)
        {
            return await _context.Payments
                .Include(p => p.Claim)
                .Include(p => p.Payee)
                .Include(p => p.Remittance)
                .FirstOrDefaultAsync(p => p.PaymentID == id);
        }

        public async Task<Claim?> GetClaimAsync(int claimId)
        {
            return await _context.Claims.FindAsync(claimId);
        }

        public async Task CreatePaymentWithAuditAsync(Payment payment, Remittance remittance, AuditLog log)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                remittance.PaymentID = payment.PaymentID;
                _context.Remittances.Add(remittance);

                log.ResourceID = payment.PaymentID.ToString();
                _context.AuditLogs.Add(log);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task UpdateAsync(Payment payment)
        {
            await _context.SaveChangesAsync();
        }

        public async Task LoadPayeeAsync(Payment payment)
        {
            await _context.Entry(payment).Reference(p => p.Payee).LoadAsync();
        }

        public async Task<List<Reconciliation>> GetAllReconciliationsAsync()
        {
            return await _context.Reconciliations
                .Include(r => r.PerformedBy)
                .ToListAsync();
        }

        public async Task<Reconciliation> CreateReconciliationAsync(Reconciliation recon)
        {
            recon.ReconciledAt = DateTime.UtcNow;
            _context.Reconciliations.Add(recon);
            await _context.SaveChangesAsync();
            return recon;
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}

