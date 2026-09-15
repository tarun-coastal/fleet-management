import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store';
import type { Role } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on role if they try to access something they shouldn't
    return <Navigate to={user.role === 'driver' ? '/driver' : '/dashboard'} replace />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { token, user } = useAuthStore();
  
  if (token && user) {
    return <Navigate to={user.role === 'driver' ? '/driver' : '/dashboard'} replace />;
  }

  return <Outlet />;
}
