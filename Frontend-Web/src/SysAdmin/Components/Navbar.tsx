import React from 'react';
import { Link } from 'react-router-dom';
import { styles } from './styles/Navbar';

interface NavbarProps {
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title = 'SYSTEM DASHBOARD' }) => {
  return (
    <header style={styles.header}>
      <Link to="/admin/dashboard" style={styles.logo}>
        ATLETA<sup style={styles.logoSup}>WEB</sup>
      </Link>
      <div style={styles.headerRight}>
        <span>{title}</span>
      </div>
    </header>
  );
};
