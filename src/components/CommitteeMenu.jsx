import React from 'react';

const CommitteeMenu = ({ onSelectCommittees, onSelectRaiseMoney, onClose }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
      }}
    >
      {/* MODAL CARD */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          width: '90%',
          maxWidth: '760px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '22px 24px 10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#6b7280',
            }}
            title="Close"
          >
            ✕
          </button>
          <h2 style={{ margin: 0, color: '#1f2937', fontSize: '26px' }}>Committee Dashboard</h2>
          <div style={{ width: '24px' }}></div>
        </div>

        <p style={{ margin: '0 24px 14px 24px', color: '#64748b' }}>
          Select a committee action.
        </p>

        <div
          style={{
            padding: '0 24px 24px 24px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
          <button
            onClick={onSelectRaiseMoney}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '20px 16px',
              fontSize: '16px',
              fontWeight: '700',
              color: '#0f172a',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ffffff';
            }}
          >
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>💰</div>
            <div>Raise Money</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Manage committee funding requests</div>
          </button>

          <button
            onClick={onSelectCommittees}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '20px 16px',
              fontSize: '16px',
              fontWeight: '700',
              color: '#0f172a',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ffffff';
            }}
          >
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>👥</div>
            <div>Active Committees</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>View and create committees</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommitteeMenu;
