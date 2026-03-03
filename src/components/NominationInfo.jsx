import React, { useState, useEffect } from 'react';
import { getCandidates, supportCandidate, getNominations } from '../api';

const NominationInfo = ({ user, onBack }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supportingId, setSupportingId] = useState(null);
  const [nominationOpen, setNominationOpen] = useState(false);
  const [nominationStartDate, setNominationStartDate] = useState(null);
  const [nominationEndDate, setNominationEndDate] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (user.nhcId) {
          // Load candidates
          const data = await getCandidates(user.nhcId, user.cnic);
          setCandidates(data || []);

          // Load nomination dates
          const nominations = await getNominations();
          const record = (nominations || []).find(n => Number(n.NHC_Id) === Number(user.nhcId) || Number(n.NHCId) === Number(user.nhcId));
          
          if (record && record.NominationStartDate && record.NominationEndDate) {
            // Parse DATE from DB string "YYYY-MM-DD" safely as local date
            const startDateStr = String(record.NominationStartDate).split('T')[0];
            const endDateStr = String(record.NominationEndDate).split('T')[0];
            
            const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
            const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
            
            const startDate = new Date(startYear, startMonth - 1, startDay);
            const endDate = new Date(endYear, endMonth - 1, endDay);
            const today = new Date();
            
            // Check if today is within the range (inclusive)
            const isWithinRange = today >= startDate && today <= endDate;
            
            if (isWithinRange) {
              setNominationOpen(true);
            } else {
              setNominationOpen(false);
            }
            setNominationStartDate(record.NominationStartDate);
            setNominationEndDate(record.NominationEndDate);
          } else {
            setNominationOpen(false);
            setNominationStartDate(null);
            setNominationEndDate(null);
          }
        } else {
          setCandidates([]);
          setNominationOpen(false);
        }
      } catch (err) {
        console.error('Failed to load data', err);
        setCandidates([]);
        setNominationOpen(false);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleSupport = async (candidateId) => {
    if (!nominationOpen) {
      alert('Nominations are closed. You cannot support candidates at this time.');
      return;
    }
    
    if (supportingId) return;
    setSupportingId(candidateId);
    try {
      await supportCandidate(candidateId, user.cnic);
      const data = await getCandidates(user.nhcId, user.cnic);
      setCandidates(data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to support: ' + (err.message || 'Unknown'));
    } finally {
      setSupportingId(null);
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
          <h2 style={{ margin: 0, fontSize: '24px', color: '#1f2937' }}>✍️ Panel Candidates</h2>
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
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <p>Loading candidates...</p>
          </div>
        ) : !nominationOpen ? (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#991b1b' }}>
              🔒 Nominations Closed
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#7f1d1d' }}>
              The nomination period has ended. You cannot support candidates at this time.
            </p>
          </div>
        ) : candidates.length === 0 ? (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#b45309' }}>
              No panels yet
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
              Be the first to create a panel!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {candidates.map((candidate) => (
              <div key={candidate.Id} style={{
                backgroundColor: '#f0fdf4',
                border: '2px solid #10b981',
                borderRadius: '12px',
                padding: '20px',
              }}>
                {/* Panel Members Section */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                    👥 Panel Members:
                  </p>
                  {candidate.PanelMembers && candidate.PanelMembers.length > 0 ? (
                    <div>
                      {candidate.PanelMembers.map((member, idx) => (
                        <div key={member.CNIC} style={{
                          padding: '8px 0',
                          borderBottom: idx < candidate.PanelMembers.length - 1 ? '1px solid #d1d5db' : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <span style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                              {member.FirstName && member.LastName ? `${member.FirstName} ${member.LastName}` : member.CNIC}
                            </span>
                            <span style={{ marginLeft: '8px', fontSize: '13px', color: '#6b7280' }}>
                              ({member.CNIC})
                            </span>
                          </div>
                          <span style={{
                            padding: '4px 12px',
                            backgroundColor: member.Role === 'President' ? '#fbbf24' : member.Role === 'Treasurer' ? '#60a5fa' : '#34d399',
                            color: 'white',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {member.Role}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>No panel members</p>
                  )}
                </div>

                {/* Support Section */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid #d1d5db'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    {candidate.Status === 'Eligible' && (
                      <span style={{ color: '#10b981', fontWeight: '600', fontSize: '13px' }}>✅ Eligible</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                        {candidate.SupportCount || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Support
                      </div>
                    </div>
                    <button
                      onClick={() => handleSupport(candidate.Id)}
                      disabled={candidate.IsSupported || supportingId === candidate.Id || !nominationOpen}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: candidate.IsSupported ? '#9ca3af' : !nominationOpen ? '#9ca3af' : '#0ea5e9',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: candidate.IsSupported || supportingId === candidate.Id || !nominationOpen ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {supportingId === candidate.Id ? 'Supporting...' : (candidate.IsSupported ? 'Supported' : 'Support')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CLOSE BUTTON */}
        <button
          onClick={onBack}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px 20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#059669';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#10b981';
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default NominationInfo;
