import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider, useAuth } from './components/Auth';
import { PortfolioProvider } from './components/Portfolio';
import { Sidebar } from './components/Navigation';
import {
  LoginPage,
  DashboardPage,
  MyPortfolioPage,
  RiskAnalysisPage,
  NextInvestmentPage
} from './pages';
import UpstoxCallbackPage from './pages/UpstoxCallback';
import ZerodhaCallbackPage from './pages/ZerodhaCallback';
import './styles/index.css';

// Simple loading component
function LoadingScreen() {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner" />
        <div className="loading-text">Loading</div>
      </div>
    </div>
  );
}

// Protected route - shows content if authenticated, Login if not
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Public route - shows Login, redirects to Dashboard if already logged in
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

// Main app layout with sidebar and portfolio context
function AppLayout({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return children;
  }

  return (
    <PortfolioProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </PortfolioProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/portfolio" element={
        <ProtectedRoute>
          <AppLayout>
            <MyPortfolioPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/risk" element={
        <ProtectedRoute>
          <AppLayout>
            <RiskAnalysisPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/advisor" element={
        <ProtectedRoute>
          <AppLayout>
            <NextInvestmentPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/callback/upstox" element={
        <ProtectedRoute>
          <UpstoxCallbackPage />
        </ProtectedRoute>
      } />
      <Route path="/zerodha-callback" element={
        <ProtectedRoute>
          <ZerodhaCallbackPage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Analytics />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;


