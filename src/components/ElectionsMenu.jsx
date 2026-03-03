import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import logo from '../assets/logo.png';

const ElectionsMenu = ({ onSelectOption, onClose, user }) => {
  const [isElectionEnded, setIsElectionEnded] = useState(false);

  useEffect(() => {
    const checkElectionStatus = async () => {
      try {
        if (!user || !user.nhcId) {
          setIsElectionEnded(false);
          return;
        }

        // Fetch latest election regardless of active/ended status
        const response = await fetch(`/api/election-by-nhc/${user.nhcId}`);
        
        if (!response.ok) {
          setIsElectionEnded(false);
          return;
        }

        const userElection = await response.json();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(userElection.ElectionEndDate);
        endDate.setHours(0, 0, 0, 0);

        setIsElectionEnded(today >= endDate);
      } catch (err) {
        console.error('Error checking election status:', err);
        setIsElectionEnded(false);
      }
    };

    checkElectionStatus();
  }, [user]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '30px 20px' }}>
          {/* LOGO */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <img src={logo} alt="Logo" style={{ height: '80px', width: 'auto' }} />
          </div>

          {/* HEADER */}
          <div style={{
            marginBottom: '30px'
          }}>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#1f2937', textAlign: 'center', fontWeight: 'bold' }}>Elections & Nominations</h2>
          </div>

          {/* BUTTONS CONTAINER */}
          <div className="dashboard-menu" style={{ padding: 0 }}>
            {/* ELECTION BUTTON */}
            <button
              onClick={() => onSelectOption('election')}
              className="menu-btn"
            >
              🗳️ Election
            </button>

            {/* NOMINATION BUTTON - VIEW ALL NOMINEES */}
            <button
              onClick={() => onSelectOption('nomination')}
              className="menu-btn"
            >
              ✍️ View Nominees
            </button>

            {/* VOTE TO CANDIDATE BUTTON */}
            <button
              onClick={() => onSelectOption('vote')}
              className="menu-btn"
            >
              🗽️ Vote in Election
            </button>

            {/* PANEL CREATION BUTTON */}
            <button
              onClick={() => onSelectOption('selfnomination')}
              className="menu-btn"
            >
              👥 Create Panel
            </button>

            {/* Election results button removed per request */}

            {/* PAST ELECTION RESULTS BUTTON - Always enabled */}
            <button
              onClick={() => onSelectOption('past-results')}
              className="menu-btn"
              style={{
                opacity: 1,
                cursor: 'pointer'
              }}
              title='View past election results'
            >
              📋 Past Results
            </button>
          </div>

          {/* CLOSE BUTTON */}
          <button
            onClick={onClose}
            className="menu-btn"
            style={{
              marginTop: '20px',
              backgroundColor: '#ef4444'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ElectionsMenu;
