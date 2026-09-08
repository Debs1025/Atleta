import React from 'react';

export const styles: Record<string, React.CSSProperties> = {
  header: {
    height: '64px',
    borderBottom: '1.5px solid #0F172A',
    padding: '0 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    position: 'sticky',
    top: 0,
    zIndex: 40,
  },
  logo: {
    fontSize: '22px',
    fontWeight: '900',
    letterSpacing: '0.15em',
    color: '#0F172A',
    textDecoration: 'none',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '15px',
    fontWeight: '800',
    letterSpacing: '0.08em',
    color: '#0F172A',
  },
  profileIcon: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: '#0F172A',
  },
};
