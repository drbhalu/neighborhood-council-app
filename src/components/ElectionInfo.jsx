import React, { useState, useEffect } from 'react';
import { getElections } from '../api';

const ElectionInfo = ({ user, onBack }) => {
  // Loaded election records for the active NHC.
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchElections = async () => {
      try {
        // Fetch elections for this specific NHC only.
        const data = await getElections(user.nhcId);
        setElections(data || []);
      } catch (error) {
        console.error('Error fetching elections:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchElections();
  }, [user.nhcId]);

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
      alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        {/* Header and close action for the election info modal. */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#1f2937' }}>🗳️ Election Information</h2>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        {/* Election details, empty state, or loading indicator. */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <p>Loading election information...</p>
          </div>
        ) : elections.length > 0 ? (
          <div>
            {elections.map((election) => (
              <div key={election.Id} style={{
                backgroundColor: '#f0f9ff',
                border: '2px solid #0ea5e9',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#374151' }}>
                  <span style={{ fontWeight: 'bold', color: '#0ea5e9' }}>📍 NHC:</span> {election.NHCName}
                </p>
                <p style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#374151' }}>
                  <span style={{ fontWeight: 'bold', color: '#0ea5e9' }}>📅 Election Date:</span> {new Date(election.ElectionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#374151' }}>
                  <span style={{ fontWeight: 'bold', color: '#0ea5e9' }}>⏰ Set On:</span> {new Date(election.CreatedDate).toLocaleString()}
                </p>
                <div style={{
                  padding: '15px',
                  backgroundColor: '#dbeafe',
                  borderRadius: '6px',
                  marginTop: '15px'
                }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
                    ℹ️ The election date has been officially set. Make sure to participate on the scheduled date!
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#b45309' }}>
              ⚠️ No Election Date Set
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
              The election date for your NHC has not been set yet. Check back later!
            </p>
          </div>
        )}

        {/* Back button to return to the previous screen. */}
        <button
          onClick={onBack}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#3b82f6';
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default ElectionInfo;
