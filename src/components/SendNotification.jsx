import React, { useState } from 'react';
import logo from '../assets/logo.png';

const SendNotification = ({ onBack, onSend }) => {
  // Minimal admin notification composer.
  const [cnic, setCnic] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cnic || !message) {
      alert("Please enter CNIC and Message");
      return;
    }
    onSend({ recipientCnic: cnic, message });
  };

  return (
    <div style={styles.container}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <img src={logo} alt="Logo" style={{ height: '80px', width: 'auto' }} />
      </div>

      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Back</button>
        <h2>Send Notification</h2>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Recipient CNIC</label>
          <input
            type="text"
            value={cnic}
            onChange={(e) => setCnic(e.target.value)}
            placeholder="Enter user CNIC"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            rows={6}
            style={styles.textarea}
          />
        </div>

        <div style={styles.buttonRow}>
          <button type="submit" style={styles.submitButton}>Send Notification</button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '450px',
    margin: '0 auto',
    background: '#fff',
    padding: '20px',
    boxShadow: '0 0 15px rgba(0,0,0,0.1)',
    minHeight: '80vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '10px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    resize: 'vertical',
    boxSizing: 'border-box',
    minHeight: '120px',
    fontFamily: 'inherit',
  },
  buttonRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  submitButton: {
    flex: 1,
    padding: '12px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '16px',
  },
};

export default SendNotification;