export class CreateUserDto {
  constructor({
    name = '',
    email = '',
    password = '',
    role = 'Policyholder',
    phone = '',
    department = '',
    mfaEnabled = false,
  } = {}) {
    this.name = name;
    this.email = email;
    this.password = password;
    this.role = role;
    this.phone = phone;
    this.department = department;
    this.mfaEnabled = mfaEnabled;
  }
}