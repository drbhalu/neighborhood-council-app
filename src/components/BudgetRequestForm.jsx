import React, { useState, useEffect } from 'react';
import { sendNotification, getAllUsers, getNHCList } from '../api';

const BudgetRequestForm = ({ user, nhcId, committeeId, onClose }) => {
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value || !description || !accountName || !accountNumber) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Get all users and NHC list
      const allUsers = await getAllUsers();
      const nhcList = await getNHCList();
      const nhc = nhcList.find(n => n.id === nhcId);
      const nhcCode = nhc ? (nhc.name || nhc.Name) : null;
      
      console.log('nhcId:', nhcId);
      console.log('Found NHC:', nhc);
      console.log('nhcCode:', nhcCode);
      
      // Filter users in this NHC
      const nhcMembers = allUsers.filter(u => u.NHC_Code && nhcCode && u.NHC_Code.split(', ').includes(nhcCode));
      
      console.log('All users:', allUsers.length);
      console.log('NHC members:', nhcMembers.length);
      
      const message = `Community request from ${user.firstName} ${user.lastName} (${user.cnic}):\nAmount: ${value}\nPurpose: ${description}\nAccount: ${accountName}\nAccount Number: ${accountNumber}`;

      // Send notification to each NHC member with NHC_Code
      for (const member of nhcMembers) {
        await sendNotification({ recipientCnic: member.CNIC, message, nhcCode });
      }

      alert('Budget request sent to all NHC members!');
      onClose();
    } catch (error) {
      console.error('Error sending budget request:', error);
      alert('Error sending request');
    } finally {
      setLoading(false);
    }
  };

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
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          width: '400px',
          maxWidth: '90%',
        }}
      >
        <h2>Request Budget</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label>Value of Request:</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter amount"
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Description:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the budget request"
              rows="4"
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Account Title:</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Enter account title"
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label>Account Number:</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter account number"
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ccc',
                color: 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetRequestForm;