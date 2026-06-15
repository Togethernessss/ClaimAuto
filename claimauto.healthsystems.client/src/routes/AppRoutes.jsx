import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth }          from '../security/AuthContext';
import { getDashboardPath } from '../security/permissions';
import RequireAuth          from '../security/RequireAuth';
import RequireRole          from '../security/RequireRole';
import RedirectIfAuthed     from '../security/RedirectIfAuthed';
import AppLayout            from '../components/AppLayout';
import AccessDenied         from '../pages/AccessDenied';

// ── Public pages ──────────────────────────────────────────────
import HomePage            from '../pages/HomePage';
import Login               from '../pages/identity/Login';
import VerifyMfa           from '../pages/identity/VerifyMfa';
import Register            from '../pages/identity/Register';
import ForgotPassword      from '../pages/identity/ForgotPassword';
import ResetPassword       from '../pages/identity/ResetPassword';
import ForceChangePassword from '../pages/identity/ForceChangePassword';

// ── Role dashboards ───────────────────────────────────────────
import AdminDashboard        from '../pages/Admin/Dashboard';
import StaffDashboard        from '../pages/Staff/Dashboard';
import HospitalDashboard     from '../pages/Hospital/Dashboard';
import PolicyholderDashboard from '../pages/Policyholder/Dashboard';

// ── Admin only ────────────────────────────────────────────────
import AuditLogs   from '../pages/Admin/AuditLogs';
import Rules       from '../pages/Admin/Rules/Rules';
import AdminUsers  from '../pages/Admin/Users';

// ── Shared pages ──────────────────────────────────────────────
import Claims        from '../pages/shared/Claims/Claims';
import Appeals       from '../pages/shared/Appeals/Appeals';
import Policies      from '../pages/shared/Policies/Policies';
import Members       from '../pages/shared/Members/Members';
import Payments      from '../pages/shared/Payments/Payments';
import Remittance    from '../pages/shared/Remittance/Remittance';
import Fraud         from '../pages/shared/Fraud/Fraud';
import Reports       from '../pages/shared/Reports/Reports';
import Tasks         from '../pages/shared/Tasks/Tasks';
import Adjudication  from '../pages/shared/Adjudication/Adjudication';
import Notifications from '../pages/shared/Notifications/Notifications';
import Profile       from '../pages/identity/Profile';

