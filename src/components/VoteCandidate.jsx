import React, { useState, useEffect } from 'react';
import { getElections, getCandidateElectionVotes, castElectionVote, getPositions, getCandidates, getNHCList } from '../api';
import ElectionResults from './ElectionResults';

const VoteCandidate = ({ user, onBack }) => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [electionOpen, setElectionOpen] = useState(false);
  const [electionEnded, setElectionEnded] = useState(false);
  const [electionId, setElectionId] = useState(null);
  const [electionStartDate, setElectionStartDate] = useState(null);
  const [electionEndDate, setElectionEndDate] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [positionsState, setPositionsState] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Resolve NHC Id: prefer numeric nhcId, fallback to nhcCode -> id lookup
        let resolvedNhcId = user.nhcId || null;
        if (!resolvedNhcId && user.nhcCode) {
          try {
            const nhcList = await getNHCList();
            const match = (nhcList || []).find(n => String(n.name) === String(user.nhcCode));
            if (match) resolvedNhcId = match.id;
            console.log('VoteCandidate: resolvedNhcId from nhcCode', user.nhcCode, '->', resolvedNhcId);
          } catch (e) {
            console.warn('VoteCandidate: failed to resolve nhcCode to id', e);
          }
        }

        if (!resolvedNhcId) {
          setCandidates([]);
          setElectionOpen(false);
          setLoading(false);
          return;
        }

        // Load election dates
        const elections = await getElections();
        const election = (elections || []).find(e => Number(e.NHC_Id) === Number(user.nhcId) || Number(e.NHC_Id) === user.nhcId);
        
        if (election && election.ElectionStartDate && election.ElectionEndDate) {
          // Parse DATE from DB string "YYYY-MM-DD" safely as local date
          const startDateStr = String(election.ElectionStartDate).split('T')[0];
          const endDateStr = String(election.ElectionEndDate).split('T')[0];
          
          const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
          const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
          
          const startDate = new Date(startYear, startMonth - 1, startDay);
          const endDate = new Date(endYear, endMonth - 1, endDay);
          // Use date-only comparison (no time) — normalize to start of day
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Check if today is within the range (inclusive)
          const isWithinRange = today >= startDate && today <= endDate;

          if (isWithinRange) {
            setElectionOpen(true);
            setElectionEnded(false);
          } else {
            setElectionOpen(false);
            // Election is considered ended when today is past ElectionEndDate
            setElectionEnded(today > endDate);
          }
          setElectionStartDate(election.ElectionStartDate);
          setElectionEndDate(election.ElectionEndDate);
          if (election.Id) setElectionId(election.Id);
        } else {
          setElectionOpen(false);
          setElectionStartDate(null);
          setElectionEndDate(null);
          setElectionId(null);
        }

        // Load positions (categories) and eligible candidates from API
        try {
          const [posData, candData] = await Promise.all([
            getPositions(),
            getCandidates(resolvedNhcId, null, true)
          ]);
          // store candidates and positions in local state
          setCandidates(candData || []);
          console.log('VoteCandidate: loaded candidates', candData);
          // attach positions to a temporary var for rendering below
          // we'll use getPositions() again via state below when rendering categories
          // store positions on the component via ref-like state
          setPositionsState(posData || []);
          console.log('VoteCandidate: loaded positions', posData);
        } catch (innerErr) {
          console.error('Failed to load positions or candidates', innerErr);
        }
      } catch (err) {
        console.error('Failed to load election data', err);
        setCandidates([]);
        setElectionOpen(false);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleVote = async () => {
    if (!selectedCandidate || !electionOpen) {
      return;
    }

    setIsVoting(true);
    try {
      // Use the actual election Id from the DB
      const resolvedElectionId = electionId || Math.floor(new Date(electionStartDate).getTime() / 1000);
      await castElectionVote(resolvedElectionId, user.cnic, selectedCandidate);
      // Refresh candidate list so ElectionVotes updates immediately
      try {
        const refreshed = await getCandidates(user.nhcId, null, true);
        setCandidates(refreshed || []);
        console.log('VoteCandidate: refreshed candidates after vote', refreshed);
      } catch (rfErr) {
        console.error('Failed to refresh candidates after vote', rfErr);
      }

      setVoted(true);
      setTimeout(() => {
        onBack();
      }, 1200);
    } catch (err) {
      console.error('Voting error:', err);
      alert('Failed to cast vote: ' + (err.message || 'Unknown error'));
    } finally {
      setIsVoting(false);
    }
  };

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
          width: '90%',
          maxWidth: '600px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <p>Loading election data...</p>
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
        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#1f2937' }}>🗳️ Cast Your Vote</h2>
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

        {/* CONTENT */}
        {voted ? (
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
              Thank you for participating in the election.
            </p>
          </div>
        ) : electionEnded ? (
          <ElectionResults user={user} onBack={onBack} />
        ) : !electionOpen ? (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#991b1b' }}>
              🔒 Election Closed
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#7f1d1d' }}>
              The election period has ended. You cannot vote at this time.
            </p>
            {electionEndDate && (
              <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#7f1d1d' }}>
                Election ended on: {new Date(electionEndDate).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <div>
            {/* NHC INFO */}
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '25px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0c4a6e' }}>
                <span style={{ fontWeight: 'bold' }}>🗳️ Voting for NHC:</span> {user.nhcCode}
              </p>
              <p style={{ margin: '0', fontSize: '13px', color: '#0c4a6e' }}>
                📅 Ends on: {new Date(electionEndDate).toLocaleDateString()}
              </p>
            </div>

            {/* ELECTION INFO */}
            <div style={{
              backgroundColor: '#dcfce7',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#065f46'
            }}>
              ℹ️ Vote for eligible candidates. Each position has separate voting.
            </div>

            {/* LEGEND: Vote Types */}
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#92400e'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>📊 Vote Types:</p>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <span>🗳️ <strong>Election Votes</strong> = Votes received in current election</span>
              </div>
            </div>

            {/* CANDIDATES BY POSITION */}
            {(positionsState || []).map(pos => {
              const category = pos.Name || pos.name;
              const categoryMembers = candidates.filter(c => c.Category === category);
              return (
                <div key={category} style={{ marginBottom: '30px' }}>
                  <div style={{
                    backgroundColor: '#eff6ff',
                    border: '2px solid #0ea5e9',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '15px'
                  }}>
                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#0369a1', margin: 0 }}>
                      {category === 'President' ? '👑' : category === 'Treasurer' ? '💼' : category === 'Vice President' ? '🎖️' : '🏷️'} {category}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {categoryMembers.length > 0 ? (
                      categoryMembers.map((candidate) => (
                        <div
                          key={candidate.Id}
                          onClick={() => setSelectedCandidate(candidate.Id)}
                          style={{
                            padding: '16px',
                            border: selectedCandidate === candidate.Id ? '2px solid #10b981' : '2px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: selectedCandidate === candidate.Id ? '#f0fdf4' : '#ffffff',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#10b981';
                            e.currentTarget.style.backgroundColor = '#f0fdf4';
                          }}
                          onMouseLeave={(e) => {
                            if (selectedCandidate !== candidate.Id) {
                              e.currentTarget.style.borderColor = '#e5e7eb';
                              e.currentTarget.style.backgroundColor = '#ffffff';
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: selectedCandidate === candidate.Id ? '3px solid #10b981' : '2px solid #d1d5db',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {selectedCandidate === candidate.Id && (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: '#10b981'
                                }}></div>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              {candidate.PanelName && (
                                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#0369a1' }}>
                                  📋 Panel: {candidate.PanelName}
                                </p>
                              )}
                              {candidate.PanelMembers && candidate.PanelMembers.length > 0 ? (
                                <div style={{ fontSize: '12px', color: '#1f2937', marginBottom: '8px', backgroundColor: '#f0f9ff', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #3b82f6' }}>
                                  <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', color: '#0c4a6e' }}>👥 Panel Members:</p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {candidate.PanelMembers.map(m => (
                                      <div key={m.CNIC} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                          display: 'inline-block',
                                          padding: '2px 8px',
                                          backgroundColor: m.Role === 'President' ? '#fbbf24' : m.Role === 'Treasurer' ? '#60a5fa' : m.Role === 'Vice President' ? '#34d399' : '#d1d5db',
                                          color: 'white',
                                          borderRadius: '12px',
                                          fontSize: '10px',
                                          fontWeight: 'bold',
                                          minWidth: '75px',
                                          textAlign: 'center'
                                        }}>
                                          {m.Role}
                                        </span>
                                        <span style={{ color: '#1f2937', fontWeight: '500' }}>{m.FirstName && m.LastName ? `${m.FirstName} ${m.LastName}` : m.CNIC}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6b7280' }}>
                                  {candidate.FirstName && candidate.LastName ? `${candidate.FirstName} ${candidate.LastName}` : candidate.CNIC}
                                </p>
                              )}
                              <div style={{ margin: '6px 0', fontSize: '12px', color: '#6b7280' }}>
                                <span>🗳️ Election Votes: <strong style={{ color: '#0ea5e9' }}>{candidate.ElectionVotes || 0}</strong></span>
                              </div>
                              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                                {candidate.Status === 'Eligible' && '✅ Eligible'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>No eligible candidates for {category}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* BUTTONS */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
              <button
                onClick={onBack}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleVote}
                disabled={!selectedCandidate || isVoting || !electionOpen}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  backgroundColor: (selectedCandidate && electionOpen && !isVoting) ? '#10b981' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: (selectedCandidate && electionOpen && !isVoting) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedCandidate && electionOpen && !isVoting) {
                    e.target.style.backgroundColor = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCandidate && electionOpen && !isVoting) {
                    e.target.style.backgroundColor = '#10b981';
                  }
                }}
              >
                {isVoting ? 'Voting...' : 'Cast Vote'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoteCandidate;
