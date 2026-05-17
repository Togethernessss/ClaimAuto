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
import Payments from "./pages/shared/Payments/Payments";
import Remittance from "./pages/shared/Remittance/Remittance";
import HomePage from "./pages/HomePage";
import Policies from "./pages/shared/Policies/Policies";
import PolicyholderDashboard from './pages/policyholder/PolicyholderDashboard';
import Members from './pages/shared/Members/Members';
import Profile from './pages/identity/Profile';
import ForceChangePassword from './pages/identity/ForceChangePassword';
import ForgotPassword from './pages/identity/ForgotPassword';
import ResetPassword from './pages/identity/ResetPassword';
import Notifications from './pages/shared/Notifications/Notifications';

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
          {/* ── Public routes ── */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-mfa" element={<VerifyMfa />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ── Protected routes ── */}
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
            <Route path="/payments" element={<Payments />} />
            <Route path="/remittance" element={<Remittance />} />
            <Route path="/policyholder" element={<PolicyholderDashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/members" element={<Members />} />
            <Route path="/force-change-password" element={<ForceChangePassword />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}