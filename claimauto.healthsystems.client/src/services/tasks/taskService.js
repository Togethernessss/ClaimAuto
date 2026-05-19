import api from '../../api/axiosClient';

// ─── Tasks CRUD ─────────────────────────────────────────

export async function getAllTasks(assignedTo, status, priority) {
    const params = {};
    if (assignedTo) params.assignedTo = assignedTo;
    if (status) params.status = status;
    if (priority) params.priority = priority;
    const res = await api.get('/api/tasks', { params });
    return res.data;
}

export async function getOverdueTasks() {
    const res = await api.get('/api/tasks/overdue');
    return res.data;
}

export async function getTaskById(id) {
    const res = await api.get(`/api/tasks/${id}`);
    return res.data;
}

export async function createTask(dto) {
    const res = await api.post('/api/tasks', dto);
    return res.data;
}

export async function updateTask(id, dto) {
    const res = await api.put(`/api/tasks/${id}`, dto);
    return res.data;
}

export async function completeTask(id) {
    const res = await api.put(`/api/tasks/${id}/complete`);
    return res.data;
}

export async function deleteTask(id) {
    const res = await api.delete(`/api/tasks/${id}`);
    return res.data;
}

// ─── Staff users (for "Assign To" dropdown) ─────────────
// GET /api/users is Admin-only, so Staff will get a 403.
// We catch that gracefully — the modal falls back to self-assignment.
export async function getAssignableUsers() {
    try {
        const res = await api.get('/api/users');
        // Only Admin + InsuranceStaff can be assigned tasks
        return res.data.filter(
            u => u.role === 'Admin' || u.role === 'InsuranceStaff'
        );
    } catch {
        return []; // Staff users can't list others → empty
    }
}