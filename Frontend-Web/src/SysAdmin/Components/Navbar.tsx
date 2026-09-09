import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleUser } from 'lucide-react';
import { clearAuthSession } from '../../api/client';
import { styles } from './styles/Navbar';

interface NavbarProps {
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title = 'SYSTEM DASHBOARD' }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  return (
    <header style={styles.header}>
      <Link to="/admin/dashboard" style={styles.logo}>
        ATLETA<sup style={styles.logoSup}>WEB</sup>
      </Link>
      <div style={styles.headerRight}>
        <span>{title}</span>
        <span>|</span>
        <div style={styles.profileIcon} onClick={handleLogout} title="Click to Logout">
          <CircleUser style={{ width: 22, height: 22 }} />
        </div>
      </div>
    </header>
  );
};
