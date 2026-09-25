import React from 'react';
import { Navigate } from 'react-router-dom';
import { getStoredToken, getStoredUser } from '../api/client';
import type { AuthUser } from '../api/types';

export const isUserAdmin = (user?: AuthUser | null): boolean => {
  if (!user || !user.role) return false;
  const role = String(user.role).toLowerCase().replace(/[\s_-]+/g, '');
  return role.includes('admin');
};

/**
 * Guard for routes reserved strictly for System Administrators.
 * If user is not logged in -> /login
 * If user is logged in as Official -> redirect to /dashboard-official
 */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getStoredToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const stored = getStoredUser();
  const role = String(stored?.role || '').toLowerCase().replace(/[\s_-]+/g, '');

  // Only redirect away to official dashboard if role is definitively known and NOT admin
  if (stored && role && !role.includes('admin')) {
    return <Navigate to="/dashboard-official" replace />;
  }

  return <>{children}</>;
};

/**
 * Guard for routes reserved for Tournament Officials.
 * If user is not logged in -> /login
 * If user is logged in as System Administrator -> redirect to /dashboard-admin
 */
export const OfficialRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getStoredToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const stored = getStoredUser();
  const role = String(stored?.role || '').toLowerCase().replace(/[\s_-]+/g, '');

  if (role.includes('admin')) {
    return <Navigate to="/dashboard-admin" replace />;
  }

  return <>{children}</>;
};

/**
 * Root route / redirector that automatically routes authenticated users
 * to their respective role dashboard: /dashboard-admin or /dashboard-official.
 */
export const HomeRedirect: React.FC = () => {
  const token = getStoredToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const stored = getStoredUser();
  const role = String(stored?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (role.includes('admin')) {
    return <Navigate to="/dashboard-admin" replace />;
  }
  return <Navigate to="/dashboard-official" replace />;
};
