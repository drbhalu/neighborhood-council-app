import React, { useState } from 'react';
import './AdminDashboard.css';
import NominationsDate from './NominationsDate';
import ElectionsDate from './ElectionsDate';
import EndNomination from './EndNomination';
import EndElection from './EndElection';
import logo from '../assets/logo.png';

const Elections = ({ onBack }) => {
  const [view, setView] = useState('menu'); // 'menu', 'nominations', 'elections', 'end-nomination', 'end-election'

  if (view === 'nominations') {
    return <NominationsDate onBack={() => setView('menu')} />;
  }

  if (view === 'elections') {
    return <ElectionsDate onBack={() => setView('menu')} />;
  }

  if (view === 'end-nomination') {
    return <EndNomination onBack={() => setView('menu')} />;
  }

  if (view === 'end-election') {
    return <EndElection onBack={() => setView('menu')} />;
  }

  return (
    <div className="admin-dashboard-container">
      {/* HEADER */}
      <div className="dashboard-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={logo} alt="Logo" style={{ height: '100px', width: 'auto' }} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button className="back-btn" onClick={onBack}>← Back</button>
          <h2 style={{ margin: 0 }}>ELECTIONS</h2>
        </div>

        <div></div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* <p style={{ fontSize: '16px', color: '#666', marginBottom: '40px' }}>Select an option to manage elections and nominations</p>
         */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', maxWidth: '600px' }}>
          <button 
            className="menu-btn" 
            onClick={() => setView('nominations')}
            style={{ minHeight: '120px' }}
          >
            SHEDULE NOMINATIONS
          </button>
          
          <button 
            className="menu-btn" 
            onClick={() => setView('elections')}
            style={{ minHeight: '120px' }}
          >
            SHEDULE ELECTIONS
          </button>

          <button 
            className="menu-btn" 
            onClick={() => setView('end-nomination')}
            style={{ minHeight: '120px' }}
          >
             END NOMINATION SHEDULE
          </button>

          <button 
            className="menu-btn" 
            onClick={() => setView('end-election')}
            style={{ minHeight: '120px' }}
          >
             END ELECTION SHEDULE
          </button>
        </div>
      </div>
    </div>
  );
};

export default Elections;
