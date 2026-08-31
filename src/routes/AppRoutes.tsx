import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import ProtectedRoute from './ProtectedRoute';

// User Portal Pages (Milestone 4 - R3)
import DashboardPage from '../pages/app/DashboardPage';
import EditorPage from '../pages/app/EditorPage';
import GalleryPage from '../pages/app/GalleryPage';
import ProjectsPage from '../pages/app/ProjectsPage';
import SettingsPage from '../pages/app/SettingsPage';

// Admin Pages (Milestone 5 - R4)
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminProvidersPage from '../pages/admin/AdminProvidersPage';
import AdminKeysPage from '../pages/admin/AdminKeysPage';
import AdminUsagePage from '../pages/admin/AdminUsagePage';
import AdminNotificationsPage from '../pages/admin/AdminNotificationsPage';
import AdminAuditLogsPage from '../pages/admin/AdminAuditLogsPage';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected User Portal Routes (R3) */}
      <Route
        path="/app"
        element={
          <ProtectedRoute requireEntitlement={true}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/editor"
        element={
          <ProtectedRoute requireEntitlement={true}>
            <EditorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/gallery"
        element={
          <ProtectedRoute requireEntitlement={true}>
            <GalleryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/projects"
        element={
          <ProtectedRoute requireEntitlement={true}>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings"
        element={
          <ProtectedRoute requireEntitlement={true}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Routes (R4) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin" allowedRoles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin" allowedRoles={['admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/providers"
        element={<Navigate to="/admin/keys" replace />}
      />
      <Route
        path="/admin/keys"
        element={
          <ProtectedRoute requiredRole="admin" allowedRoles={['admin']}>
            <AdminKeysPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usage"
        element={
          <ProtectedRoute requiredRole="admin" allowedRoles={['admin']}>
            <AdminUsagePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute requiredRole="admin" allowedRoles={['admin']}>
            <AdminNotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute requiredRole="admin" allowedRoles={['admin']}>
            <AdminAuditLogsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute requiredRole="admin" allowedRoles={['admin']}>
            <AdminSettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
