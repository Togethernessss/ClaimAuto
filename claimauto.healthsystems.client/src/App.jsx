import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './security/AuthContext';
import RequireAuth from './security/RequireAuth';
import AppLayout from './components/AppLayout';
import Login from './pages/identity/Login';
import VerifyMfa from './pages/identity/VerifyMfa';
import Register from './pages/identity/Register';
import Dashboard from './pages/Dashboard';
import AuditLogs from './pages/AuditLogs';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/verify-mfa" element={<VerifyMfa />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — wrapped in AppLayout (navbar + sidebar) */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            {/* More module pages will go here */}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}