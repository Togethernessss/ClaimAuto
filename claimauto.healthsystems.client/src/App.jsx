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
import Profile from './pages/identity/Profile';
import ForceChangePassword from './pages/identity/ForceChangePassword';
import ForgotPassword from './pages/identity/ForgotPassword';
import ResetPassword from './pages/identity/ResetPassword';

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

            {/* All dashboard paths → Dashboard.jsx → role decides */}
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

            {/* Shared modules */}
            <Route path="/policies" element={<Policies />} />
            <Route path="/members"  element={<Members />} />
            <Route path="/claims"   element={<Claims />} />

            {/* Coming soon — uncomment as each module is built */}
            {/* <Route path="/adjudication"   element={<Adjudication />} /> */}
            {/* <Route path="/fraud"          element={<Fraud />} /> */}
            {/* <Route path="/payments"       element={<Payments />} /> */}
            {/* <Route path="/remittance"     element={<Remittance />} /> */}
            {/* <Route path="/appeals"        element={<Appeals />} /> */}
            {/* <Route path="/tasks"          element={<Tasks />} /> */}
            {/* <Route path="/notifications"  element={<Notifications />} /> */}
            {/* <Route path="/reports"        element={<Reports />} /> */}
            {/* <Route path="/rules"          element={<Rules />} /> */}
            {/* <Route path="/audit-packages" element={<AuditPackages />} /> */}

          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}