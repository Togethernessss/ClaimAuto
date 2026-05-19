// Matches CreateAppealDto on backend
export class CreateAppealDto {
  constructor({
    claimID = 0,
    reason = '',
    documentsJSON = '',
  } = {}) {
    this.claimID       = claimID;
    this.reason        = reason;
    this.documentsJSON = documentsJSON;
  }
}