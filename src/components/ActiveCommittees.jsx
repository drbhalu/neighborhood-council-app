import React, { useState, useEffect } from 'react';
import { getPanels } from '../api';

const ActiveCommittees = ({ user, onCreateNewCommittee, onOpenCommittee }) => {
  const canCreateCommittee = String(user?.role || '') === 'President';
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.cnic) {
      fetchPanels();
    }
  }, [user.cnic]);

  const fetchPanels = async () => {
    try {
      setLoading(true);
      // Show committees where current user is a president/member.
      const filters = { cnic: user.cnic };
      const data = await getPanels(filters);
      setPanels(data || []);
    } catch (error) {
      console.error('Error fetching panels:', error);
      setPanels([]);
    } finally {
      setLoading(false);
    }
  };
  const memberCommittees = panels || [];

  const getFormedDaysText = (createdDate) => {
    if (!createdDate) return 'Formed recently';
    const created = new Date(createdDate);
    if (Number.isNaN(created.getTime())) return 'Formed recently';
    const today = new Date();
    const diffMs = today.getTime() - created.getTime();
    const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    if (days === 0) return 'Formed today';
    if (days === 1) return 'Formed 1 day ago';
    return `Formed ${days} days ago`;
  };

  const getComplaintText = (panel) => {
    if (panel.Description && String(panel.Description).trim()) {
      return panel.Description;
    }
    if (panel.ComplaintCategory) {
      return panel.ComplaintCategory;
    }
    return 'No complaint assigned';
  };

  const getCommitteeStatusStyle = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'active') return { bg: '#dcfce7', text: '#166534', border: '#86efac', label: 'Active' };
    if (normalized === 'pending') return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', label: 'Pending' };
    if (normalized === 'rejected') return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', label: 'Rejected' };
    return { bg: '#e2e8f0', text: '#334155', border: '#cbd5e1', label: status || 'Unknown' };
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading committees...</div>;
  }

  return (
    <div style={{ paddingBottom: '12px' }}>
      {memberCommittees.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
          {memberCommittees.map((panel) => (
            <div
              key={panel.Id}
              onClick={() => {
                if (typeof onOpenCommittee === 'function') {
                  onOpenCommittee(panel);
                }
              }}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px',
                backgroundColor: '#ffffff',
                cursor: typeof onOpenCommittee === 'function' ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#0f172a', fontSize: '18px' }}>
                    {panel.PanelName || 'Committee'}
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                    {Number(panel.MemberCount || 0)} members | {getFormedDaysText(panel.CreatedDate)}
                  </p>
                </div>
                <span
                  style={{
                    backgroundColor: getCommitteeStatusStyle(panel.Status).bg,
                    color: getCommitteeStatusStyle(panel.Status).text,
                    border: `1px solid ${getCommitteeStatusStyle(panel.Status).border}`,
                    borderRadius: '999px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {getCommitteeStatusStyle(panel.Status).label}
                </span>
              </div>

              <p style={{ margin: '10px 0 0 0', color: '#334155', lineHeight: '1.45' }}>
                {getComplaintText(panel)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#f8fafc',
            padding: '30px',
            textAlign: 'center',
            borderRadius: '8px',
            color: '#475569',
            fontSize: '14px',
            marginBottom: '18px',
          }}
        >
          No committees found for your account
        </div>
      )}

      {canCreateCommittee && (
        <div style={{ marginBottom: '14px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onCreateNewCommittee === 'function') {
                onCreateNewCommittee();
              } else {
                alert('Create committee screen is not available right now.');
              }
            }}
            style={{
              width: '100%',
              padding: '12px 20px',
              backgroundColor: '#2f91bb',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '800',
              textTransform: 'uppercase',
            }}
          >
            Create New Committee
          </button>
        </div>
      )}

    </div>
  );
};

export default ActiveCommittees;
