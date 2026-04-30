import React, { useState } from 'react';
import { scheduleCommitteeMeeting } from '../api';

const CallMeetingModal = ({ committee, user, onClose }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const committeeName = committee?.PanelName || committee?.name || `Committee ${committee?.Id || committee?.id || ''}`;
  const panelId = committee?.Id || committee?.id;

  const handleScheduleMeeting = async () => {
    console.log('🔵 Modal handleScheduleMeeting called');
    console.log('🔵 Committee object:', committee);
    console.log('🔵 User object:', user);
    
    if (!panelId) {
      setStatusMessage('Invalid committee selected. Panel ID is missing.');
      console.error('❌ panelId is missing. Committee object:', committee);
      return;
    }
    if (!date || !time || !reason.trim()) {
      setStatusMessage('Please select a date, time, and reason for the meeting.');
      return;
    }
    if (!user?.cnic) {
      setStatusMessage('User information not available. Please refresh and try again.');
      console.error('❌ User CNIC is missing:', user);
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🔵 Scheduling meeting with data:', {
        panelId,
        meetingDate: date,
        meetingTime: time,
        reason: reason.trim(),
        scheduledByCnic: user.cnic,
      });
      
      await scheduleCommitteeMeeting({
        panelId,
        meetingDate: date,
        meetingTime: time,
        reason: reason.trim(),
        scheduledByCnic: user.cnic,
      });
      setStatusMessage('Meeting scheduled and notifications sent successfully.');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      console.error('❌ Schedule meeting error:', err);
      setStatusMessage(err.message || 'Failed to schedule meeting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Call Meeting</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Committee</label>
          <div style={styles.textBox}>{committeeName}</div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Meeting Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Meeting Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Meeting Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            style={styles.textarea}
            placeholder="Describe why the meeting is being called..."
          />
        </div>

        {statusMessage && <div style={styles.statusMessage}>{statusMessage}</div>}

        <div style={styles.buttonRow}>
          <button onClick={onClose} style={styles.cancelButton} disabled={isSubmitting}>
            Cancel
          </button>
          <button onClick={handleScheduleMeeting} style={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '16px',
  },
  modal: {
    width: '100%',
    maxWidth: '520px',
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.16)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    color: '#0f172a',
  },
  closeButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#e2e8f0',
    cursor: 'pointer',
    fontSize: '20px',
    color: '#334155',
  },
  description: {
    marginBottom: '20px',
    color: '#475569',
    lineHeight: 1.6,
  },
  fieldGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    color: '#0f172a',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    color: '#0f172a',
    resize: 'vertical',
  },
  textBox: {
    width: '100%',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    padding: '12px 14px',
    color: '#334155',
    backgroundColor: '#f8fafc',
  },
  statusMessage: {
    marginBottom: '16px',
    color: '#dc2626',
    fontSize: '14px',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
  },
  cancelButton: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#334155',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#0ea5e9',
    color: '#ffffff',
    cursor: 'pointer',
  },
};

export default CallMeetingModal;
