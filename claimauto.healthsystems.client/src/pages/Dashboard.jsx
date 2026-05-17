import { useAuth } from '../security/AuthContext';
import AdminDashboard        from './Admin/Dashboard';
import StaffDashboard        from './Staff/Dashboard';
import HospitalDashboard     from './Hospital/Dashboard';
import PolicyholderDashboard from './Policyholder/Dashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'Admin')          return <AdminDashboard />;
  if (user?.role === 'InsuranceStaff') return <StaffDashboard />;
  if (user?.role === 'Hospital')       return <HospitalDashboard />;
  if (user?.role === 'Policyholder')   return <PolicyholderDashboard />;

  return <div>Unknown role</div>;
}