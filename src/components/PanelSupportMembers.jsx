import React, { useEffect, useMemo, useState } from 'react';
import { getPanels, getSupportHistory, getNominations } from '../api';

const PanelSupportMembers = ({ user, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [supportHistory, setSupportHistory] = useState([]);
  const [myPanels, setMyPanels] = useState([]);
  const [nominationOpen, setNominationOpen] = useState(false);

  const getProfileImageUrl = (person) => person?.profileImage || person?.ProfileImage || null;

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.nhcId) {
          setSupportHistory([]);
          setMyPanels([]);
          setNominationOpen(false);
          return;
        }

        const [panels, nominations, supportData] = await Promise.all([
          getPanels({ nhcId: user.nhcId, cnic: user.cnic }),
          getNominations(user.nhcId),
          getSupportHistory(user.nhcId),
        ]);

        const record = (nominations || [])[0];
        if (record?.NominationStartDate && record?.NominationEndDate) {
          const startDateStr = String(record.NominationStartDate).split('T')[0];
          const endDateStr = String(record.NominationEndDate).split('T')[0];
          const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
          const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
          const startDate = new Date(startYear, startMonth - 1, startDay);
          const endDate = new Date(endYear, endMonth - 1, endDay);
          const today = new Date();
          setNominationOpen(today >= startDate && today <= endDate);
        } else {
          setNominationOpen(false);
        }

        setMyPanels(panels || []);
        setSupportHistory(supportData || []);
      } catch (err) {
        console.error('Failed to load panel support members:', err);
        setSupportHistory([]);
        setMyPanels([]);
        setNominationOpen(false);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const groupedPanels = useMemo(() => {
    const groups = Object.values(
      supportHistory.reduce((acc, support) => {
        const key = String(support.CandidateId || support.SupportId || support.CandidateCNIC);
        if (!acc[key]) {
          acc[key] = {
            id: key,
            name: support.Category || `${support.CandidateFirstName || 'Panel'} ${support.CandidateLastName || ''}`.trim() || 'Panel',
            supporters: [],
            candidateName: `${support.CandidateFirstName || ''} ${support.CandidateLastName || ''}`.trim(),
          };
        }
        acc[key].supporters.push(support);
        return acc;
      }, {})
    );

    return groups.map((group) => {
      return {
        id: group.id,
        name: group.name,
        candidateName: group.candidateName,
        supporters: group.supporters,
      };
    });
  }, [myPanels, supportHistory]);

  const groupedSupporters = useMemo(() => {
    const groups = Object.values(
      supportHistory.reduce((acc, support) => {
        const key = String(support.SupporterCNIC || support.SupportId);
        if (!acc[key]) {
          acc[key] = {
            id: key,
            name: `${support.SupporterFirstName || ''} ${support.SupporterLastName || ''}`.trim() || 'Supporter',
            email: support.SupporterEmail || '',
            cnic: support.SupporterCNIC || '',
            supports: [],
          };
        }
        acc[key].supports.push(support);
        return acc;
      }, {})
    );

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      email: group.email,
      cnic: group.cnic,
      supports: group.supports,
    }));
  }, [supportHistory]);

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
        maxWidth: '650px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#1f2937' }}>View your Panel Support Members</h2>
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <p>Loading support members...</p>
          </div>
        ) : supportHistory.length === 0 ? (
          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            No supporters yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>
              {myPanels.length > 0 ? 'You are a member of a panel. Support data is shown two ways below.' : 'You are not assigned to a panel.'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>Support by Candidate</div>
              {groupedPanels.map((panel) => (
                <div
                  key={panel.id}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '16px'
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                      {panel.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                      {panel.candidateName ? `Candidate: ${panel.candidateName}` : 'Support members'} · {panel.supporters.length} supporter{panel.supporters.length === 1 ? '' : 's'}
                    </div>
                  </div>

                  {panel.supporters.length === 0 ? (
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                      No supporters yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {panel.supporters.map((support, idx) => (
                        <div
                          key={`${panel.id}-${support.SupporterCNIC}-${idx}`}
                          style={{
                            backgroundColor: 'white',
                            borderLeft: '4px solid #3b82f6',
                            padding: '12px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {getProfileImageUrl(support) ? (
                              <img src={getProfileImageUrl(support)} alt={`${support.SupporterFirstName} ${support.SupporterLastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '16px', fontWeight: '700', color: '#64748b' }}>
                                {`${(support.SupporterFirstName || '').charAt(0)}${(support.SupporterLastName || '').charAt(0)}` || '👤'}
                              </span>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>
                              {support.SupporterFirstName} {support.SupporterLastName}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                              Email: {support.SupporterEmail || 'No email provided'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              CNIC: {support.SupporterCNIC}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}

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
            cursor: 'pointer'
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default PanelSupportMembers;
