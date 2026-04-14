import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { Dashboard } from './pages/Dashboard';
import { TeamHierarchy } from './pages/TeamHierarchy';
import { AuthProvider, useAuth } from './services/AuthContext';
import { Login } from './pages/Login';

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; // No UI flicker during fast checks
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && (user.role !== 'owner' && user.role !== 'admin')) return <Navigate to="/" replace />;
  
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <>
                  <TopNav />
                  <main className="container" style={{ marginTop: '24px' }}>
                    <Dashboard />
                  </main>
                </>
              </ProtectedRoute>
            } />
            <Route path="/team" element={
              <ProtectedRoute requireAdmin={true}>
                <>
                  <TopNav />
                  <main className="container" style={{ marginTop: '24px' }}>
                    <TeamHierarchy />
                  </main>
                </>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
