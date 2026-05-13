import api from '../../api/axiosClient';
import { AuditLogDto } from '../../models/auditlogs/AuditLogDto';

// ── GET ALL AUDIT LOGS WITH OPTIONAL FILTERS ──────────────────────────────────
// Backend:  GET /api/auditlogs?userId=&resourceType=&action=&limit=
// Returns:  Array of AuditLogDto, newest first
// Who uses: Admin's AuditLogs page
//
// All filter params are optional. Pass `{}` to get the default (newest 500).
//
// Example:
//   const logs = await getAllAuditLogs({ action: 'Login', limit: 100 });
//
// Param shape:
//   {
//     userId?: number,         // filter by who performed the action
//     resourceType?: string,   // e.g., 'Claim', 'Policy', 'User'
//     action?: string,         // e.g., 'Login', 'CreateRule'
//     limit?: number,          // default 500, max 1000
//   }
export async function getAllAuditLogs(filters = {}) {
  const { userId, resourceType, action, limit } = filters;

  // Build query params object, dropping any null/empty values.
  // axios serializes this into a query string automatically.
  const params = {};
  if (userId)       params.userId = userId;
  if (resourceType) params.resourceType = resourceType;
  if (action)       params.action = action;
  if (limit)        params.limit = limit;

  const response = await api.get('/api/auditlogs', { params });

  // Wrap each raw API object as an AuditLogDto instance
  // so the page gets helpers like .resourceLabel and .actionCategory.
  return response.data.map((raw) => new AuditLogDto(raw));
}

// ── GET ONE AUDIT LOG BY ID ───────────────────────────────────────────────────
// Backend:  GET /api/auditlogs/{id}
// Returns:  AuditLogDto, or throws 404 if not found
// Who uses: Future detail page (not used in the current modal flow)
export async function getAuditLogById(id) {
  const response = await api.get(`/api/auditlogs/${id}`);
  return new AuditLogDto(response.data);
}