import React from 'react';
import { Link } from 'react-router-dom';
import { styles } from './styles/Navbar';

import { AtletaAnimatedLogo } from '../../components/AtletaAnimatedLogo';

interface NavbarProps {
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title = 'ADMIN DASHBOARD' }) => {
  return (
    <header style={styles.header}>
      <Link to="/dashboard-admin" style={{ ...styles.logo, display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <AtletaAnimatedLogo size={34} showGlow={true} pulse={true} />
        <span>ATLETA<sup style={styles.logoSup}>WEB</sup></span>
      </Link>
      <div style={styles.headerRight}>
        <span>{title}</span>
      </div>
    </header>
  );
};
