// Shape of the POST /api/auth/login request body.
export class LoginDto {
  constructor({ email = '', password = '' } = {}) {
    this.email = email;
    this.password = password;
  }
}