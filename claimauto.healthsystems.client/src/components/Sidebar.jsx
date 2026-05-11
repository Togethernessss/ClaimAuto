import { NavLink } from 'react-router-dom';
import { useAuth } from '../security/AuthContext';
import { getMenuForRole } from '../security/permissions';

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const menu = getMenuForRole(user.role);

  return (
    <aside
      className="d-flex flex-column flex-shrink-0 p-3 bg-white shadow-sm"
      style={{ width: 250, minHeight: 'calc(100vh - 60px)' }}
    >
      <div className="mb-3 text-uppercase text-muted small fw-bold">
        Menu &mdash; {user.role}
      </div>

      <ul className="nav nav-pills flex-column mb-auto">
        {menu.map((item) => (
          <li key={item.key} className="nav-item mb-1">
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-link d-flex align-items-center ${
                  isActive ? 'active' : 'text-dark'
                }`
              }
            >
              <i className={`${item.icon} me-2`}></i>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <hr />
      <div className="small text-muted">
        <i className="bi bi-info-circle me-1"></i>
        Showing {menu.length} item{menu.length !== 1 ? 's' : ''}
      </div>
    </aside>
  );
}