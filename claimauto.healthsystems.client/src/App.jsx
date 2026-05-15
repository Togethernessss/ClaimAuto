import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './security/AuthContext';
import { getDashboardPath } from './security/permissions';
import RequireAuth from './security/RequireAuth';
import AppLayout from './components/AppLayout';
import Login from './pages/identity/Login';
import VerifyMfa from './pages/identity/VerifyMfa';
import Register from './pages/identity/Register';
import Dashboard from './pages/Admin/Dashboard';
import AuditLogs from './pages/Admin/AuditLogs';
import HospitalDashboard from './pages/Hospital/Dashboard';
import HomePage from './pages/HomePage';
import Policies from './pages/shared/Policies/Policies';
import StaffDashboard from './pages/Staff/Dashboard';
import Members from './pages/shared/Members/Members';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./security/AuthContext";
import { getDashboardPath } from "./security/permissions";
import RequireAuth from "./security/RequireAuth";
import AppLayout from "./components/AppLayout";
import Login from "./pages/identity/Login";
import VerifyMfa from "./pages/identity/VerifyMfa";
import Register from "./pages/identity/Register";
import Dashboard from "./pages/Dashboard";
import AuditLogs from "./pages/Admin/AuditLogs";

import HomePage from "./pages/HomePage";
import Policies from "./pages/shared/Policies/Policies";
import Profile from './pages/identity/Profile';

// Smart redirect for the root URL "/"
// - If not logged in → send to /login
// - If logged in → send to their role-specific dashboard
function RootRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardPath(user.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public routes (no login needed) ── */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-mfa" element={<VerifyMfa />} />
          <Route path="/register"  element={<Register />} />
          

          <Route path="/register" element={<Register />} />

          {/* ── Protected routes (login required) ── */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/members" element={<Members />} />
            <Route path="/profile" element={<Profile />} />
            {/* More module pages will go here */}
          </Route>

          {/* Catch-all for typos / unknown URLs */}
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
