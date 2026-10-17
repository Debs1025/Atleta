import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getStoredToken, getStoredUser, warmOfficialAppCache, warmAdminAppCache } from '../api/client';
import type { AuthUser } from '../api/types';

export const isUserAdmin = (user?: AuthUser | null): boolean => {
  if (!user || !user.role) return false;
  const role = String(user.role).toLowerCase().replace(/[\s_-]+/g, '');
  return role.includes('admin');
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getStoredToken();

  useEffect(() => {
    if (token) {
      warmAdminAppCache();
    }
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  const stored = getStoredUser();
  const role = String(stored?.role || '').toLowerCase().replace(/[\s_-]+/g, '');

  if (stored && role && !role.includes('admin')) {
    return <Navigate to="/dashboard-official" replace />;
  }

  return <>{children}</>;
};

export const OfficialRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getStoredToken();

  useEffect(() => {
    if (token) {
      warmOfficialAppCache();
    }
  }, [token]);

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

export const HomeRedirect: React.FC = () => {
  const token = getStoredToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const stored = getStoredUser();
  const role = String(stored?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (role.includes('admin')) {
    warmAdminAppCache();
    return <Navigate to="/dashboard-admin" replace />;
  }
  warmOfficialAppCache();
  return <Navigate to="/dashboard-official" replace />;
};
