import React from 'react';

interface AtletaAnimatedLogoProps {
  size?: 'small' | 'medium' | 'large' | number;
  showGlow?: boolean;
  pulse?: boolean;
  className?: string;
  onClick?: () => void;
}

export const AtletaAnimatedLogo: React.FC<AtletaAnimatedLogoProps> = ({
  size = 'medium',
  showGlow = true,
  pulse = true,
  className = '',
  onClick,
}) => {
  const dimension = typeof size === 'number'
    ? size
    : size === 'small'
    ? 36
    : size === 'large'
    ? 110
    : 64;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-300 hover:scale-110 active:scale-95 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      {/* Radiant Ambient Cyan Aura Glow */}
      {showGlow && (
        <div
          className={`absolute inset-0 -m-1 rounded-full bg-cyan-400/25 blur-lg pointer-events-none ${pulse ? 'animate-pulse' : ''}`}
          style={{
            boxShadow: '0 0 28px rgba(0, 200, 255, 0.55)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Transparent High-Resolution Logo */}
      <img
        src="/atleta_logo.png"
        alt="Atleta Logo"
        className={`relative z-10 w-full h-full object-contain bg-transparent drop-shadow-[0_0_12px_rgba(0,200,255,0.4)] transition-all duration-300 ${pulse ? 'hover:brightness-125' : ''}`}
      />
    </div>
  );
};

export default AtletaAnimatedLogo;
