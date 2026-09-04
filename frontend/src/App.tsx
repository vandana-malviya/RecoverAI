import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FailedPaymentsPage } from './pages/FailedPaymentsPage';
import { PaymentDetailPage } from './pages/PaymentDetailPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { DemoCenterPage } from './pages/DemoCenterPage';
import { AgentActivityPage } from './pages/AgentActivityPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Layout Area */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />

        {/* Page Content Container */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/payments" element={<FailedPaymentsPage />} />
            <Route path="/payments/:paymentId" element={<PaymentDetailPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/demo" element={<DemoCenterPage />} />
            <Route path="/activity" element={<AgentActivityPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
