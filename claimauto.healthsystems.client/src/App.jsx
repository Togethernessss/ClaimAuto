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
import Members from './pages/shared/Members/Members';
import Claims from './pages/shared/Claims/Claims';
import Adjudication from './pages/shared/Adjudication/Adjudication';
import Rules from './pages/Admin/Rules/Rules';
import Fraud from './pages/shared/Fraud/Fraud';
import Payments from "./pages/shared/Payments/Payments";
import Remittance from "./pages/shared/Remittance/Remittance";
import Notifications from './pages/shared/Notifications/Notifications';
//import Profile from './pages/identity/Profile';
import ForceChangePassword from './pages/identity/ForceChangePassword';
import ForgotPassword from './pages/identity/ForgotPassword';
import ResetPassword from './pages/identity/ResetPassword';
import Profile from './pages/profile/ProfilePage';

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
          <Route path="/"                element={<HomePage />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/verify-mfa"      element={<VerifyMfa />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />

          {/* ── Protected routes ── */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>

            {/* All dashboard paths */}
            <Route path="/dashboard"              element={<Dashboard />} />
            <Route path="/admin/dashboard"        element={<Dashboard />} />
            <Route path="/staff/dashboard"        element={<Dashboard />} />
            <Route path="/hospital/dashboard"     element={<Dashboard />} />
            <Route path="/policyholder/dashboard" element={<Dashboard />} />

            {/* Identity */}
            <Route path="/profile"               element={<Profile />} />
            <Route path="/force-change-password" element={<ForceChangePassword />} />

            {/* Admin only */}
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/rules"      element={<Rules />} />

            {/* Shared modules ✅ */}
            <Route path="/policies"      element={<Policies />} />
            <Route path="/members"       element={<Members />} />
            <Route path="/claims"        element={<Claims />} />
            <Route path="/adjudication"  element={<Adjudication />} />
            <Route path="/payments"      element={<Payments />} />
            <Route path="/remittance"    element={<Remittance />} />
            <Route path="/notifications" element={<Notifications />} />
            

            {/* Coming soon */}
          <Route path="/fraud" element={<Fraud />} />
            {/* <Route path="/appeals"        element={<Appeals />} /> */}
            {/* <Route path="/tasks"          element={<Tasks />} /> */}
            {/* <Route path="/reports"        element={<Reports />} /> */}
            {/* <Route path="/audit-packages" element={<AuditPackages />} /> */}

          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
