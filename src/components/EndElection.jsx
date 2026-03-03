import React, { useEffect, useState } from 'react';
import './AdminDashboard.css';
import { getNHCList, getElections, deleteElectionDate } from '../api';
import logo from '../assets/logo.png';

const EndElection = ({ onBack }) => {
  const [nhcList, setNhcList] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const nhcData = await getNHCList();
        setNhcList(nhcData || []);
        const electionsData = await getElections();
        setElections(electionsData || []);
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

  const handleEndElection = async (nhcId, nhcName) => {
    const confirm = window.confirm(
      `Are you sure you want to END the election for "${nhcName}" immediately?`
    );
    
    if (!confirm) return;

    setIsEnding(true);
    try {
      await deleteElectionDate(nhcId);
      alert(`Election ended for "${nhcName}"!`);
      
      // Refetch elections to update the list
      const electionsData = await getElections();
      setElections(electionsData || []);
    } catch (error) {
      console.error('Error ending election:', error);
      alert(`Failed to end election: ${error.message}`);
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="admin-dashboard-container">
      {/* HEADER */}
      <div className="dashboard-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={logo} alt="Logo" style={{ height: '100px', width: 'auto' }} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button className="back-btn" onClick={onBack}>← Back</button>
          <h2 style={{ margin: 0 }}>END ELECTIONS</h2>
        </div>

        <div></div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '30px 20px', width: '100%' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>Loading elections...</p>
          </div>
        ) : elections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>📭 No active elections found</p>
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Select an election to end it immediately
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {elections.map((election) => (
                <div
                  key={election.Id || election.id}
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
                      {getNHCName(election.NHC_Id || election.nhc_id)}
                    </h3>
                    <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                      Start Date: <strong>{new Date(election.ElectionStartDate).toLocaleDateString()}</strong>
                    </p>
                    <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                      End Date: <strong>{new Date(election.ElectionEndDate).toLocaleDateString()}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => handleEndElection(election.NHC_Id || election.nhc_id, getNHCName(election.NHC_Id || election.nhc_id))}
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

export default EndElection;
