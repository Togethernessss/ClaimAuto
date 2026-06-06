// JS class mirroring backend UserResponseDto.
// Documents the shape of a user object received from the API.
export class User {
    constructor({
        userID,
        name,
        email,
        role,
        phone,
        department,
        mfaEnabled,
        status,
        createdAt,
        mustChangePassword,
        organizationId,                                   // ← SaaS FIX
        organizationName,                                 // ← SaaS FIX
        organizationBrandColor,                           // ← SaaS FIX
    } = {}) {
        this.userID = userID;
        this.name = name;
        this.email = email;
        this.role = role;
        this.phone = phone;
        this.department = department;
        this.mfaEnabled = mfaEnabled;
        this.status = status;
        this.createdAt = createdAt;
        this.mustChangePassword = mustChangePassword ?? false;
        this.organizationId = organizationId;             // ← SaaS FIX
        this.organizationName = organizationName;         // ← SaaS FIX
        this.organizationBrandColor = organizationBrandColor; // ← SaaS FIX
    }

    // Convenience helpers
    get isAdmin() { return this.role === 'Admin'; }
    get isStaff() { return this.role === 'InsuranceStaff'; }
    get isHospital() { return this.role === 'Hospital'; }
    get isPolicyholder() { return this.role === 'Policyholder'; }
    get isActive() { return this.status === 'Active'; }
}