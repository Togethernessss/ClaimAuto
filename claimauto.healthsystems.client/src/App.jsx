import { BrowserRouter } from 'react-router-dom';
import { AuthProvider }  from './security/AuthContext';
import AppRoutes         from './routes/AppRoutes';
import ToastContainer    from './components/ToastContainer';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        {/* Global toast overlay — sits above all pages, survives navigation */}
        <ToastContainer />
      </BrowserRouter>
    </AuthProvider>
  );
}