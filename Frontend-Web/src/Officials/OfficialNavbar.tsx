import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Sliders, LogOut } from 'lucide-react';
import { clearAuthSession, getStoredUser } from '../api/client';

export const OfficialNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const isOCR = location.pathname === '/ocr' || location.pathname === '/';
  const isSettings = location.pathname === '/settings';

  return (
    <header className="w-full bg-[#060B18] border-b border-[#1E293B] px-6 md:px-12 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-md">
      <div className="flex items-center space-x-8">
        <Link to="/ocr" className="text-xl font-black tracking-[0.2em] text-white no-underline flex items-center">
          ATLETA<sup className="text-[9px] font-bold text-slate-400 ml-1">WEB</sup>
        </Link>

        <nav className="hidden sm:flex items-center space-x-2">
          <Link
            to="/ocr"
            className={`px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition ${
              isOCR
                ? 'bg-[#1E293B] text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>OCR Match Logging</span>
          </Link>

          <Link
            to="/settings"
            className={`px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition ${
              isSettings
                ? 'bg-[#1E293B] text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Official Settings</span>
          </Link>
        </nav>
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-white tracking-wide">
              {user.full_legal_name || user.full_name || user.email}
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
              {user.organization_name || user.organization || user.role || 'Tournament Official'}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          title="Log Out"
          className="p-2 rounded bg-slate-800/80 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-700/60 transition cursor-pointer flex items-center justify-center"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
