import React, { useEffect, useState } from 'react';
import './AdminDashboard.css';
import { getNHCList, setElectionDate, deleteElectionDate, getElections } from '../api';
import logo from '../assets/logo.png';

const ElectionsDate = ({ onBack }) => {
  // State for selecting an NHC and setting its election window.
  const [nhcList, setNhcList] = useState([]);
  const [selectedNHC, setSelectedNHC] = useState(null);
  const [electionStartDate, setElectionStartDate] = useState('');
  const [electionEndDate, setElectionEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState([]);

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

  const canSetNewElection = (nhc) => {
    // Prevent scheduling a new election until the one-year cooldown has passed.
    const lastElection = elections.find(e => e.NHC_Id === (nhc.id || nhc.Id) || e.NHC_Id === nhc.Id);
    
    if (!lastElection) {
      // No previous election, can set new one
      return { allowed: true, message: null };
    }

    // Check if 1 year has passed since the last election end date
    const lastEndDate = new Date(lastElection.ElectionEndDate);
    const oneYearLater = new Date(lastEndDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    const today = new Date();

    if (today >= oneYearLater) {
      // 1 year has passed, can set new one
      return { allowed: true, message: null };
    } else {
      // 1 year hasn't passed yet
      const daysRemaining = Math.ceil((oneYearLater - today) / (1000 * 60 * 60 * 24));
      return {
        allowed: false,
        message: `⏳ Cannot set new election yet. Last election ended on ${lastEndDate.toLocaleDateString()}. You can set a new one on ${oneYearLater.toLocaleDateString()} (${daysRemaining} days remaining).`
      };
    }
  };

  const handleSaveDate = async () => {
    // Validate the date range and persist the election schedule.
    if (!selectedNHC || !electionStartDate || !electionEndDate) {
      alert('Please select an NHC and set both start and end election dates');
      return;
    }

    if (electionStartDate > electionEndDate) {
      alert('Start date cannot be after end date');
      return;
    }

    // Check if 1 year has passed since last election
    const check = canSetNewElection(selectedNHC);
    if (!check.allowed) {
      alert(check.message);
      return;
    }

    console.log("📤 Component: Attempting to save election dates", { 
      nhcId: selectedNHC.id || selectedNHC.Id, 
      electionStartDate: electionStartDate,
      electionEndDate: electionEndDate
    });
    
    setIsSaving(true);
    try {
      const response = await setElectionDate(selectedNHC.id || selectedNHC.Id, electionStartDate, electionEndDate);
      console.log("✅ Component: Response received:", response);
      alert('Election dates set successfully!');
      setSelectedNHC(null);
      setElectionStartDate('');
      setElectionEndDate('');
      
      // Refetch elections to update the list
      const electionsData = await getElections();
      setElections(electionsData || []);
    } catch (error) {
      console.error('❌ Component: Error saving election dates:', error);
      alert(`Failed to save election dates: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDate = async (nhcId, nhcName) => {
    if (window.confirm(`Are you sure you want to delete the election schedule for ${nhcName}?`)) {
      setIsDeleting(true);
      try {
        await deleteElectionDate(nhcId);
        alert('Election schedule deleted successfully!');
        
        // Refetch elections to update the list
        const electionsData = await getElections();
        setElections(electionsData || []);
      } catch (error) {
        console.error('❌ Error deleting election date:', error);
        alert(`Failed to delete election date: ${error.message}`);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="admin-dashboard-container">
      {/* Header for the election scheduler. */}
      <div className="dashboard-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={logo} alt="Logo" style={{ height: '100px', width: 'auto' }} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button className="back-btn" onClick={onBack}>← Back</button>
          <h2 style={{ margin: 0 }}>SET ELECTIONS</h2>
        </div>

        <div></div>
      </div>

      {/* Scheduler form and current status details. */}
      <div style={{ padding: '30px 20px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666' }}>Loading NHCs...</p>
        ) : nhcList.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No NHCs found.</p>
        ) : (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#1f2937' }}>
                Select NHC:
              </label>
              <select
                value={selectedNHC ? (selectedNHC.id || selectedNHC.Id) : ''}
                onChange={(e) => {
                  const nhc = nhcList.find(n => (n.id || n.Id) == e.target.value);
                  setSelectedNHC(nhc);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  marginBottom: '15px'
                }}
              >
                <option value="">-- Choose an NHC --</option>
                {nhcList.map((nhc) => (
                  <option key={nhc.id || nhc.Id} value={nhc.id || nhc.Id}>
                    {nhc.name || nhc.Name}
                  </option>
                ))}
              </select>

              {selectedNHC && (
                <div>
                  <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0', fontSize: '14px' }}>
                      <span style={{ fontWeight: 'bold', color: '#d97706' }}>🗳️ Selected NHC:</span> {selectedNHC.name || selectedNHC.Name}
                    </p>
                  </div>

                  {(() => {
                    const check = canSetNewElection(selectedNHC);
                    if (!check.allowed) {
                      return (
                        <div style={{
                          backgroundColor: '#fef3c7',
                          border: '2px solid #f59e0b',
                          borderRadius: '6px',
                          padding: '12px',
                          marginBottom: '15px',
                          color: '#92400e'
                        }}>
                          {check.message}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#1f2937' }}>
                Election Start Date:
              </label>
              <input
                type="date"
                value={electionStartDate}
                onChange={(e) => setElectionStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  marginBottom: '15px'
                }}
              />

              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#1f2937' }}>
                Election End Date:
              </label>
              <input
                type="date"
                value={electionEndDate}
                onChange={(e) => setElectionEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  marginBottom: '20px'
                }}
              />

              <button
                onClick={handleSaveDate}
                disabled={isSaving || !selectedNHC || !electionStartDate || !electionEndDate || (selectedNHC && !canSetNewElection(selectedNHC).allowed)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: (isSaving || !selectedNHC || !electionStartDate || !electionEndDate || (selectedNHC && !canSetNewElection(selectedNHC).allowed)) ? '#9ca3af' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (isSaving || !selectedNHC || !electionStartDate || !electionEndDate || (selectedNHC && !canSetNewElection(selectedNHC).allowed)) ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {isSaving ? 'Saving...' : '💾 Set Election Dates'}
              </button>
            </div>
          </div>
        )}

        {/* ELECTIONS LIST */}
        {!loading && (
          <div style={{ marginTop: '40px', maxWidth: '900px', margin: '40px auto 0' }}>
            <h3 style={{ color: '#1f2937', marginBottom: '20px', textAlign: 'center' }}>📋 Set Elections</h3>
            {elections.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666' }}>No elections set yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>NHC Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Start Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>End Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Set Date</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elections.map((election, index) => (
                      <tr key={index} style={{
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white'
                      }}>
                        <td style={{ padding: '12px', color: '#1f2937' }}>{election.NHCName || 'N/A'}</td>
                        <td style={{ padding: '12px', color: '#1f2937', fontWeight: '500' }}>
                          📅 {new Date(election.ElectionStartDate).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px', color: '#1f2937', fontWeight: '500' }}>
                          📅 {new Date(election.ElectionEndDate).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px', color: '#666', fontSize: '13px' }}>
                          {new Date(election.CreatedDate).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteDate(election.NHC_Id, election.NHCName)}
                            disabled={isDeleting}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: isDeleting ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isDeleting) e.target.style.backgroundColor = '#dc2626';
                            }}
                            onMouseLeave={(e) => {
                              if (!isDeleting) e.target.style.backgroundColor = '#ef4444';
                            }}
                          >
                            {isDeleting ? 'Deleting...' : '🗑️ Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ElectionsDate;
