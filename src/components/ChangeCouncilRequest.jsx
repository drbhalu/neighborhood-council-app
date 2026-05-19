import React, { useState, useEffect } from 'react';
import { getNHCList } from '../api';

const ChangeCouncilRequest = ({ user, currentNHC, onSubmit, onCancel }) => {
  // Council change request form state.
  const [allNHCs, setAllNHCs] = useState([]);
  const [selectedNHC, setSelectedNHC] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNHCs = async () => {
      try {
        setLoading(true);
        const nhcList = await getNHCList();
        // Exclude the user's current council from the selection list.
        const filtered = (nhcList || []).filter(
          nhc => nhc.name !== currentNHC && nhc.Name !== currentNHC
        );
        setAllNHCs(filtered);
      } catch (err) {
        setError('Failed to load NHC list');
        console.error('Error loading NHCs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadNHCs();
  }, [currentNHC]);

  const handleSubmit = async () => {
    // Validate the selected destination council and the reason first.
    if (!selectedNHC) {
      alert('Please select a new NHC');
      return;
    }
    if (!reason.trim()) {
      alert('Please provide a reason for the change');
      return;
    }
    
    setSubmitting(true);
    try {
      await onSubmit({
        cnic: user.cnic,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        currentNHC: currentNHC,
        requestedNHC: selectedNHC,
        reason: reason.trim(),
        requestType: 'Change Council',
      });
    } catch (err) {
      alert('Failed to submit request: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(248,250,252,0.98)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'stretch',
      padding: '0'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0',
        padding: '32px 28px',
        width: '100%',
        maxWidth: 'none',
        minHeight: '100vh',
        maxHeight: '100vh',
        boxShadow: 'none',
        overflowY: 'auto'
      }}>
        {/* Header and close action for the council change request. */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#1f2937' }}>
            📍 Change Council
          </h2>
          <button
            onClick={onCancel}
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

        {/* Show the member's current council for context. */}
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#065f46', fontWeight: '600' }}>
            Current Council
          </p>
          <p style={{ margin: 0, fontSize: '16px', color: '#1f2937', fontWeight: '700' }}>
            {currentNHC || 'No Council Assigned'}
          </p>
        </div>

        {/* Surface load or validation errors above the form. */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#991b1b',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {/* Loading state while council choices are fetched. */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Loading available councils...
          </div>
        )}

        {/* Council selection and reason fields. */}
        {!loading && (
          <>
            {/* SELECT NEW NHC */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Select New Council
              </label>
              <select
                value={selectedNHC}
                onChange={(e) => setSelectedNHC(e.target.value)}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  backgroundColor: 'white',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="">-- Select a Council --</option>
                {allNHCs.map((nhc, idx) => (
                  <option key={idx} value={nhc.name || nhc.Name}>
                    {nhc.name || nhc.Name}
                  </option>
                ))}
              </select>
              {allNHCs.length === 0 && (
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '12px',
                  color: '#b91c1c'
                }}>
                  No other councils available to switch to.
                </p>
              )}
            </div>

            {/* REASON TEXTAREA */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Reason for Change
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                placeholder="Explain why you want to change to the selected council..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  minHeight: '100px',
                  resize: 'vertical',
                  cursor: submitting ? 'not-allowed' : 'text'
                }}
              />
            </div>

            {/* ACTION BUTTONS */}
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || allNHCs.length === 0}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: (submitting || allNHCs.length === 0) ? '#d1d5db' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: (submitting || allNHCs.length === 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (submitting || allNHCs.length === 0) return;
                  e.target.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  if (submitting || allNHCs.length === 0) return;
                  e.target.style.backgroundColor = '#3b82f6';
                }}
              >
                {submitting ? '⏳ Submitting...' : '✓ Submit Request'}
              </button>
              <button
                onClick={onCancel}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: submitting ? '#d1d5db' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (submitting) return;
                  e.target.style.backgroundColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  if (submitting) return;
                  e.target.style.backgroundColor = '#ef4444';
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChangeCouncilRequest;
