// CREATE PAYMENT 
// Used when: Admin/Staff creates a new payment for an approved claim
// Matches:   POST /api/payments  →  backend CreatePaymentDto.cs

export class CreatePaymentDto {
  constructor({
    claimID       = 0,
    payeeID       = 0,
    amount        = 0,
    currency      = 'INR',
    paymentMethod = '',     // "EFT" | "ACH" | "Check"
    scheduledAt   = null,
  } = {}) {
    this.ClaimID       = claimID;
    this.PayeeID       = payeeID;
    this.Amount        = amount;
    this.Currency      = currency;
    this.PaymentMethod = paymentMethod;
    this.ScheduledAt   = scheduledAt;
  }
}

// CREATE RECONCILIATION 
// Used when: Admin/Staff generates a reconciliation report for a period
// Matches:   POST /api/payments/reconciliation  →  backend CreateReconciliationDto.cs

export class CreateReconciliationDto {
  constructor({
    periodStart      = '',
    periodEnd        = '',
    bankStatementURI = null,
  } = {}) {
    this.PeriodStart      = periodStart;
    this.PeriodEnd        = periodEnd;
    this.BankStatementURI = bankStatementURI;
  }
}