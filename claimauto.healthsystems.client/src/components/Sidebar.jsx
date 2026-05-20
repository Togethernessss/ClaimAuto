import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../security/AuthContext';
import { getMenuForRole } from '../security/permissions';
import { getAllAppeals } from '../services/appeals/appealService';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeAppealCount, setActiveAppealCount] = useState(0);

    const isStaff = user?.role === 'Admin' || user?.role === 'InsuranceStaff';

    const fetchAppealCount = useCallback(async () => {
        try {
            const data = await getAllAppeals();
            const active = data.filter(a => a.status === 'Filed' || a.status === 'UnderReview').length;
            setActiveAppealCount(active);
        } catch {
            // silent
        }
    }, []);

    useEffect(() => {
        fetchAppealCount();
        const interval = setInterval(fetchAppealCount, 30000);
        return () => clearInterval(interval);
    }, [fetchAppealCount]);

    if (!user) return null;

    const menu = getMenuForRole(user.role);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <aside
            className="p-3 flex-shrink-0 d-flex flex-column"
            style={{
                width: 250,
                minHeight: 'calc(100vh - 60px)',
                boxShadow: '2px 0 8px rgba(102, 126, 234, 0.15)',
                backgroundColor: '#ddd8f8',
            }}
        >
            {/* ── Menu items ── */}
            <nav className="flex-grow-1">
                {menu.map((item) => (
                    <NavLink
                        key={item.key}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                            `d-flex align-items-center text-decoration-none ${isActive ? 'fw-semibold text-white' : 'text-dark'
                            }`
                        }
                        style={({ isActive }) => ({
                            background: isActive
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'transparent',
                            borderRadius: 6,
                            padding: '8px 12px',
                            marginBottom: 4,
                            fontSize: 14,
                            boxShadow: isActive
                                ? '0 2px 6px rgba(102, 126, 234, 0.3)'
                                : 'none',
                            transition: 'background 0.15s',
                        })}
                    >
                        <i className={`${item.icon} me-2`} style={{ width: 16 }}></i>
                        {item.label}

                        {/* Appeal badge — show active count for staff */}
                        {item.key === 'appeals' && activeAppealCount > 0 && isStaff && (
                            <span
                                style={{
                                    marginLeft: 'auto',
                                    background: '#ef4444',
                                    color: '#fff',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    borderRadius: 20,
                                    padding: '1px 7px',
                                    minWidth: 20,
                                    textAlign: 'center',
                                }}
                            >
                                {activeAppealCount}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* ── Logout button ── */}
            <button
                className="btn btn-outline-danger d-flex align-items-center justify-content-center w-100 mb-2"
                onClick={handleLogout}
            >
                <i className="bi bi-box-arrow-right me-2"></i> Logout
            </button>

            {/* ── Footer ── */}
            <div
                className="pt-2 border-top text-center"
                style={{ fontSize: 12, color: '#6c757d' }}
            >
                <i className="bi bi-info-circle me-1"></i>
                Showing {menu.length} {menu.length === 1 ? 'item' : 'items'}
            </div>
        </aside>
    );
}