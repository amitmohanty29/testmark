import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GovHeader } from './components/layout/GovHeader';
import { GovNavbar } from './components/layout/GovNavbar';
import { GovFooter } from './components/layout/GovFooter';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { InstrumentsList } from './pages/InstrumentsList';
import { InstrumentDetail } from './pages/InstrumentDetail';
import { EvaluationsList } from './pages/EvaluationsList';
import { EvaluationDetail } from './pages/EvaluationDetail';
import { PassportsList } from './pages/PassportsList';
import { DigitalPassport } from './pages/DigitalPassport';
import { PlaceholderPage } from './pages/PlaceholderPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#006c51] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gov-sand-700 font-medium">Validating Metrology Credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gov-sand-50 text-gov-sand-900">
      <GovHeader />
      {isAuthenticated && <GovNavbar />}
      <main className="flex-1">
        {children}
      </main>
      <GovFooter />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/instruments"
              element={
                <ProtectedRoute>
                  <InstrumentsList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/instruments/:id"
              element={
                <ProtectedRoute>
                  <InstrumentDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/evaluations"
              element={
                <ProtectedRoute>
                  <EvaluationsList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/evaluations/:id"
              element={
                <ProtectedRoute>
                  <EvaluationDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/passports"
              element={
                <ProtectedRoute>
                  <PassportsList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/passport/:id"
              element={
                <ProtectedRoute>
                  <DigitalPassport />
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <PlaceholderPage
                    title="OIML R-76 Test Report Generation Engine"
                    moduleName="Automated Report Module"
                    description="Standardized automated report generation and certificate formatting in accordance with OIML R 76-2 (Test Report Format). Will generate signed PDF test certificates directly from evaluation data."
                    iconType="report"
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <PlaceholderPage
                    title="National Metrology Cross-Registry Search"
                    moduleName="Unified Registry Search"
                    description="Federated query interface across all State Legal Metrology Divisions, RRSL Regional Laboratories, and Pattern Approval directories."
                    iconType="search"
                  />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
