import React, { useState, useEffect, useCallback } from 'react';
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
import CallMeetingModal from './CallMeetingModal';
import FileComplaint from './FileComplaint'; // NEW: Added Import
import MyComplaints from './MyComplaints';
import PresidentDashboard from './PresidentDashboard'; // NEW: Added Import
import ActiveCommittees from './ActiveCommittees'; // NEW: Added Import
import CreateCommitteeScreen from './CreateCommitteeScreen';
import CommitteeMeetingScreen from './CommitteeMeetingScreen';
import SuggestionsForm from './SuggestionsForm'; // NEW: Added Import
import TreasurerBudgetManagement from './TreasurerBudgetManagement'; // NEW: Added Import
import { updateUser, getComplaintsByNHC, getPanels, getUserRoleInNHC } from '../api';
import logo from '../assets/logo.png';
 
const MemberDashboard = ({ user, onLogout, onRequestNHCPage, onBackToChooseNHC }) => {
  const [currentUser, setCurrentUser] = useState(user);
  const [isEditing, setIsEditing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); // FIX: Added State
  const [showElectionsMenu, setShowElectionsMenu] = useState(false);
  const [selectedElectionOption, setSelectedElectionOption] = useState(null);
  const [showCommittee, setShowCommittee] = useState(false); // Show Committee (only for President)
  const [committeeView, setCommitteeView] = useState(null); // 'list', 'names', 'complaints', 'detail', 'money'
  const [showReports, setShowReports] = useState(false); // Show Reports (only for President)
  const [showComplaintForm, setShowComplaintForm] = useState(false); // NEW: Added State for Complaint Form
  const [showMyComplaints, setShowMyComplaints] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false); // NEW: State for Suggestions Form
  const [showTreasurerBudget, setShowTreasurerBudget] = useState(false); // NEW: State for Treasurer Budget
  const [complaints, setComplaints] = useState([]);
  const [complaintStatsLoading, setComplaintStatsLoading] = useState(false);
  const [memberCommittees, setMemberCommittees] = useState([]);
  const [selectedCommittee, setSelectedCommittee] = useState(null);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState(null);
  const [selectedCommitteeName, setSelectedCommitteeName] = useState('');
  const [showCallMeeting, setShowCallMeeting] = useState(false);
  const [selectedCommitteeForMeeting, setSelectedCommitteeForMeeting] = useState(null);

  // Check if user has multiple NHCs
  const hasMultipleNHCs = user && user.nhcOptions && user.nhcOptions.length > 1;

  const isOfficer = ['President', 'Treasurer', 'Vice President'].includes(currentUser.role);
  const isPresident = currentUser.role === 'President';
  const hasCommitteeMembership = memberCommittees.length > 0;
  const committeeBackView = isPresident ? 'list' : 'complaints';

  const fetchMyCommittees = useCallback(async () => {
    try {
      const data = await getPanels({
        cnic: currentUser.cnic,
        committeeOnly: true,
        nhcId: currentUser.nhcId,
      });
      setMemberCommittees(data || []);
    } catch (err) {
      console.error('Error fetching user committees:', err);
      setMemberCommittees([]);
    }
  }, [currentUser.cnic, currentUser.nhcId]);

  const committeeGroups = Object.values(
    memberCommittees.reduce((acc, committee) => {
      const panelId = committee.Id;
      const committeeName = committee.PanelName || `Committee #${panelId}`;
      if (!acc[panelId]) {
        acc[panelId] = {
          id: panelId,
          name: committeeName,
          status: committee.Status,
          memberCount: Number(committee.MemberCount || 0),
          complaints: [],
        };
      }

      if (committee.ComplaintId) {
        const alreadyAdded = acc[panelId].complaints.some(
          (item) => String(item.ComplaintId) === String(committee.ComplaintId)
        );
        if (!alreadyAdded) {
          acc[panelId].complaints.push({
            Id: committee.Id,
            ComplaintId: committee.ComplaintId,
            ComplaintCategory: committee.ComplaintCategory,
            ComplaintDescription: committee.ComplaintDescription,
            ComplaintStatus: committee.ComplaintStatus || committee.Status,
            ComplaintUserName: committee.ComplaintUserName,
            ComplaintUserCNIC: committee.ComplaintUserCNIC,
            UserName: committee.UserName,
            UserCNIC: committee.UserCNIC,
            ComplaintType: committee.ComplaintType,
            PanelName: committeeName,
          });
        }
      }

      return acc;
    }, {})
  );

  const selectedCommitteeComplaints = committeeGroups.find((group) => group.id === selectedCommitteeId)?.complaints || [];
  const activeCommitteeComplaints = selectedCommitteeComplaints.filter((complaint) => {
    const status = String(complaint.ComplaintStatus || complaint.Status || '').trim().toLowerCase();
    return status !== 'resolved';
  });

  // Verify NHC-specific role whenever NHC code changes
  useEffect(() => {
    const verifyRoleForNHC = async () => {
      if (!currentUser.nhcCode) return;
      
      try {
        const roleResponse = await getUserRoleInNHC(currentUser.cnic, currentUser.nhcCode);
        const verifiedRole = roleResponse.role;
        
        // Update currentUser with verified role
        setCurrentUser(prev => ({ ...prev, role: verifiedRole }));
      } catch (err) {
        console.error('Error verifying NHC role:', err);
        // Fall back to existing role if verification fails
      }
    };
    
    verifyRoleForNHC();
  }, [currentUser.nhcCode]); // Re-verify whenever nhcCode changes

  useEffect(() => {
    if (currentUser?.cnic) {
      fetchMyCommittees();
    }
  }, [currentUser.cnic, fetchMyCommittees]);

  useEffect(() => {
    if (!showCommittee || !currentUser?.cnic) return;

    const refreshCommittees = () => {
      fetchMyCommittees();
    };

    const intervalId = setInterval(refreshCommittees, 5000);
    window.addEventListener('focus', refreshCommittees);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', refreshCommittees);
    };
  }, [showCommittee, currentUser.cnic, fetchMyCommittees]);

  useEffect(() => {
    if (isPresident && currentUser.nhcCode) {
      const fetchComplaints = async () => {
        try {
          setComplaintStatsLoading(true);
          const data = await getComplaintsByNHC(currentUser.nhcCode);
          setComplaints(data || []);
        } catch (err) {
          console.error('Error fetching complaints:', err);
          setComplaints([]);
        } finally {
          setComplaintStatsLoading(false);
        }
      };
      fetchComplaints();
    }
  }, [isPresident, currentUser.nhcCode]);

  const normalizeStatus = (status) => {
    const normalized = (status || 'Pending').toLowerCase().replace(/\s+/g, '-');
    if (normalized === 'open') return 'pending';
    if (normalized === 'inprogress') return 'in-progress';
    return normalized;
  };

  const totalComplaints = complaints.length;
  const pendingComplaints = complaints.filter(c => normalizeStatus(c.Status) === 'pending').length;
  const inProgressComplaints = complaints.filter(c => normalizeStatus(c.Status) === 'in-progress').length;
  const resolvedComplaints = complaints.filter(c => normalizeStatus(c.Status) === 'resolved').length;

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

  // this handler will be provided by parent (App.jsx) to navigate to request page
  const handleRequestNHC = () => {
    if (typeof onRequestNHCPage === 'function') {
      onRequestNHCPage();
    }
  };


  const handleChangeCouncil = async () => {
    const newCode = prompt("Enter New NHC Code (leave blank to cancel):");
    if (newCode) {
      try {
        // combine with existing codes (comma-separated)
        const existing = currentUser.nhcCode || '';
        const parts = existing
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        if (!parts.includes(newCode.trim())) {
          parts.push(newCode.trim());
        }
        const updated = parts.join(', ');
        await updateUser(currentUser.cnic, { ...currentUser, nhcCode: updated });
        setCurrentUser({ ...currentUser, nhcCode: updated });
        alert("Council list updated!");
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
         {/* LEFT: Back button if multiple NHCs */}
         <div style={{ display: 'flex', alignItems: 'center' }}>
           {hasMultipleNHCs && (
             <button
               onClick={() => {
                 if (typeof onBackToChooseNHC === 'function') {
                   onBackToChooseNHC();
                 }
               }}
               style={{
                 background: 'none',
                 border: 'none',
                 fontSize: '24px',
                 cursor: 'pointer',
                 color: '#2563eb',
                 marginRight: '15px'
               }}
               title="Back to NHC selection"
             >
               ← Back
             </button>
           )}
         </div>
         
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

        <div style={{
          margin: '0 0 20px 0',
          fontSize: '16px',
          color: '#475569',
          backgroundColor: '#f8fafc',
          padding: '8px 16px',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          CNIC: {currentUser.cnic || 'N/A'}
        </div>

        {/* 3.5 ADD NEW NHC BUTTON */}
        <button 
          onClick={handleRequestNHC}
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

        {/* PRESIDENT STATISTICS CARDS (President only) */}
        {isPresident && (
          <div style={{ width: '100%', marginBottom: '40px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              Complaint Statistics
            </h3>
            
            {complaintStatsLoading ? (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#666'
              }}>
                Loading statistics...
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                {/* TOTAL COMPLAINTS */}
                <div
                  style={{
                    backgroundColor: '#0ea5e9',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease'
                  }}
                  onClick={() => setShowReports(true)}
                  onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    color: 'white',
                    fontWeight: '500'
                  }}>
                    Total
                  </p>
                  <span style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    {totalComplaints}
                  </span>
                </div>

                {/* PENDING COMPLAINTS */}
                <div
                  style={{
                    backgroundColor: '#0ea5e9',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease'
                  }}
                  onClick={() => setShowReports(true)}
                  onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    color: 'white',
                    fontWeight: '500'
                  }}>
                    Pending
                  </p>
                  <span style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    {pendingComplaints}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. BUTTONS */}
        <div className="dashboard-menu" style={{ width: '100%' }}>
          <button 
            className="menu-btn" 
            onClick={() => {
              // Validate if user has an NHC allocation
              if (!currentUser.nhcCode) {
                alert('⚠️ You must be allocated to an NHC to file a complaint.\n\nPlease request to join an NHC first.');
                return;
              }
              setShowComplaintForm(true);
            }}
          >
            File Complaint
          </button>

          <button className="menu-btn" onClick={() => setShowMyComplaints(true)}>
            My Complaints
          </button>
          
          {/* FIX: Added onClick handler */}
          <button className="menu-btn" onClick={() => setShowNotifications(true)}>Notifications</button>
          
          {/* FIX: Added onClick handler to show Elections menu */}
          <button className="menu-btn" onClick={() => setShowElectionsMenu(true)}>Elections</button>
          
          {/* Complaints button - Show President Dashboard (only for President) */}
          {isPresident && (
            <button className="menu-btn" onClick={() => setShowReports(true)}>Dashboard</button>
          )}
          
          {/* Committee button (officers) */}
          {(isOfficer || hasCommitteeMembership) && (
            <button className="menu-btn" onClick={() => {
              setSelectedCommittee(null);
              setSelectedCommitteeName('');
              setShowCommittee(true);
              setCommitteeView(isPresident ? 'list' : 'names');
            }}>
              Committee ({currentUser.role})
            </button>
          )}

          {/* Treasurer Budget button */}
          {currentUser.role === 'Treasurer' && (
            <button className="menu-btn" onClick={() => setShowTreasurerBudget(true)}>
              Budget Requests
            </button>
          )}
          
          <button className="menu-btn" onClick={() => setShowSuggestions(true)}>SUGGESTIONS</button>
        </div>

      </div>

      {/* FIX: Added Notification Modal */}
      {showNotifications && (
        <NotificationList user={currentUser} onClose={() => setShowNotifications(false)} />
      )}

      {/* NEW: File Complaint Form */}
      {showComplaintForm && (
        <FileComplaint 
          user={currentUser} 
          onClose={() => setShowComplaintForm(false)}
          onSuccess={() => {
            // Optional: refresh data or show success message
          }}
        />
      )}

      {showMyComplaints && (
        <MyComplaints
          user={currentUser}
          onClose={() => setShowMyComplaints(false)}
        />
      )}

      {/* NEW: Show Suggestions Form */}
      {showSuggestions && (
        <SuggestionsForm
          user={currentUser}
          onClose={() => setShowSuggestions(false)}
        />
      )}

      {showCommittee && committeeView === 'list' && (
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
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCommitteeView('menu');
            }
          }}
        >
          {/* MODAL CARD */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '760px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
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
                onClick={() => {
                  setShowCommittee(false);
                  setCommitteeView(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
                title="Go back"
              >
                ✕
              </button>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '26px' }}>Active Committees</h2>
              <div style={{ width: '24px' }}></div>
            </div>

            <p style={{ margin: '0 24px 12px 24px', color: '#64748b' }}>
              View currently active committees and create a new one.
            </p>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px' }}>
              <ActiveCommittees
                user={currentUser}
                onCreateNewCommittee={() => setCommitteeView('create')}
                onOpenCommittee={(committee) => {
                  setSelectedCommitteeId(committee.Id);
                  setSelectedCommitteeName(committee.panelName || committee.PanelName || `Committee #${committee.Id}`);
                  setSelectedCommittee(null);
                  setCommitteeView('complaints');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showCommittee && committeeView === 'names' && (
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
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCommittee(false);
              setCommitteeView(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '760px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
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
                onClick={() => {
                  setShowCommittee(false);
                  setCommitteeView(null);
                }}
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
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '26px' }}>My Committees</h2>
              <div style={{ width: '24px' }}></div>
            </div>

            <p style={{ margin: '0 24px 12px 24px', color: '#64748b' }}>
              Select a committee to view all complaints assigned to it.
            </p>

            <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {committeeGroups.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    textAlign: 'center',
                  }}
                >
                  No committees found for your account.
                </div>
              ) : (
                committeeGroups.map((group) => (
                  <div
                    key={`committee-group-${group.name}`}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px 14px 14px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>
                      {group.name}
                    </div>

                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                      Assigned complaints: {group.complaints.length}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          setSelectedCommitteeId(group.id);
                          setSelectedCommitteeName(group.name);
                          setSelectedCommittee(null);
                          setCommitteeView('complaints');
                        }}
                        style={{
                          padding: '8px 10px',
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: '#0ea5e9',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Open Committee
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showCommittee && committeeView === 'complaints' && (
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
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCommittee(false);
              setCommitteeView(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '760px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
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
                onClick={() => setCommitteeView(isPresident ? 'list' : 'names')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
                title="Back"
              >
                ←
              </button>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '26px' }}>{selectedCommitteeName || 'Committee'} Complaints</h2>
              <div style={{ width: '24px' }}></div>
            </div>

            <p style={{ margin: '0 24px 12px 24px', color: '#64748b' }}>
              Select a complaint assigned to this committee.
            </p>

            <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeCommitteeComplaints.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    textAlign: 'center',
                  }}
                >
                  No active complaints assigned to this committee.
                </div>
              ) : (
                activeCommitteeComplaints.map((committee) => (
                  <div
                    key={`committee-complaint-${committee.Id}-${committee.ComplaintId}`}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px 14px 14px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                      {committee.ComplaintCategory || 'Complaint'}
                    </div>

                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                      Complaint ID: {committee.ComplaintId}
                    </div>

                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                      {committee.ComplaintDescription || 'No complaint details available.'}
                    </p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          setSelectedCommittee(committee);
                          setCommitteeView('detail');
                        }}
                        style={{
                          padding: '8px 10px',
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: '#0ea5e9',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Add Meeting Decisions
                      </button>

                      <button
                        onClick={() => {
                          setSelectedCommitteeForMeeting(committee);
                          setShowCallMeeting(true);
                        }}
                        style={{
                          padding: '8px 10px',
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Call Meeting
                      </button>

                      <button
                        onClick={() => {
                          setSelectedCommittee(committee);
                          setCommitteeView('money');
                        }}
                        style={{
                          padding: '8px 10px',
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: '#16a34a',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Request Budget
                      </button>

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isPresident && showCommittee && committeeView === 'create' && (
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
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCommitteeView(committeeBackView);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '760px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
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
                onClick={() => setCommitteeView('list')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
                title="Go back"
              >
                ←
              </button>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '26px' }}>Create Committee</h2>
              <div style={{ width: '24px' }}></div>
            </div>

            <p style={{ margin: '0 24px 12px 24px', color: '#64748b' }}>
              Create a committee and assign a complaint.
            </p>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px' }}>
              <CreateCommitteeScreen
                user={currentUser}
                onBack={() => setCommitteeView('list')}
                onCreated={async () => {
                  try {
                    const data = await getPanels({ 
                      cnic: currentUser.cnic, 
                      committeeOnly: true,
                      nhcId: currentUser.nhcId // Filter by current NHC
                    });
                    setMemberCommittees(data || []);
                  } catch (_) {}
                  setCommitteeView('list');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showCommittee && committeeView === 'detail' && selectedCommittee && (
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
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCommitteeView('list');
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <CommitteeMeetingScreen
              committee={selectedCommittee}
              user={currentUser}
              onBack={() => setCommitteeView(committeeBackView)}
              onSaved={async () => {
                await fetchMyCommittees();
                setCommitteeView(committeeBackView);
              }}
            />
          </div>
        </div>
      )}

      {showCommittee && committeeView === 'money' && (
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
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCommitteeView(committeeBackView);
            }
          }}
        >
          {/* MODAL CARD */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '760px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
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
                onClick={() => setCommitteeView(committeeBackView)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
                title="Go back"
              >
                ✕
              </button>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '26px' }}>Raise Money</h2>
              <div style={{ width: '24px' }}></div>
            </div>

            <p style={{ margin: '0 24px 12px 24px', color: '#64748b' }}>
              Raise money options for committee activities{selectedCommittee?.PanelName ? ` - ${selectedCommittee.PanelName}` : ''}.
            </p>

            <div
              style={{
                margin: '0 24px 24px 24px',
                padding: '24px',
                textAlign: 'center',
                color: '#475569',
                fontSize: '16px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ marginBottom: '20px' }}>💰</div>
              Raise Money feature coming soon...
            </div>
          </div>
        </div>
      )}

      {/* NEW: Show President Dashboard / Reports (only for President) */}
      {showReports && (
        <PresidentDashboard user={currentUser} onClose={() => setShowReports(false)} />
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

      {showCallMeeting && selectedCommitteeForMeeting && (
        <CallMeetingModal
          committee={selectedCommitteeForMeeting}
          user={currentUser}
          onClose={() => {
            setShowCallMeeting(false);
            setSelectedCommitteeForMeeting(null);
          }}
        />
      )}

      {/* Treasurer Budget Management Screen */}
      {showTreasurerBudget && (
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
            padding: '20px',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTreasurerBudget(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <TreasurerBudgetManagement
                user={currentUser}
                nhcCode={currentUser.nhcCode}
                onBack={() => setShowTreasurerBudget(false)}
              />
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