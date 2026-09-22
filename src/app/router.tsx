import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute, PublicRoute } from '@/lib/guards';

import { LandingPage } from '@/features/auth/LandingPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';

import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DriverDashboardPage } from '@/features/dashboard/DriverDashboardPage';

import { VehiclesPage } from '@/features/vehicles/VehiclesPage';
import { DriversPage } from '@/features/drivers/DriversPage';
import { DocumentsPage } from '@/features/documents/DocumentsPage';
import { TripsPage } from '@/features/trips/TripsPage';
import { TrackingPage } from '@/features/tracking/TrackingPage';
import { ExpensesPage } from '@/features/expenses/ExpensesPage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { MaintenancePage } from '@/features/maintenance/MaintenancePage';

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['owner', 'manager']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/vehicles', element: <VehiclesPage /> },
          { path: '/drivers', element: <DriversPage /> },
          { path: '/documents', element: <DocumentsPage /> },
          { path: '/tracking', element: <TrackingPage /> },
          { path: '/trips', element: <TripsPage /> },
          { path: '/expenses', element: <ExpensesPage /> },
          { path: '/analytics', element: <AnalyticsPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/maintenance', element: <MaintenancePage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['driver']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/driver', element: <DriverDashboardPage /> },
          { path: '/driver/trips', element: <TripsPage /> },
          { path: '/driver/expenses', element: <ExpensesPage /> },
          { path: '/driver/documents', element: <DocumentsPage /> },
          { path: '/driver/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
