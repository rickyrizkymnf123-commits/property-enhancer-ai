import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredRole?: 'admin' | 'user';
  requireEntitlement?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredRole,
  requireEntitlement = true,
  redirectTo,
}) => {
  const { user, isLoading, isAdmin, isEntitled } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 text-slate-100">
        <LoadingSpinner size="lg" text="Memverifikasi akses..." />
      </div>
    );
  }

  // 1. Check authentication
  if (!user) {
    return <Navigate to={redirectTo || '/login'} state={{ from: location }} replace />;
  }

  // 2. Check role requirement
  const needsAdmin = requiredRole === 'admin' || (allowedRoles && allowedRoles.includes('admin') && !allowedRoles.includes('user'));
  if (needsAdmin) {
    if (!isAdmin) {
      // User is logged in but not admin
      return <Navigate to={isEntitled ? '/app' : '/login'} replace />;
    }
    return <>{children}</>;
  }

  // 3. Check PEA entitlement requirement
  if (requireEntitlement) {
    // Admin always has access to /app for testing/verification
    if (isAdmin) {
      return <>{children}</>;
    }

    if (!isEntitled) {
      // User does not have active PEA entitlement
      return <Navigate to={redirectTo || '/login'} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
