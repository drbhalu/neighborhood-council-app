import React, { useEffect, useState } from 'react';
import { getPastElectionResults, getNHCList } from '../api';

const PastElectionResults = ({ user, onBack }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        if (!user) {
          setErrorMessage('User information not available');
          setLoading(false);
          return;
        }

        // Resolve nhcId: prefer explicit nhcId, otherwise try to resolve from nhcCode
        let nhcId = user.nhcId;
        if (!nhcId && user.nhcCode) {
          try {
            const list = await getNHCList();
            const found = list.find(n => (n.name || n.Name || '').toLowerCase() === String(user.nhcCode).toLowerCase());
            if (found) nhcId = found.id || found.Id;
          } catch (e) {
            console.warn('Failed to resolve nhcId from nhcCode', e);
          }
        }

        if (!nhcId) {
          setErrorMessage('NHC information not available (no nhcId)');
          setLoading(false);
          return;
        }

        console.log('Fetching stored election results for NHC ID:', nhcId);

        const data = await getPastElectionResults(nhcId);
        if (!data || (Object.keys(data).length === 0)) {
          setErrorMessage('No results available for past elections');
          setLoading(false);
          return;
        }

        setResults(data);
      } catch (err) {
        console.error('Error loading past election results:', err);
        setErrorMessage('Failed to load election results');
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [user]);

  if (loading) {
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
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '18px', color: '#666' }}>Loading results...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
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
          padding: '40px',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '18px', color: '#dc2626', fontWeight: 'bold', marginBottom: '20px' }}>
            ⚠️ {errorMessage}
          </p>
          <button
            onClick={onBack}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

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
        padding: '40px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        {/* HEADER */}
        <h1 style={{
          fontSize: '28px',
          color: '#1f2937',
          textAlign: 'center',
          marginBottom: '30px',
          fontWeight: 'bold'
        }}>
          📊 Past Election Results
        </h1>

        {/* RESULTS BY ELECTION -> POSITION - SHOW WINNER NAME & VOTES */}
        {results && Object.keys(results).length > 0 ? (
          // New API shape: { electionId: { electionStartDate, electionEndDate, positions: { positionName: [candidates] } } }
          // Backward-compat: { positionName: [candidates] }
          Object.entries(results).map(([key, value]) => {
            // Detect new shape
            if (value && value.positions) {
              const electionId = key;
              const election = value;
              return (
                <div key={electionId} style={{ marginBottom: '30px' }}>
                  <h2 style={{ textAlign: 'center', margin: '0 0 12px 0' }}>Election #{electionId}</h2>
                  {election.electionStartDate && election.electionEndDate && (
                    <p style={{ textAlign: 'center', color: '#6b7280', marginTop: 0 }}>
                      📅 {new Date(election.electionStartDate).toLocaleDateString()} — {new Date(election.electionEndDate).toLocaleDateString()}
                    </p>
                  )}
                  {Object.entries(election.positions).map(([positionName, candidates]) => {
                    const winner = candidates && candidates.length > 0 ? candidates[0] : null;
                    return (
                      <div key={positionName} style={{ marginBottom: '20px' }}>
                        <div style={{
                          backgroundColor: positionName === 'President' ? '#dbeafe' : positionName === 'Treasurer' ? '#ddd6fe' : '#dcfce7',
                          border: positionName === 'President' ? '3px solid #2563eb' : positionName === 'Treasurer' ? '3px solid #7c3aed' : '3px solid #10b981',
                          borderRadius: '12px',
                          padding: '20px',
                          textAlign: 'center'
                        }}>
                          <p style={{
                            fontSize: '14px',
                            color: positionName === 'President' ? '#0c4a6e' : positionName === 'Treasurer' ? '#4c1d95' : '#065f46',
                            margin: '0 0 12px 0',
                            fontWeight: '600',
                            letterSpacing: '0.5px'
                          }}>
                            {positionName === 'President' ? '👑' : positionName === 'Treasurer' ? '💼' : positionName === 'Vice President' ? '🎖️' : '🏷️'} {positionName}
                          </p>
                          {winner ? (
                            <div>
                              <p style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: positionName === 'President' ? '#1d4ed8' : positionName === 'Treasurer' ? '#6d28d9' : '#059669',
                                margin: '0 0 8px 0'
                              }}>
                                🏆 {winner.FirstName} {winner.LastName}
                              </p>
                              <p style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: positionName === 'President' ? '#2563eb' : positionName === 'Treasurer' ? '#7c3aed' : '#10b981',
                                margin: '0 0 12px 0'
                              }}>
                                {winner.TotalVotes} Votes
                              </p>
                              {winner.PanelMembers && winner.PanelMembers.length > 0 && (
                                <div style={{
                                  backgroundColor: 'rgba(255,255,255,0.7)',
                                  borderRadius: '8px',
                                  padding: '12px',
                                  marginTop: '12px',
                                  textAlign: 'left'
                                }}>
                                  <p style={{
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: positionName === 'President' ? '#0c4a6e' : positionName === 'Treasurer' ? '#4c1d95' : '#065f46',
                                    margin: '0 0 8px 0',
                                    textAlign: 'center'
                                  }}>
                                    👥 Panel Members
                                  </p>
                                  {winner.PanelMembers.map((member) => (
                                    <div key={member.CNIC} style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '6px 0',
                                      borderBottom: '1px solid rgba(0,0,0,0.1)',
                                      fontSize: '12px'
                                    }}>
                                      <span style={{ fontWeight: '500' }}>
                                        {member.FirstName} {member.LastName}
                                      </span>
                                      <span style={{
                                        fontSize: '11px',
                                        backgroundColor: member.Role === 'president' ? '#dbeafe' : member.Role === 'treasurer' ? '#ddd6fe' : '#dcfce7',
                                        color: member.Role === 'president' ? '#0c4a6e' : member.Role === 'treasurer' ? '#4c1d95' : '#065f46',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontWeight: '600'
                                      }}>
                                        {member.Role || 'Member'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>No Result</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            // Backward-compatible rendering: treat key as position
            const positionName = key;
            const candidates = value;
            const winner = candidates && candidates.length > 0 ? candidates[0] : null;
            return (
              <div key={positionName} style={{ marginBottom: '25px' }}>
                <div style={{
                  backgroundColor: positionName === 'President' ? '#dbeafe' : positionName === 'Treasurer' ? '#ddd6fe' : '#dcfce7',
                  border: positionName === 'President' ? '3px solid #2563eb' : positionName === 'Treasurer' ? '3px solid #7c3aed' : '3px solid #10b981',
                  borderRadius: '12px',
                  padding: '25px',
                  textAlign: 'center'
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: positionName === 'President' ? '#0c4a6e' : positionName === 'Treasurer' ? '#4c1d95' : '#065f46',
                    margin: '0 0 12px 0',
                    fontWeight: '600',
                    letterSpacing: '0.5px'
                  }}>
                    {positionName === 'President' ? '👑' : positionName === 'Treasurer' ? '💼' : positionName === 'Vice President' ? '🎖️' : '🏷️'} {positionName}
                  </p>
                  
                  {winner ? (
                    <div>
                      <p style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: positionName === 'President' ? '#1d4ed8' : positionName === 'Treasurer' ? '#6d28d9' : '#059669',
                        margin: '0 0 8px 0'
                      }}>
                        🏆 {winner.FirstName} {winner.LastName}
                      </p>
                      <p style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: positionName === 'President' ? '#2563eb' : positionName === 'Treasurer' ? '#7c3aed' : '#10b981',
                        margin: '0 0 12px 0'
                      }}>
                        {winner.TotalVotes} Votes
                      </p>
                      {winner.PanelMembers && winner.PanelMembers.length > 0 && (
                        <div style={{
                          backgroundColor: 'rgba(255,255,255,0.7)',
                          borderRadius: '8px',
                          padding: '12px',
                          marginTop: '12px',
                          textAlign: 'left'
                        }}>
                          <p style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            color: positionName === 'President' ? '#0c4a6e' : positionName === 'Treasurer' ? '#4c1d95' : '#065f46',
                            margin: '0 0 8px 0',
                            textAlign: 'center'
                          }}>
                            👥 Panel Members
                          </p>
                          {winner.PanelMembers.map((member) => (
                            <div key={member.CNIC} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 0',
                              borderBottom: '1px solid rgba(0,0,0,0.1)',
                              fontSize: '12px'
                            }}>
                              <span style={{ fontWeight: '500' }}>
                                {member.FirstName} {member.LastName}
                              </span>
                              <span style={{
                                fontSize: '11px',
                                backgroundColor: member.Role === 'president' ? '#dbeafe' : member.Role === 'treasurer' ? '#ddd6fe' : '#dcfce7',
                                color: member.Role === 'president' ? '#0c4a6e' : member.Role === 'treasurer' ? '#4c1d95' : '#065f46',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: '600'
                              }}>
                                {member.Role || 'Member'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: '#666', margin: 0, fontSize: '16px' }}>No Result</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '16px', color: '#991b1b', fontWeight: 'bold' }}>
              ⚠️ No results available
            </p>
            <p style={{ fontSize: '14px', color: '#7f1d1d', margin: '8px 0 0 0' }}>
              Results will appear after an election is completed.
            </p>
          </div>
        )}

        {/* BACK BUTTON */}
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button
            onClick={onBack}
            style={{
              padding: '12px 30px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PastElectionResults;
