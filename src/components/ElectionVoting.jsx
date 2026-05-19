import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import { getElections, getCandidates, castElectionVote } from '../api';
import ElectionResults from './ElectionResults';
import logo from '../assets/logo.png';

const ElectionVoting = ({ user, onBack }) => {
  // Voting flow state for election availability and candidate selection.
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [election, setElection] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voted, setVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState(null);
  const [isElectionActive, setIsElectionActive] = useState(false);
  const [electionEnded, setElectionEnded] = useState(false);

  useEffect(() => {
    const loadElectionAndCandidates = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load the active election for this user's NHC only.
        const electionsData = await getElections(user.nhcId);
        const userElection = (electionsData || [])[0]; // Backend now filters by nhcId

        if (!userElection) {
          setError('No active election for your NHC');
          setIsElectionActive(false);
          return;
        }

        // Determine whether voting is currently allowed.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(userElection.ElectionStartDate);
        const endDate = new Date(userElection.ElectionEndDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        if (today < startDate) {
          setError(`Election has not started yet. It starts on ${startDate.toLocaleDateString()}`);
          setIsElectionActive(false);
          setElectionEnded(false);
          return;
        }

        // Treat the election as ended once the end date has been reached.
        if (today >= endDate) {
          setElectionEnded(true);
          setIsElectionActive(false);
          return;
        }

        setElection(userElection);
        setIsElectionActive(true);

        // Only show candidates this user is allowed to vote for.
        const candidatesData = await getCandidates(userElection.NHC_Id, user.cnic, true);
        
        if (candidatesData.length === 0) {
          setError('No eligible candidates available for this election');
          setCandidates([]);
        } else {
          setCandidates(candidatesData);
        }
      } catch (err) {
        console.error('Error loading election data:', err);
        setError(err.message || 'Failed to load election information');
      } finally {
        setLoading(false);
      }
    };

    loadElectionAndCandidates();
  }, [user.nhcCode, user.cnic]);

  const handleVote = async () => {
    // Submit the selected vote and refresh the candidate list.
    if (!selectedCandidate || !election || !isElectionActive) {
      alert('Unable to cast vote. Please select a candidate and ensure election is active.');
      return;
    }

    setIsVoting(true);
    try {
      await castElectionVote(election.Id, user.cnic, selectedCandidate.Id);
      // Refresh candidates so election vote counts update immediately
      try {
        const refreshed = await getCandidates(election.NHC_Id, user.cnic, true);
        setCandidates(refreshed || []);
        console.log('ElectionVoting: refreshed candidates after vote', refreshed);
      } catch (rfErr) {
        console.error('ElectionVoting: failed to refresh candidates after vote', rfErr);
      }

      setVoted(true);
      setTimeout(() => {
        onBack();
      }, 1200);
    } catch (err) {
      console.error('Error casting vote:', err);
      alert(`Failed to cast vote: ${err.message}`);
    } finally {
      setIsVoting(false);
    }
  };

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
        width: '90%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        {/* Header and exit action for the voting modal. */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <h2 style={{ margin: 0, fontSize: '28px', color: '#1f2937', fontWeight: 'bold' }}>🗳️ Election Voting</h2>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        {/* Loading, success, error, and voting states are handled below. */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <p>Loading election information and eligible candidates...</p>
          </div>
        ) : voted ? (
          // Success state shown after the vote is recorded.
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#dcfce7',
            border: '2px solid #10b981',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '48px', margin: '0 0 15px 0' }}>✅</p>
            <p style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>
              Vote Submitted Successfully!
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#166534' }}>
              Thank you for participating in the election process. You will be redirected shortly.
            </p>
          </div>
        ) : electionEnded ? (
          <ElectionResults user={user} onBack={onBack} />
        ) : error && !isElectionActive ? (
          // Error state when voting is unavailable.
          <div style={{
            backgroundColor: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#991b1b', fontWeight: 'bold' }}>
              ⚠️ {error}
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#7f1d1d' }}>
              Please check back during the election period to vote.
            </p>
            <button
              onClick={onBack}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#ef4444',
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
        ) : (
          // Normal voting state with election info and candidate cards.
          <div>
            {/* Election details for the active contest. */}
            {election && (
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0c4a6e' }}>
                  <span style={{ fontWeight: 'bold' }}>📍 NHC:</span> {election.NHCName}
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0c4a6e' }}>
                  <span style={{ fontWeight: 'bold' }}>📅 Election Period:</span> {new Date(election.ElectionStartDate).toLocaleDateString()} - {new Date(election.ElectionEndDate).toLocaleDateString()}
                </p>
                <p style={{ margin: '0', fontSize: '14px', color: '#0c4a6e' }}>
                  <span style={{ fontWeight: 'bold' }}>👤 Voter:</span> {user.firstName} {user.lastName}
                </p>
              </div>
            )}
        
            {error && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: '#b45309'
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* CANDIDATES LIST */}
            {candidates.length > 0 ? (
              <div>
                <h3 style={{ color: '#1f2937', marginBottom: '15px', fontSize: '16px' }}>
                  ✓ Eligible Candidates ({candidates.length})
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '15px',
                  marginBottom: '25px'
                }}>
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.Id}
                      onClick={() => setSelectedCandidate(candidate)}
                      style={{
                        padding: '15px',
                        border: selectedCandidate?.Id === candidate.Id ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedCandidate?.Id === candidate.Id ? '#eff6ff' : 'white',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedCandidate?.Id === candidate.Id ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCandidate?.Id !== candidate.Id) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <div style={{ marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {candidate.profileImage || candidate.ProfileImage ? (
                            <img src={candidate.profileImage || candidate.ProfileImage} alt="candidate" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontWeight: '700', color: '#64748b' }}>{`${(candidate.FirstName||'').charAt(0)}${(candidate.LastName||'').charAt(0)}` || '👤'}</span>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
                            {candidate.FirstName} {candidate.LastName}
                          </p>
                          <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#6b7280' }}>
                            📋 Panel: {candidate.PanelName || <em>(unnamed)</em>}
                          </p>
                          {candidate.PanelMembers && candidate.PanelMembers.length > 0 && (
                            <div style={{
                              fontSize: '12px',
                              color: '#1f2937',
                              marginBottom: '8px',
                              backgroundColor: '#f0f9ff',
                              padding: '12px',
                              borderRadius: '8px',
                              borderLeft: '3px solid #3b82f6'
                            }}>
                              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#0c4a6e' }}>👥 Panel Members:</p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                                {candidate.PanelMembers.map((m) => (
                                  <div key={m.CNIC} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderRadius: '6px', backgroundColor: '#ffffff' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {m.profileImage ? (
                                        <img src={m.profileImage} alt={`${m.FirstName} ${m.LastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        <span style={{ fontWeight: '700', color: '#64748b' }}>{`${(m.FirstName||'').charAt(0)}${(m.LastName||'').charAt(0)}` || '👤'}</span>
                                      )}
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{m.FirstName} {m.LastName}</div>
                                      <div style={{ fontSize: '11px', color: '#4f46e5' }}>{m.Role || 'Member'}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                            Position: {candidate.Category}
                          </p>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#6b7280',
                        paddingTop: '10px',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <span>🗳️ Election Votes: {candidate.ElectionVotes || 0}</span>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Eligible</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedCandidate && (
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#166534' }}>
                      ✓ Selected: <strong>{selectedCandidate.FirstName} {selectedCandidate.LastName}</strong> for {selectedCandidate.Category}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#166534' }}>
                      Panel: {selectedCandidate.PanelName || <em>(unnamed)</em>}
                    </p>
                  </div>
                )}

                {/* VOTE BUTTON */}
                <button
                  onClick={handleVote}
                  disabled={!selectedCandidate || isVoting}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    backgroundColor: selectedCandidate && !isVoting ? '#10b981' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: selectedCandidate && !isVoting ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCandidate && !isVoting) {
                      e.target.style.backgroundColor = '#059669';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCandidate && !isVoting) {
                      e.target.style.backgroundColor = '#10b981';
                    }
                  }}
                >
                  {isVoting ? 'Casting Vote...' : '🗳️ Cast Vote'}
                </button>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#b45309', fontWeight: 'bold' }}>
                  ⚠️ No Eligible Candidates
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
                  There are no eligible candidates available for voting at this time.
                </p>
              </div>
            )}

            {/* CLOSE BUTTON */}
            <button
              onClick={onBack}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '12px 20px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#4b5563';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#6b7280';
              }}
            >
              Cancel
            </button>
          </div>
        )}

        
      </div>
    </div>
  );
};

export default ElectionVoting;
