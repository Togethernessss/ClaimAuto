import api from '../../api/axiosClient';

/**
 * GET /api/organizations
 * Returns all insurance providers a user can register under.
 * Public endpoint — no auth required (registration page calls this BEFORE login).
 *
 * Response shape: array of {
 *   organizationID, name, shortCode, description,
 *   logoUrl, brandColor, supportEmail, supportPhone
 * }
 */
export async function getAllOrganizations() {
  const res = await api.get('/api/organizations');
  return res.data;
}

/**
 * GET /api/organizations/{id}
 * Returns a single provider's branding details.
 * Used by the dashboard after login for the top-nav branding strip.
 */
export async function getOrganizationById(id) {
  const res = await api.get(`/api/organizations/${id}`);
  return res.data;
}