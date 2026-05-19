import React, { useEffect } from 'react';
import logo from '../assets/logo.png';

const Splash = ({ onSplashComplete }) => {
  useEffect(() => {
    // Keep the splash screen on screen briefly before switching views.
    const timer = setTimeout(() => {
      onSplashComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onSplashComplete]);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      margin: 0,
      padding: 0
    }}>
      {/* App logo shown during the initial loading screen. */}
      <img 
        src={logo} 
        alt="Logo" 
        style={{ 
          height: '200px', 
          width: 'auto'
        }} 
      />
    </div>
  );
};

export default Splash;
