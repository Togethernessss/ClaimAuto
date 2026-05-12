import { NavLink } from 'react-router-dom';
import { useAuth } from '../security/AuthContext';
import { getMenuForRole } from '../security/permissions';

// Sidebar — renders the role-specific menu by reading permissions.js.
// Active link uses the purple theme gradient (#667eea → #764ba2) to match
// the welcome banner across all dashboards.

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const menu = getMenuForRole(user.role);

  return (
    <aside
      className="bg-white p-3 flex-shrink-0"
      style={{
        width: 250,
        minHeight: 'calc(100vh - 60px)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Menu header */}
      <div
        className="text-uppercase fw-bold mb-3"
        style={{ color: '#6c757d', fontSize: 12 }}
      >
        Menu — {user.role}
      </div>

      {/* Menu items */}
      <nav>
        {menu.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `d-flex align-items-center text-decoration-none ${
                isActive ? 'fw-semibold text-white' : 'text-dark'
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
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="mt-4 pt-3 border-top"
        style={{ fontSize: 12, color: '#6c757d' }}
      >
        <i className="bi bi-info-circle me-1"></i>
        Showing {menu.length} {menu.length === 1 ? 'item' : 'items'}
      </div>
    </aside>
  );
}