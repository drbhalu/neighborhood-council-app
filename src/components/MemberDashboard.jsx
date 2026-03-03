import React, { useState } from 'react';
import './AdminDashboard.css';
import EditProfile from './EditProfile';
import ThreeDotMenu from './ThreeDotMenu';
import NotificationList from './NotificationList'; // FIX: Added Import
import ElectionsMenu from './ElectionsMenu';
import ElectionInfo from './ElectionInfo';
import NominationInfo from './NominationInfo';
import SelfNominationForm from './SelfNominationForm';
import ElectionVoting from './ElectionVoting';
import ElectionResults from './ElectionResults';
import PastElectionResults from './PastElectionResults';
import { updateUser, sendRequest, getUser } from '../api';
import logo from '../assets/logo.png';

const MemberDashboard = ({ user, onLogout }) => {
  const [currentUser, setCurrentUser] = useState(user);
  const [isEditing, setIsEditing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); // FIX: Added State
  const [showElectionsMenu, setShowElectionsMenu] = useState(false);
  const [selectedElectionOption, setSelectedElectionOption] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [showCommittee, setShowCommittee] = useState(false);

  // Check if user has a positional role (is a committee member)
  const isOfficer = ['President', 'Treasurer', 'Vice President'].includes(currentUser.role);

  const handleSaveProfile = async (updatedData) => {
    try {
      await updateUser(updatedData.cnic, updatedData);
      alert("Profile Updated Successfully!");
      setCurrentUser({ ...currentUser, ...updatedData });
      setIsEditing(false);
    } catch (error) {
      alert("Error updating profile");
    }
  };

  const handleRequestNHC = async () => {
    try {
      const fresh = await getUser(currentUser.cnic);
      const address = fresh && (fresh.Address || fresh.address) ? (fresh.Address || fresh.address) : (currentUser.address || 'Not provided');
      const location = fresh && (fresh.Location || fresh.location) ? (fresh.Location || fresh.location) : (currentUser.location || 'Not provided');
      const defaultMessage = `📍 Location: ${location}\n\n📮 Address: ${address}\n\nReason for requesting new NHC:`;
      setRequestMessage(defaultMessage);
      setShowRequestModal(true);
    } catch (error) {
      console.error(error);
      alert('Failed to fetch your location and address');
    }
  };

  const handleSendRequest = async () => {
    if (!requestMessage || requestMessage.trim() === '') return alert('Please enter a message');
    setIsSendingRequest(true);
    try {
      await sendRequest({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        cnic: currentUser.cnic,
        requestType: 'Create NHC',
        message: requestMessage,
        location: currentUser.location || ''
      });
      alert('Request sent to Admin!');
      setShowRequestModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to send request');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleChangeCouncil = async () => {
    const newCode = prompt("Enter New NHC Code (if known):");
    if (newCode) {
      try {
        await updateUser(currentUser.cnic, { ...currentUser, nhcCode: newCode });
        setCurrentUser({ ...currentUser, nhcCode: newCode });
        alert("Council Updated!");
      } catch(e) { alert("Error updating council"); }
    }
  };

  if (isEditing) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <EditProfile user={currentUser} onSave={handleSaveProfile} onCancel={() => setIsEditing(false)} />
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      
      {/* HEADER */}
      <div className="dashboard-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* THE LOGO */}
            <img src={logo} alt="Logo" style={{ height: '130px', width: 'auto' }} />
        </div>
        
        {/* CENTER: TITLE + THREE DOT MENU ON SAME LINE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '25px' }}>MEMBER DASHBOARD</div>
          <ThreeDotMenu 
            onEditProfile={() => setIsEditing(true)} 
            onRequestNHC={handleRequestNHC}
            onChangeCouncil={handleChangeCouncil} 
          />
        </div>

        {/* RIGHT: (Empty) */}
        <div></div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* 1. PROFILE PICTURE */}
        <div style={{
            width: '120px', height: '120px', borderRadius: '50%',
            backgroundColor: '#e2e8f0', display: 'flex', 
            justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
            marginBottom: '20px'
          }}>
          {currentUser.profileImage ? (
            <img src={currentUser.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '50px', color: '#94a3b8' }}>👤</span>
          )}

        </div>

        {/* 2. USER NAME */}
        <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#1f2937', textAlign: 'center' }}>
          {currentUser.firstName} {currentUser.lastName}
        </h2>

        {/* 3. NHC CODE */}
        <div style={{ 
            margin: '0 0 40px 0', fontSize: '18px', fontWeight: 'bold', 
            color: '#2563eb', backgroundColor: '#eff6ff', 
            padding: '8px 20px', borderRadius: '6px', textAlign: 'center' 
          }}>
            {currentUser.nhcCode || "No Council Assigned"}
        </div>

        {/* 3.5 ADD NEW NHC BUTTON */}
        <button 
          onClick={handleChangeCouncil}
          style={{
            marginBottom: '40px',
            padding: '8px 20px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            border: '2px solid #2563eb',
            borderRadius: '6px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#dbeafe';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#eff6ff';
          }}
        >
          Add New NHC
        </button>

        {/* 4. BUTTONS */}
        <div className="dashboard-menu" style={{ width: '100%' }}>
          <button className="menu-btn">File Complaint</button>
          
          {/* FIX: Added onClick handler */}
          <button className="menu-btn" onClick={() => setShowNotifications(true)}>Notifications</button>
          
          {/* FIX: Added onClick handler to show Elections menu */}
          <button className="menu-btn" onClick={() => setShowElectionsMenu(true)}>Elections</button>
          
          {/* NEW: Committee button (only for officers) */}
          {isOfficer && (
            <button className="menu-btn" onClick={() => setShowCommittee(true)}>
              Committee ({currentUser.role})
            </button>
          )}
          
          <button className="menu-btn">SUGGESTIONS</button>
        </div>

      </div>

      {/* FIX: Added Notification Modal */}
      {showNotifications && (
        <NotificationList user={currentUser} onClose={() => setShowNotifications(false)} />
      )}

      {/* NEW: Committee Panel */}
      {showCommittee && (
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
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px'
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#1f2937' }}>
                Committee Panel
              </h2>
              <button
                onClick={() => setShowCommittee(false)}
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

            <div style={{
              backgroundColor: '#f0f9ff',
              border: '2px solid #0ea5e9',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold', color: '#0369a1' }}>
                🎖️ Officer Information
              </p>
              <p style={{ margin: '6px 0', fontSize: '14px', color: '#0c4a6e' }}>
                <span style={{ fontWeight: 'bold' }}>Name:</span> {currentUser.firstName} {currentUser.lastName}
              </p>
              <p style={{ margin: '6px 0', fontSize: '14px', color: '#0c4a6e' }}>
                <span style={{ fontWeight: 'bold' }}>Position:</span> {currentUser.role}
              </p>
              <p style={{ margin: '6px 0', fontSize: '14px', color: '#0c4a6e' }}>
                <span style={{ fontWeight: 'bold' }}>NHC:</span> {currentUser.nhcCode}
              </p>
              <p style={{ margin: '6px 0', fontSize: '14px', color: '#0c4a6e' }}>
                <span style={{ fontWeight: 'bold' }}>Contact:</span> {currentUser.email || 'N/A'}
              </p>
            </div>

            <div style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>
                📋 Responsibilities
              </p>
              {currentUser.role === 'President' && (
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280', fontSize: '13px' }}>
                  <li>Lead the council and chair all meetings</li>
                  <li>Represent the NHC in official capacity</li>
                  <li>Oversee election and nomination processes</li>
                  <li>Make final decisions on disputes</li>
                </ul>
              )}
              {currentUser.role === 'Treasurer' && (
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280', fontSize: '13px' }}>
                  <li>Manage council finances and budget</li>
                  <li>Prepare financial reports</li>
                  <li>Maintain records of all transactions</li>
                  <li>Present financial statements to members</li>
                </ul>
              )}
              {currentUser.role === 'Vice President' && (
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280', fontSize: '13px' }}>
                  <li>Assist the President in council duties</li>
                  <li>Chair meetings in President's absence</li>
                  <li>Coordinate community activities</li>
                  <li>Communicate with members</li>
                </ul>
              )}
            </div>

            <button
              onClick={() => setShowCommittee(false)}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#3b82f6';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* FIX: Added Elections Menu Modal */}
      {showElectionsMenu && !selectedElectionOption && (
        <ElectionsMenu
          user={currentUser}
          onSelectOption={(option) => {
            setSelectedElectionOption(option);
          }}
          onClose={() => {
            setShowElectionsMenu(false);
            setSelectedElectionOption(null);
          }}
        />
      )}

      {/* FIX: Election Info Screen */}
      {selectedElectionOption === 'election' && (
        <ElectionInfo
          user={currentUser}
          onBack={() => {
            setSelectedElectionOption(null);
            setShowElectionsMenu(true);
          }}
        />
      )}

      {/* FIX: Nomination Info Screen */}
      {selectedElectionOption === 'nomination' && (
        <NominationInfo
          user={currentUser}
          onBack={() => {
            setSelectedElectionOption(null);
            setShowElectionsMenu(true);
          }}
        />
      )}

      {/* Panel Creation Form (formerly self nomination) */}
      {selectedElectionOption === 'selfnomination' && (
        <SelfNominationForm
          user={currentUser}
          onBack={(redirect) => {
            if (redirect === 'nomination') {
              // show nomination/support page directly
              setSelectedElectionOption('nomination');
              setShowElectionsMenu(false);
            } else {
              setSelectedElectionOption(null);
              setShowElectionsMenu(true);
            }
          }}
        />
      )}

      {/* FIX: Election Voting Screen - Show Eligible Candidates */}
      {selectedElectionOption === 'vote' && (
        <ElectionVoting
          user={currentUser}
          onBack={() => {
            setSelectedElectionOption(null);
            setShowElectionsMenu(false);
          }}
        />
      )}

      {/* FIX: Election Results Screen */}
      {selectedElectionOption === 'results' && (
        <ElectionResults
          user={currentUser}
          onBack={() => {
            setSelectedElectionOption(null);
            setShowElectionsMenu(true);
          }}
        />
      )}

      {/* Past Election Results Screen */}
      {selectedElectionOption === 'past-results' && (
        <PastElectionResults
          user={currentUser}
          onBack={() => {
            setSelectedElectionOption(null);
            setShowElectionsMenu(true);
          }}
        />
      )}

      {showRequestModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 8, width: '90%', maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Request New NHC</h3>
              <button onClick={() => setShowRequestModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ backgroundColor: '#f0f9ff', padding: 12, borderRadius: 6, marginBottom: 12, border: '1px solid #0ea5e9' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Your Information:</p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}><span style={{ fontWeight: 'bold', color: '#0ea5e9' }}>📍 Location:</span> {requestMessage.split('\n')[0].replace('📍 Location: ', '')}</p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}><span style={{ fontWeight: 'bold', color: '#059669' }}>📮 Address:</span> {requestMessage.split('Address: ')[1]?.split('\n')[0] || 'N/A'}</p>
            </div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>Additional Details:</label>
            <textarea
              value={requestMessage.includes('Reason for requesting new NHC:') ? requestMessage.split('Reason for requesting new NHC:')[1] : ''}
              onChange={(e) => {
                const location = requestMessage.split('📍 Location: ')[1].split('\n')[0];
                const address = requestMessage.split('📮 Address: ')[1].split('\n')[0];
                setRequestMessage(`📍 Location: ${location}\n\n📮 Address: ${address}\n\nReason for requesting new NHC:${e.target.value}`);
              }}
              placeholder="Explain why you need a new NHC..."
              rows={6}
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="menu-btn" onClick={() => setShowRequestModal(false)}>Cancel</button>
              <button className="submit-btn" onClick={handleSendRequest} disabled={isSendingRequest}>{isSendingRequest ? 'Sending...' : 'Send Request'}</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER: LOGOUT */}
      <div style={{ marginTop: '30px', marginBottom: '30px', textAlign: 'center' }}>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
    </div>
  );
};

export default MemberDashboard;