export class CreateUserDto {
  constructor({
    name = '',
    email = '',
    password = '',
    role = 'Policyholder',
    phone = '',
    department = '',
    mfaEnabled = false,
    organizationId = null,      // ← NEW: which insurance provider
  } = {}) {
    this.name = name;
    this.email = email;
    this.password = password;
    this.role = role;
    this.phone = phone;
    this.department = department;
    this.mfaEnabled = mfaEnabled;
    this.organizationId = organizationId;   // ← NEW
  }
}