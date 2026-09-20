import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './Authentication/LoginPage';
import { SignupPage } from './Authentication/SignupPage';
import { ForgotPassword } from './Authentication/ForgotPassword';
import { OfficialSettings } from './Officials/OfficialSettings';
import { OCRLoggingPage } from './Officials/OCRLoggingPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<OCRLoggingPage />} />
        <Route path="/ocr" element={<OCRLoggingPage />} />
        <Route path="/matches" element={<OCRLoggingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/settings" element={<OfficialSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
