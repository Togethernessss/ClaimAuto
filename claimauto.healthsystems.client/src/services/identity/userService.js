import api from '../../api/axiosClient';

/**
 * Service for user-related operations.
 *
 * Today this wraps the backend's /api/users endpoints. In production these are
 * Admin-only by default — the Q1=A decision means you'll soon loosen
 * UsersController to allow self-updates. The frontend code here doesn't change
 * either way; only the backend authorization rule does.
 */

// ── GET /api/users/{id} ────────────────────────────────────────
// Returns the full user record by ID.
// Phase 2 doesn't use this (we read from AuthContext), but it's ready
// for cases where we need fresh server-side data.
export async function getUserById(id) {
  const response = await api.get(`/api/users/${id}`);
  return response.data;
}

// ── PUT /api/users/{id} ────────────────────────────────────────
// Updates editable fields. The DTO sent should match UpdateUserDto.
// Backend returns 204 No Content on success — no response body.
export async function updateUser(id, dto) {
  await api.put(`/api/users/${id}`, dto);
  // No body to return — caller should refresh local state from the DTO it sent
}

// ── GET USERS BY ROLE ─────────────────────────────────────────────
// Backend:  GET /api/users/role/{role}
// Returns:  All users matching the given role within the caller's org
// Who uses: InsuranceStaff + Admin — to populate Policyholder dropdown in Create Member form
// Example:  getUsersByRole('Policyholder')

export async function getUsersByRole(role) {
  const response = await api.get(`/api/users/role/${role}`);
  return response.data;
}

// ── GET /api/users — Admin only ────────────────────────────────
// Returns all users in the caller's organisation.
export async function getAllUsers() {
  const response = await api.get('/api/users');
  return response.data;
}

// ── PATCH /api/users/{id}/status — Admin only ─────────────────
// Toggles a stakeholder between Active and Inactive.
// status: "Active" | "Inactive"
export async function updateUserStatus(userId, status) {
  await api.patch(`/api/users/${userId}/status`, { status });
}

// ── PUT /api/users/{id}/photo — self only ─────────────────────
// Persists a profile photo. `dataUrl` must be the full base64 data URL
// produced by FileReader.readAsDataURL, e.g. "data:image/png;base64,...".
// Returns the updated UserResponseDto so the caller can refresh AuthContext.
export async function updateProfilePhoto(userId, dataUrl) {
  const response = await api.put(`/api/users/${userId}/photo`, {
    profilePhoto: dataUrl,
  });
  return response.data;
}

// ── DELETE /api/users/{id}/photo — self only ──────────────────
// Removes the profile photo. Returns nothing on success.
export async function removeProfilePhoto(userId) {
  await api.delete(`/api/users/${userId}/photo`);
}