// ── /dashboard → role's own dashboard ────────────────────────
function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={getDashboardPath(user.role)} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>

      {/* ════════════════════════════════════════════════════
          PUBLIC ROUTES
      ════════════════════════════════════════════════════ */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login"
        element={
          <RedirectIfAuthed><Login /></RedirectIfAuthed>
        }
      />
      <Route path="/verify-mfa"
        element={
          <RedirectIfAuthed><VerifyMfa /></RedirectIfAuthed>
        }
      />
      <Route path="/register"
        element={
          <RedirectIfAuthed><Register /></RedirectIfAuthed>
        }
      />
      <Route path="/forgot-password"
        element={
          <RedirectIfAuthed>
            <ForgotPassword />
          </RedirectIfAuthed>
        }
      />
      <Route path="/reset-password"
        element={
          <RedirectIfAuthed>
            <ResetPassword />
          </RedirectIfAuthed>
        }
      />

      {/* ════════════════════════════════════════════════════
          PROTECTED — must be logged in
      ════════════════════════════════════════════════════ */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>

          {/* ── Identity — all roles ───────────────────── */}
          <Route
            path="/profile"
            element={<Profile />}
          />
          <Route
            path="/force-change-password"
            element={<ForceChangePassword />}
          />

          {/* ── /dashboard → role redirect ─────────────── */}
          <Route
            path="/dashboard"
            element={<DashboardRedirect />}
          />

          {/* ── Legacy redirects ───────────────────────── */}
          <Route
            path="/audit-logs"
            element={
              <Navigate to="/admin/audit-logs" replace />
            }
          />
          <Route
            path="/rules"
            element={
              <Navigate to="/admin/rules" replace />
            }
          />

          {/* ════════════════════════════════════════════
              ADMIN ONLY
          ════════════════════════════════════════════ */}
          <Route element={<RequireRole roles={['Admin']} />}>
            <Route
              path="/admin/dashboard"
              element={<AdminDashboard />}
            />
            <Route
              path="/admin/audit-logs"
              element={<AuditLogs />}
            />
            <Route
              path="/admin/rules"
              element={<Rules />}
            />
            <Route
              path="/admin/users"
              element={<AdminUsers />}
            />
            <Route
              path="/admin/claims"
              element={<Claims />}
            />
            <Route
              path="/admin/payments"
              element={<Payments />}
            />
            <Route
              path="/admin/remittance"
              element={<Remittance />}
            />
            <Route
              path="/admin/members"
              element={<Members />}
            />
            <Route
              path="/admin/policies"
              element={<Policies />}
            />
            <Route
              path="/admin/adjudication"
              element={<Adjudication />}
            />
            <Route
              path="/admin/fraud"
              element={<Fraud />}
            />
            <Route
              path="/admin/reports"
              element={<Reports />}
            />
            <Route
              path="/admin/tasks"
              element={<Tasks />}
            />
            <Route
              path="/admin/appeals"
              element={<Appeals />}
            />
            <Route
              path="/admin/notifications"
              element={<Notifications />}
            />
          </Route>

          {/* ════════════════════════════════════════════
              STAFF ONLY
          ════════════════════════════════════════════ */}
          <Route
            element={
              <RequireRole roles={['InsuranceStaff']} />
            }
          >
            <Route
              path="/staff/dashboard"
              element={<StaffDashboard />}
            />
            <Route
              path="/staff/claims"
              element={<Claims />}
            />
            <Route
              path="/staff/payments"
              element={<Payments />}
            />
            <Route
              path="/staff/remittance"
              element={<Remittance />}
            />
            <Route
              path="/staff/members"
              element={<Members />}
            />
            <Route
              path="/staff/policies"
              element={<Policies />}
            />
            <Route
              path="/staff/adjudication"
              element={<Adjudication />}
            />
            <Route
              path="/staff/fraud"
              element={<Fraud />}
            />
            <Route
              path="/staff/reports"
              element={<Reports />}
            />
            <Route
              path="/staff/tasks"
              element={<Tasks />}
            />
            <Route
              path="/staff/appeals"
              element={<Appeals />}
            />
            <Route
              path="/staff/notifications"
              element={<Notifications />}
            />
          </Route>

          {/* ════════════════════════════════════════════
              HOSPITAL ONLY
          ════════════════════════════════════════════ */}
          <Route
            element={<RequireRole roles={['Hospital']} />}
          >
            <Route
              path="/hospital/dashboard"
              element={<HospitalDashboard />}
            />
            <Route
              path="/hospital/claims"
              element={<Claims />}
            />
            <Route
              path="/hospital/remittance"
              element={<Remittance />}
            />
            <Route
              path="/hospital/members"
              element={<Members />}
            />
            <Route
              path="/hospital/policies"
              element={<Policies />}
            />
            <Route
              path="/hospital/appeals"
              element={<Appeals />}
            />
            <Route
              path="/hospital/notifications"
              element={<Notifications />}
            />
          </Route>

          {/* ════════════════════════════════════════════
              POLICYHOLDER ONLY
          ════════════════════════════════════════════ */}
          <Route
            element={
              <RequireRole roles={['Policyholder']} />
            }
          >
            <Route
              path="/policyholder/dashboard"
              element={<PolicyholderDashboard />}
            />
            <Route
              path="/policyholder/claims"
              element={<Claims />}
            />
            <Route
              path="/policyholder/policies"
              element={<Policies />}
            />
            <Route
              path="/policyholder/appeals"
              element={<Appeals />}
            />
            <Route
              path="/policyholder/notifications"
              element={<Notifications />}
            />
          </Route>

          {/* 
              CATCH-ALL — inside AppLayout
              Always shows with sidebar + navbar
              */}
          <Route path="*" element={<AccessDenied />} />

        </Route>
      </Route>

      {/* Not logged in + unknown → HomePage */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}