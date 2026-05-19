// Matches DecideAppealDto on backend
// Outcome values allowed: 'Upheld' | 'Overturned' | 'PartiallyUpheld'
export class DecideAppealDto {
  constructor({ outcome = '' } = {}) {
    this.outcome = outcome;
  }
}