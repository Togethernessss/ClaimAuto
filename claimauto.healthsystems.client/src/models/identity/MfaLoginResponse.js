// Shape of the login response when MFA is required.
export class MfaLoginResponse {
  constructor({ requiresMFA = false, mfaToken = '', message = '' } = {}) {
    this.requiresMFA = requiresMFA;
    this.mfaToken = mfaToken;
    this.message = message;
  }
}