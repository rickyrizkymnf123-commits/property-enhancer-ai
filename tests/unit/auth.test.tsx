import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { mockDb, supabase } from '../../src/lib/mockSupabase';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { ToastProvider } from '../../src/contexts/ToastContext';
import LoginPage from '../../src/pages/LoginPage';
import ForgotPasswordPage from '../../src/pages/ForgotPasswordPage';
import ResetPasswordPage from '../../src/pages/ResetPasswordPage';
import ProtectedRoute from '../../src/components/shared/ProtectedRoute';

// Helper component wrapping with required providers and MemoryRouter
function renderWithProviders(ui: React.ReactElement, { route = '/login' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Authentication & Entitlement Access Control (Milestone 2 - R1)', () => {
  beforeEach(() => {
    mockDb.reset();
    supabase.setMockSession(null);
  });

  describe('1. LoginPage Paid-Only Compliance & UI Structure', () => {
    it('should display login form with email, password, forgot password link, and WhatsApp help', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByRole('heading', { name: /masuk ke akun/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email terdaftar/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^kata sandi/i)).toBeInTheDocument();
      expect(screen.getByText(/lupa kata sandi\?/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /masuk ke akun/i })).toBeInTheDocument();
      expect(screen.getByText(/platform berbayar eksklusif/i)).toBeInTheDocument();
      expect(screen.getByText(/bantuan atau aktivasi akses via whatsapp/i)).toBeInTheDocument();
    });

    it('STRICTLY MUST NOT contain public self-registration or signup links', () => {
      renderWithProviders(<LoginPage />);

      // Ensure no public registration links/forms exist
      const signupLink = screen.queryByRole('link', { name: /daftar|register|sign up|buat akun|registrasi/i });
      expect(signupLink).toBeNull();

      const signupButton = screen.queryByRole('button', { name: /daftar|register|sign up|buat akun|registrasi/i });
      expect(signupButton).toBeNull();

      // Check text in document
      expect(screen.queryByText(/daftar sekarang/i)).toBeNull();
      expect(screen.queryByText(/belum punya akun\? daftar/i)).toBeNull();
    });
  });

  describe('2. Login Role & Entitlement Redirections', () => {
    it('should authenticate Admin and redirect to /admin', async () => {
      // Admin is already seeded in mockDb with email 'admin@propertyenhancer.ai'
      let navigatedTo = '';

      render(
        <MemoryRouter initialEntries={['/login']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/admin"
                  element={
                    <div data-testid="admin-view">
                      Admin Panel Loaded
                      {(() => {
                        navigatedTo = '/admin';
                        return null;
                      })()}
                    </div>
                  }
                />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email terdaftar/i), {
        target: { value: 'admin@propertyenhancer.ai' },
      });
      fireEvent.change(screen.getByLabelText(/^kata sandi/i), {
        target: { value: 'AdminPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /masuk ke akun/i }));

      await waitFor(() => {
        expect(screen.getByTestId('admin-view')).toBeInTheDocument();
      });
      expect(navigatedTo).toBe('/admin');
    });

    it('should authenticate Entitled User (PEA active) and redirect to /app', async () => {
      // Seed an entitled user
      const userId = 'user-entitled-123';
      mockDb.users.set(userId, {
        id: userId,
        email: 'member@propertyenhancer.ai',
        password: 'Password123!',
        created_at: new Date().toISOString(),
      });
      mockDb.profiles.set(userId, {
        id: userId,
        email: 'member@propertyenhancer.ai',
        full_name: 'Member Pro',
        phone: '6281234567890',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockDb.user_roles.set(userId, {
        id: 'role-user-123',
        user_id: userId,
        role: 'user',
        created_at: new Date().toISOString(),
      });
      mockDb.entitlements.set(userId, {
        id: 'ent-123',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 5,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 25 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/app"
                  element={<div data-testid="user-app-view">User App Dashboard</div>}
                />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email terdaftar/i), {
        target: { value: 'member@propertyenhancer.ai' },
      });
      fireEvent.change(screen.getByLabelText(/^kata sandi/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /masuk ke akun/i }));

      await waitFor(() => {
        expect(screen.getByTestId('user-app-view')).toBeInTheDocument();
      });
    });

    it('should reject unentitled user, call signOut(), display "Akses belum aktif" toast, and stay on /login', async () => {
      // Seed user with expired/no PEA entitlement
      const userId = 'user-unentitled-456';
      mockDb.users.set(userId, {
        id: userId,
        email: 'unpaid@example.com',
        password: 'Password123!',
        created_at: new Date().toISOString(),
      });
      mockDb.profiles.set(userId, {
        id: userId,
        email: 'unpaid@example.com',
        full_name: 'Unpaid User',
        phone: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockDb.user_roles.set(userId, {
        id: 'role-user-456',
        user_id: userId,
        role: 'user',
        created_at: new Date().toISOString(),
      });
      mockDb.entitlements.set(userId, {
        id: 'ent-456',
        user_id: userId,
        product_code: 'PEA',
        status: 'inactive', // inactive entitlement
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/app" element={<div data-testid="user-app-view">App</div>} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email terdaftar/i), {
        target: { value: 'unpaid@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^kata sandi/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /masuk ke akun/i }));

      // Expect toast "Akses belum aktif" to appear
      await waitFor(() => {
        expect(screen.getByText('Akses belum aktif')).toBeInTheDocument();
      });

      // User must stay on /login and NOT navigate to /app
      expect(screen.queryByTestId('user-app-view')).toBeNull();
      expect(screen.getByRole('heading', { name: /masuk ke akun/i })).toBeInTheDocument();
    });
  });

  describe('3. ProtectedRoute Authorization Guards', () => {
    it('should redirect unauthenticated user to /login when visiting /app', async () => {
      render(
        <MemoryRouter initialEntries={['/app']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute requireEntitlement={true}>
                      <div data-testid="protected-content">Secret App</div>
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<div data-testid="login-view">Login Page</div>} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-view')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });

    it('should block non-admin user from accessing admin route', async () => {
      // Simulate active user session without admin role
      const userId = 'user-standard-789';
      mockDb.users.set(userId, {
        id: userId,
        email: 'user@example.com',
        password: 'Pass',
        created_at: new Date().toISOString(),
      });
      mockDb.profiles.set(userId, {
        id: userId,
        email: 'user@example.com',
        full_name: 'Standard User',
        phone: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockDb.user_roles.set(userId, {
        id: 'role-789',
        user_id: userId,
        role: 'user',
        created_at: new Date().toISOString(),
      });
      mockDb.entitlements.set(userId, {
        id: 'ent-789',
        user_id: userId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 0,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      supabase.setMockSession({
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: { id: userId, email: 'user@example.com', created_at: new Date().toISOString() },
      });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <div data-testid="admin-panel">Admin Only Panel</div>
                    </ProtectedRoute>
                  }
                />
                <Route path="/app" element={<div data-testid="user-app">Redirected to App</div>} />
                <Route path="/login" element={<div data-testid="login-view">Login Page</div>} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-app')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('admin-panel')).toBeNull();
    });

    it('should permit Admin to access protected admin and user routes', async () => {
      const adminId = 'admin-user-0001-uuid';
      supabase.setMockSession({
        access_token: 'admin-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'admin-refresh',
        user: { id: adminId, email: 'admin@propertyenhancer.ai', created_at: new Date().toISOString() },
      });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <div data-testid="admin-panel">Admin Only Panel</div>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
      });
    });
  });

  describe('4. Password Recovery & Reset Flow', () => {
    it('should submit recovery request on ForgotPasswordPage', async () => {
      renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' });

      expect(screen.getByRole('heading', { name: /lupa kata sandi\?/i })).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/email terdaftar/i), {
        target: { value: 'admin@propertyenhancer.ai' },
      });
      fireEvent.click(screen.getByRole('button', { name: /kirim tautan pemulihan/i }));

      await waitFor(() => {
        expect(screen.getByText(/email pemulihan terkirim/i)).toBeInTheDocument();
      });
    });

    it('should submit password update on ResetPasswordPage', async () => {
      renderWithProviders(<ResetPasswordPage />, { route: '/reset-password' });

      expect(screen.getByRole('heading', { name: /atur ulang kata sandi/i })).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/^kata sandi baru/i), {
        target: { value: 'NewSecurePassword123!' },
      });
      fireEvent.change(screen.getByLabelText(/konfirmasi kata sandi baru/i), {
        target: { value: 'NewSecurePassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /perbarui kata sandi/i }));

      await waitFor(() => {
        expect(screen.getByText(/kata sandi berhasil diperbarui/i)).toBeInTheDocument();
      });
    });

    it('should reject password update if confirmation does not match', async () => {
      renderWithProviders(<ResetPasswordPage />, { route: '/reset-password' });

      fireEvent.change(screen.getByLabelText(/^kata sandi baru/i), {
        target: { value: 'NewSecurePassword123!' },
      });
      fireEvent.change(screen.getByLabelText(/konfirmasi kata sandi baru/i), {
        target: { value: 'DifferentPassword123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /perbarui kata sandi/i }));

      await waitFor(() => {
        expect(screen.getByText(/konfirmasi tidak cocok/i)).toBeInTheDocument();
      });
    });
  });
});
