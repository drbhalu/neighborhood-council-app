import React, { useEffect, useState } from 'react';
import './AdminDashboard.css';
import { getNHCList, getNominations, deleteNominationDate } from '../api';
import logo from '../assets/logo.png';

const EndNomination = ({ onBack }) => {
  // Manual nomination shutdown screen for admins.
  const [nhcList, setNhcList] = useState([]);
  const [nominations, setNominations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const nhcData = await getNHCList();
        setNhcList(nhcData || []);
        
        const nominationsData = await getNominations();
        setNominations(nominationsData || []);
      } catch (error) {
        console.error('Failed to load data', error);
        alert('Error loading data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getNHCName = (nhcId) => {
    const nhc = nhcList.find(n => n.Id === nhcId || n.id === nhcId);
    return nhc ? nhc.Name || nhc.name : 'Unknown NHC';
  };

  const handleEndNomination = async (nhcId, nhcName) => {
    // Remove the current nomination schedule immediately.
    const confirm = window.confirm(
      `Are you sure you want to END the nomination period for "${nhcName}" immediately?`
    );
    
    if (!confirm) return;

    setIsEnding(true);
    try {
      await deleteNominationDate(nhcId);
      alert(`Nomination period ended for "${nhcName}"!`);
      
      // Refetch nominations to update the list
      const nominationsData = await getNominations();
      setNominations(nominationsData || []);
    } catch (error) {
      console.error('Error ending nomination:', error);
      alert(`Failed to end nomination: ${error.message}`);
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="admin-dashboard-container">
      {/* Header for ending nomination windows. */}
      <div className="dashboard-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={logo} alt="Logo" style={{ height: '100px', width: 'auto' }} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button className="back-btn" onClick={onBack}>← Back</button>
          <h2 style={{ margin: 0 }}>END NOMINATIONS</h2>
        </div>

        <div></div>
      </div>

      {/* List of active nomination schedules. */}
      <div style={{ padding: '30px 20px', width: '100%' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>Loading nominations...</p>
          </div>
        ) : nominations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>📭 No active nominations found</p>
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Select a nomination period to end it immediately
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {nominations.map((nomination) => (
                <div
                  key={nomination.Id || nomination.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: '#f9f9f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                      {getNHCName(nomination.NHC_Id || nomination.nhc_id)}
                    </h3>
                    <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                      Start Date: <strong>{new Date(nomination.NominationStartDate).toLocaleDateString()}</strong>
                    </p>
                    <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                      End Date: <strong>{new Date(nomination.NominationEndDate).toLocaleDateString()}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => handleEndNomination(nomination.NHC_Id || nomination.nhc_id, getNHCName(nomination.NHC_Id || nomination.nhc_id))}
                    disabled={isEnding}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: isEnding ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      opacity: isEnding ? 0.6 : 1
                    }}
                  >
                    {isEnding ? 'Processing...' : '🛑 End Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EndNomination;
