import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './Authentication/LoginPage';
import { SignupPage } from './Authentication/SignupPage';
import { ForgotPassword } from './Authentication/ForgotPassword';
import { AdminRoute, OfficialRoute, HomeRedirect } from './Authentication/ProtectedRoute';
import { AdminHomePage } from './SysAdmin/Dashboard/AdminHomePage';
import { SportPage } from './SysAdmin/Sports_Management/SportPage';
import { OfficialHomePage } from './Officials/Dashboard/OfficialHomePage';
import { SchedulePage } from './Officials/Schedule/SchedulePage';
import { SettingsPage } from './Officials/Settings/SettingsPage';
import { NotificationPage } from './Officials/Notification/NotificationPage';
import { ProfilePage } from './Officials/Profile/ProfilePage';
import { ViewAllMatch } from './Officials/Match/ViewAllMatch';
import { ScoresheetMatch } from './Officials/Match/ScoresheetMatch';
import { CreateMatch } from './Officials/Match/createMatch';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public & Authentication */}
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* System Administrator Standalone Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminHomePage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/admission"
          element={
            <AdminRoute>
              <AdminHomePage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/coaches"
          element={
            <AdminRoute>
              <AdminHomePage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/sports"
          element={
            <AdminRoute>
              <SportPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/sport-configuration"
          element={
            <AdminRoute>
              <SportPage />
            </AdminRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Tournament Officials Standalone Routes */}
        <Route
          path="/dashboard"
          element={
            <OfficialRoute>
              <OfficialHomePage />
            </OfficialRoute>
          }
        />
        <Route
          path="/matches"
          element={
            <OfficialRoute>
              <ViewAllMatch />
            </OfficialRoute>
          }
        />
        <Route
          path="/matches/:matchId"
          element={
            <OfficialRoute>
              <ScoresheetMatch />
            </OfficialRoute>
          }
        />
        <Route
          path="/create-match"
          element={
            <OfficialRoute>
              <CreateMatch />
            </OfficialRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <OfficialRoute>
              <SchedulePage />
            </OfficialRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <OfficialRoute>
              <SettingsPage />
            </OfficialRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <OfficialRoute>
              <NotificationPage />
            </OfficialRoute>
          }
        />
        <Route
          path="/notifications-center"
          element={
            <OfficialRoute>
              <NotificationPage />
            </OfficialRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <OfficialRoute>
              <ProfilePage />
            </OfficialRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;
