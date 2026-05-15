/**
 * Shape of the request body for PUT /api/users/{id}.
 * All fields are optional — only provided fields get updated.
 *
 * The backend treats null/undefined as "leave this field alone".
 *
 * Fields a user can change about THEMSELVES:
 *   - name
 *   - phone
 *   - department
 *
 * Fields NOT editable from the Profile page (Admin manages these):
 *   - email (immutable — used as login identifier)
 *   - role (privilege escalation risk)
 *   - status (set by admin to deactivate)
 *
 * MFA is toggled via separate endpoints, not via this DTO.
 */
export class UpdateUserDto {
  constructor({ name, phone, department } = {}) {
    this.name = name ?? null;
    this.phone = phone ?? null;
    this.department = department ?? null;
  }
}