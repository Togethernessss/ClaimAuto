import RedirectIfAuthed from "./security/RedirectIfAuthed";
// import RequireRole from "./security/RequireRole";
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
import Appeals from './pages/shared/Appeals/Appeals';
import Policies from "./pages/shared/Policies/Policies";
import Tasks from './pages/shared/Tasks/Tasks';
import Members from './pages/shared/Members/Members';
import Claims from './pages/shared/Claims/Claims';
import Adjudication from './pages/shared/Adjudication/Adjudication';
import Rules from './pages/Admin/Rules/Rules';
import Fraud from './pages/shared/Fraud/Fraud';
import Payments from "./pages/shared/Payments/Payments";
import Remittance from "./pages/shared/Remittance/Remittance";
import Notifications from './pages/shared/Notifications/Notifications';
import Profile from './pages/identity/Profile';
import ForceChangePassword from './pages/identity/ForceChangePassword';
import ForgotPassword from './pages/identity/ForgotPassword';
import ResetPassword from './pages/identity/ResetPassword';
import Reports from './pages/shared/Reports/Reports';
import RequireRole from './security/RequireRole';

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
          <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
          <Route path="/verify-mfa" element={<RedirectIfAuthed><VerifyMfa /></RedirectIfAuthed>} />
          <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
          <Route path="/forgot-password" element={<RedirectIfAuthed><ForgotPassword /></RedirectIfAuthed>} />
          <Route path="/reset-password" element={<RedirectIfAuthed><ResetPassword /></RedirectIfAuthed>} />
          {/* ── Protected routes ── */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>

            {/* All dashboard paths */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/staff/dashboard" element={<Dashboard />} />
            <Route path="/hospital/dashboard" element={<Dashboard />} />
            <Route path="/policyholder/dashboard" element={<Dashboard />} />

            {/* Identity */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/force-change-password" element={<ForceChangePassword />} />

            {/* Admin only */}
            <Route
              path="/audit-logs"
              element={
                <RequireRole roles={['Admin']}>
                  <AuditLogs />
                </RequireRole>
              }
            />
            <Route path="/rules" element={<Rules />} />

            {/* Shared modules ✅ */}
            <Route
              path="/policies"
              element={
                <RequireRole roles={['Admin', 'InsuranceStaff', 'Hospital']}>
                  <Policies />
                </RequireRole>
              }
            />
            <Route path="/members" element={<RequireRole roles={['Admin', 'InsuranceStaff', 'Hospital']}><Members /></RequireRole>} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/adjudication" element={<Adjudication />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/remittance" element={<Remittance />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reports" element={<Reports />} />

            {/* Coming soon */}
            <Route path="/fraud" element={<Fraud />} />
            <Route path="/appeals" element={<Appeals />} />
            <Route path="/tasks" element={<Tasks />} />
            {/* <Route path="/audit-packages" element={<AuditPackages />} /> */}

          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
