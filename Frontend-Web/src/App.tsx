import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './Authentication/LoginPage';
import { SignupPage } from './Authentication/SignupPage';
import { ForgotPassword } from './Authentication/ForgotPassword';
import { OfficialHomePage } from './Officials/Dashboard/OfficialHomePage';
import { SchedulePage } from './Officials/Schedule/SchedulePage';
import { SettingsPage } from './Officials/Settings/SettingsPage';
import { NotificationPage } from './Officials/Notification/NotificationPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<OfficialHomePage />} />
        <Route path="/schedules" element={<SchedulePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/notifications-center" element={<NotificationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
