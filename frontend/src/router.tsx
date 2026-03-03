import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from './stores/auth.store.ts';

// Layouts
import { DashboardLayout } from './components/layout/DashboardLayout.tsx';
import { AuthLayout } from './components/layout/AuthLayout.tsx';
import { PublicLayout } from './components/layout/PublicLayout.tsx';
import { AdminLayout } from './components/layout/AdminLayout.tsx';

// Public pages
import { LandingPage } from './pages/LandingPage.tsx';
import { PricingPage } from './pages/PricingPage.tsx';
import { TermsPage } from './pages/TermsPage.tsx';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage.tsx';
import { RegisterPage } from './pages/auth/RegisterPage.tsx';
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage.tsx';

// Protected pages
import { DashboardPage } from './pages/dashboard/DashboardPage.tsx';
import { CompanyListPage } from './pages/companies/CompanyListPage.tsx';
import { CompanyDetailPage } from './pages/companies/CompanyDetailPage.tsx';
import { ContractorsPage } from './pages/contractors/ContractorsPage.tsx';
import { AuditLogPage } from './pages/audit/AuditLogPage.tsx';
import { SignaturesPage } from './pages/signatures/SignaturesPage.tsx';
import { CompanySignaturesPage } from './pages/signatures/CompanySignaturesPage.tsx';
import { StampsPage } from './pages/stamps/StampsPage.tsx';
import { VehiclesPage } from './pages/vehicles/VehiclesPage.tsx';
import { DocumentListPage } from './pages/documents/DocumentListPage.tsx';
import { DocumentDetailPage } from './pages/documents/DocumentDetailPage.tsx';
import { DocumentBuilderPage } from './pages/documents/DocumentBuilderPage.tsx';
import { ProfilePage } from './pages/profile/ProfilePage.tsx';

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.tsx';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage.tsx';
import { AdminPlansPage } from './pages/admin/AdminPlansPage.tsx';
import { AdminDocumentsPage } from './pages/admin/AdminDocumentsPage.tsx';
import { AdminCompaniesPage } from './pages/admin/AdminCompaniesPage.tsx';

// Checkout pages
import { CheckoutSuccessPage } from './pages/checkout/CheckoutSuccessPage.tsx';
import { CheckoutCancelPage } from './pages/checkout/CheckoutCancelPage.tsx';

// ── Loading Screen ──

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Auth Guard ──

function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ── Guest Guard (redirect authenticated users away from login/register) ──

function GuestGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ── Router Configuration ──

export const router = createBrowserRouter([
  // Public routes (landing, login, register)
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        path: '/pricing',
        element: <PricingPage />,
      },
      {
        path: '/terms',
        element: <TermsPage />,
      },
      {
        element: (
          <GuestGuard>
            <AuthLayout />
          </GuestGuard>
        ),
        children: [
          {
            path: '/login',
            element: <LoginPage />,
          },
          {
            path: '/register',
            element: <RegisterPage />,
          },
        ],
      },
    ],
  },

  // OAuth callback (no guard — handles token from query params)
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },

  // Checkout result pages (authenticated, no layout)
  {
    path: '/checkout/success',
    element: (
      <AuthGuard>
        <CheckoutSuccessPage />
      </AuthGuard>
    ),
  },
  {
    path: '/checkout/cancel',
    element: (
      <AuthGuard>
        <CheckoutCancelPage />
      </AuthGuard>
    ),
  },

  // Protected routes
  {
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/companies',
        element: <CompanyListPage />,
      },
      {
        path: '/companies/:companyId',
        element: <CompanyDetailPage />,
      },
      {
        path: '/companies/:companyId/documents',
        element: <DocumentListPage />,
      },
      {
        path: '/companies/:companyId/documents/:documentId',
        element: <DocumentDetailPage />,
      },
      {
        path: '/companies/:companyId/documents/:documentId/builder',
        element: <DocumentBuilderPage />,
      },
      {
        path: '/companies/:companyId/contractors',
        element: <ContractorsPage />,
      },
      {
        path: '/companies/:companyId/signatures',
        element: <CompanySignaturesPage />,
      },
      {
        path: '/companies/:companyId/stamps',
        element: <StampsPage />,
      },
      {
        path: '/companies/:companyId/vehicles',
        element: <VehiclesPage />,
      },
      {
        path: '/companies/:companyId/audit',
        element: <AuditLogPage />,
      },
      {
        path: '/signatures',
        element: <SignaturesPage />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
    ],
  },

  // Admin routes
  {
    element: (
      <AuthGuard>
        <AdminLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: '/admin',
        element: <AdminDashboardPage />,
      },
      {
        path: '/admin/users',
        element: <AdminUsersPage />,
      },
      {
        path: '/admin/users/:userId',
        element: <AdminUserDetailPage />,
      },
      {
        path: '/admin/plans',
        element: <AdminPlansPage />,
      },
      {
        path: '/admin/companies',
        element: <AdminCompaniesPage />,
      },
      {
        path: '/admin/documents',
        element: <AdminDocumentsPage />,
      },
    ],
  },

  // Catch-all redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
