import { useState, useEffect, useCallback } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { useAuth } from '../../../security/AuthContext';
import { getAllTasks } from '../../../services/tasks/taskService';
import TasksHeader from './components/TasksHeader';
import TasksFilters from './components/TasksFilters';
import TasksSummary from './components/TasksSummary';
import TasksTable from './components/TasksTable';
import CreateTaskModal from './components/CreateTaskModal';
import TaskDetailModal from './components/TaskDetailModal';
import CompleteTaskModal from './components/CompleteTaskModal';

export default function Tasks() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'Admin';

    // ─── Data ──────────────────────────────────────────
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // ─── Filters ───────────────────────────────────────
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [search, setSearch] = useState('');

    // ─── Modals ────────────────────────────────────────
    const [showCreate, setShowCreate] = useState(false);
    const [detailTask, setDetailTask] = useState(null);
    const [completeTask, setCompleteTask] = useState(null);

    // ─── Messages ──────────────────────────────────────
    const [msg, setMsg] = useState(null);

    const flash = (text, variant = 'success') => {
        setMsg({ text, variant });
        setTimeout(() => setMsg(null), 5000);
    };

    // ─── Load tasks ────────────────────────────────────
    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllTasks(null, statusFilter || null, priorityFilter || null);
            setTasks(data);
        } catch {
            flash('Failed to load tasks.', 'danger');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, priorityFilter]);

    useEffect(() => { refresh(); }, [refresh]);

    // ─── Client-side search ────────────────────────────
    const filtered = tasks.filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            t.description?.toLowerCase().includes(q) ||
            t.assignedToName?.toLowerCase().includes(q) ||
            String(t.taskID).includes(q) ||
            String(t.claimID).includes(q)
        );
    });

    return (
        <Container fluid className="px-4 pb-4">
            {msg && (
                <Alert
                    variant={msg.variant}
                    dismissible
                    onClose={() => setMsg(null)}
                    className="mb-3"
                >
                    {msg.text}
                </Alert>
            )}

            <TasksHeader onCreateClick={() => setShowCreate(true)} />

            <TasksFilters
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
                search={search}
                setSearch={setSearch}
            />

            <TasksSummary tasks={tasks} />

            <TasksTable
                tasks={filtered}
                loading={loading}
                isAdmin={isAdmin}
                onView={setDetailTask}
                onComplete={setCompleteTask}
                onRefresh={refresh}
                flash={flash}
            />

            {/* ─── Modals ─── */}
            <CreateTaskModal
                show={showCreate}
                onHide={() => setShowCreate(false)}
                onCreated={() => { refresh(); flash('Task created successfully.'); }}
            />

            <TaskDetailModal
                show={!!detailTask}
                onHide={() => setDetailTask(null)}
                task={detailTask}
            />

            <CompleteTaskModal
                show={!!completeTask}
                onHide={() => setCompleteTask(null)}
                task={completeTask}
                onCompleted={() => { refresh(); flash('Task marked as completed.'); }}
            />
        </Container>
    );
}