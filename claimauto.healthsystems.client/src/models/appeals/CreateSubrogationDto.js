// Matches CreateSubrogationDto on backend
export class CreateSubrogationDto {
  constructor({
    claimID = 0,
    recoverableAmount = '',
    thirdPartyDetailsJSON = '',
  } = {}) {
    this.claimID               = claimID;
    this.recoverableAmount     = recoverableAmount;
    this.thirdPartyDetailsJSON = thirdPartyDetailsJSON;
  }
}