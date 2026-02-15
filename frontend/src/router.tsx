import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from './stores/auth.store.ts';

// Layouts
import { DashboardLayout } from './components/layout/DashboardLayout.tsx';
import { AuthLayout } from './components/layout/AuthLayout.tsx';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage.tsx';
import { RegisterPage } from './pages/auth/RegisterPage.tsx';
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage.tsx';

// Protected pages
import { DashboardPage } from './pages/dashboard/DashboardPage.tsx';
import { CompanyListPage } from './pages/companies/CompanyListPage.tsx';
import { CompanyDetailPage } from './pages/companies/CompanyDetailPage.tsx';
import { ContactsPage } from './pages/contacts/ContactsPage.tsx';
import { AuditLogPage } from './pages/audit/AuditLogPage.tsx';
import { SignaturesPage } from './pages/signatures/SignaturesPage.tsx';
import { CompanySignaturesPage } from './pages/signatures/CompanySignaturesPage.tsx';
import { StampsPage } from './pages/stamps/StampsPage.tsx';
import { VehiclesPage } from './pages/vehicles/VehiclesPage.tsx';
import { DocumentListPage } from './pages/documents/DocumentListPage.tsx';
import { DocumentDetailPage } from './pages/documents/DocumentDetailPage.tsx';
import { DocumentBuilderPage } from './pages/documents/DocumentBuilderPage.tsx';
import { ProfilePage } from './pages/profile/ProfilePage.tsx';

// ── Auth Guard ──

function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ── Guest Guard (redirect authenticated users away from login/register) ──

function GuestGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ── Router Configuration ──

export const router = createBrowserRouter([
  // Public routes
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

  // OAuth callback (no guard — handles token from query params)
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
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
        path: '/companies/:companyId/contacts',
        element: <ContactsPage />,
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

  // Catch-all redirect
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
