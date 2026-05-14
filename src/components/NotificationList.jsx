import React, { useState, useEffect } from 'react';
import { getNotifications, acceptPanelInvite, declinePanelInvite, getNHCList } from '../api';

const NotificationList = ({ user, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationDetails, setNotificationDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getNotifications(user.cnic, user.nhcCode);
        setNotifications(data);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    if(user && user.cnic) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const getNotificationTypeLabel = (type) => {
    const labels = {
      'complaint_approval': 'Complaint Approved',
      'complaint_update': 'Complaint Updated',
      'complaint_resolution': 'Complaint Resolved',
      'budget_allocated': 'Budget Allocated',
      'budget_released': 'Budget Released',
      'election_scheduled': 'Election Scheduled',
      'meeting_scheduled': 'Meeting Scheduled',
      'panel_invite': 'Panel Invitation',
    };
    return labels[type] || 'Notification';
  };

  const handleNotificationClick = async (notification) => {
    setLoading(true);
    setSelectedNotification(notification);
    
    // Build context details based on NotificationType
    let details = {
      id: notification.Id,
      message: notification.Message,
      type: notification.NotificationType || 'Notification',
      typeLabel: getNotificationTypeLabel(notification.NotificationType),
      createdDate: new Date(notification.CreatedDate).toLocaleString(),
      context: null,
      source: null
    };

    try {
      // Handle complaint-related notifications
      if (notification.RelatedComplaintId && 
          (notification.NotificationType?.includes('complaint') || 
           notification.NotificationType?.includes('budget'))) {
        
        // Fetch specific complaint by ID
        const response = await fetch(`http://localhost:3001/api/complaint/${notification.RelatedComplaintId}`);
        if (response.ok) {
          const complaint = await response.json();
          
          // Get complainant user details
          const userRes = await fetch(`http://localhost:3001/api/user/${complaint.UserCNIC}`);
          let complainantName = complaint.UserCNIC;
          if (userRes.ok) {
            const complainantUser = await userRes.json();
            complainantName = `${complainantUser.FirstName || ''} ${complainantUser.LastName || ''}`.trim() || complaint.UserCNIC;
          }

          // Get NHC details
          const nhcList = await getNHCList();
          const nhc = nhcList.find(n => n.NHC_Code === complaint.NHC_Code);
          const nhcName = nhc?.Name || complaint.NHC_Code;

          details.context = {
            type: 'Complaint',
            id: complaint.Id,
            title: complaint.Title || 'No Title',
            description: complaint.Description || '',
            status: complaint.Status,
            category: complaint.Category,
            complainant: complainantName,
            nhc: nhcName,
            location: complaint.Location || 'N/A',
            createdDate: new Date(complaint.CreatedDate).toLocaleDateString()
          };

          details.source = `Complaint #${complaint.Id} from ${complainantName}`;
        }
      } 
      // Handle election notifications
      else if (notification.RelatedElectionId && notification.NotificationType?.includes('election')) {
        details.context = {
          type: 'Election',
          id: notification.RelatedElectionId,
          note: 'Election details fetched from the notification'
        };
        details.source = `Election #${notification.RelatedElectionId}`;
      } 
      // Handle meeting notifications
      else if (notification.RelatedMeetingId && notification.NotificationType?.includes('meeting')) {
        details.context = {
          type: 'Committee Meeting',
          id: notification.RelatedMeetingId,
          note: 'Meeting scheduled for committee members'
        };
        details.source = `Committee Meeting #${notification.RelatedMeetingId}`;
      }

      // If it's a panel invitation
      if (notification.PanelId && notification.Role) {
        details.source = `Panel Invitation - ${notification.Role} Role`;
        details.context = {
          type: 'Panel Invitation',
          role: notification.Role,
          panelId: notification.PanelId
        };
      }

      // Fallback for notifications without context
      if (!details.source) {
        details.source = 'Notification';
      }
    } catch (err) {
      console.warn('Could not fetch notification context:', err);
      details.source = 'Unable to load full context';
    }

    setNotificationDetails(details);
    setLoading(false);
  };

  const closeDetailModal = () => {
    setSelectedNotification(null);
    setNotificationDetails(null);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(248,250,252,0.98)', zIndex: 2000,
      display: 'flex', justifyContent: 'center', alignItems: 'stretch',
      padding: '0'
    }}>
      <div style={{ 
          backgroundColor: 'white', padding: '28px', borderRadius: '0', 
          width: '100%', maxWidth: 'none', height: '100vh', maxHeight: '100vh', overflowY: 'auto',
          boxShadow: 'none'
        }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3>Notifications</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {notifications.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888' }}>No new notifications.</p>
        ) : (
          notifications.map((note) => (
            <div 
              key={note.Id} 
              onClick={() => handleNotificationClick(note)}
              style={{ 
                borderBottom: '1px solid #eee', 
                padding: '12px',
                cursor: 'pointer',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                marginBottom: '10px',
                transition: 'all 0.2s',
                border: '1px solid #e5e7eb',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f8ff';
                e.currentTarget.style.borderColor = '#0ea5e9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f9f9f9';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#374151', lineHeight: '1.4' }}>
                {note.Message}
              </p>
              <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#9ca3af' }}>
                {new Date(note.CreatedDate).toLocaleString()}
              </p>
              {note.PanelId && note.Role && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await acceptPanelInvite(note.PanelId, user.cnic);
                        const data = await getNotifications(user.cnic);
                        setNotifications(data);
                        alert('Invitation accepted');
                      } catch (err) {
                        console.error('Failed to accept invite', err);
                        alert('Failed to accept invitation');
                      }
                    }}
                  >
                    Accept {note.Role}
                  </button>

                  <button
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm('Are you sure you want to decline this invitation?')) return;
                      try {
                        await declinePanelInvite(note.PanelId, user.cnic);
                        const data = await getNotifications(user.cnic);
                        setNotifications(data);
                        alert('Invitation declined');
                      } catch (err) {
                        console.error('Failed to decline invite', err);
                        alert('Failed to decline invitation');
                      }
                    }}
                  >
                    Decline {note.Role}
                  </button>
                </div>
              )}
              <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#999' }}>
                {new Date(note.CreatedDate).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {notificationDetails && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(248,250,252,0.98)', zIndex: 3000,
          display: 'flex', justifyContent: 'center', alignItems: 'stretch',
          padding: '0'
        }}>
          <div style={{
            backgroundColor: 'white', padding: '32px', borderRadius: '0',
            width: '100%', maxWidth: 'none', height: '100vh', maxHeight: '100vh', overflowY: 'auto',
            boxShadow: 'none'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Notification Details</h2>
              <button 
                onClick={closeDetailModal} 
                style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#666' }}>✕
              </button>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                Loading details...
              </div>
            )}

            {!loading && notificationDetails && (
              <>
                {/* Main Message Box */}
                <div style={{ backgroundColor: '#f0f8ff', padding: '18px', borderRadius: '10px', marginBottom: '18px', border: '2px solid #0ea5e9' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '500', color: '#0f172a', lineHeight: '1.5' }}>
                    {notificationDetails.message}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    {notificationDetails.createdDate}
                  </p>
                </div>

                {/* Source Information */}
                {notificationDetails.source && (
                  <div style={{ backgroundColor: '#fffbeb', padding: '14px', borderRadius: '8px', marginBottom: '18px', border: '1px solid #fcd34d' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#78350f' }}>
                      <strong>From:</strong> {notificationDetails.source}
                    </p>
                  </div>
                )}

                {/* Context Information - Complaint */}
                {notificationDetails.context && notificationDetails.context.type === 'Complaint' && (
                  <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #86efac' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#15803d', fontSize: '14px', fontWeight: '600' }}>
                      Complaint Details
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                      <div>
                        <p style={{ margin: '0 0 4px 0', color: '#666', fontWeight: '500' }}>ID:</p>
                        <p style={{ margin: 0, color: '#0f172a', fontWeight: 'bold' }}>#{notificationDetails.context.id}</p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', color: '#666', fontWeight: '500' }}>Status:</p>
                        <p style={{ margin: 0, color: '#16a34a', fontWeight: 'bold' }}>{notificationDetails.context.status}</p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', color: '#666', fontWeight: '500' }}>Category:</p>
                        <p style={{ margin: 0, color: '#0f172a' }}>{notificationDetails.context.category}</p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', color: '#666', fontWeight: '500' }}>NHC:</p>
                        <p style={{ margin: 0, color: '#0f172a', fontWeight: '500' }}>{notificationDetails.context.nhc}</p>
                      </div>
                    </div>
                    
                    <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #d1fae5' }} />
                    
                    <div>
                      <p style={{ margin: '0 0 6px 0', color: '#666', fontWeight: '500', fontSize: '12px' }}>Title:</p>
                      <p style={{ margin: 0, color: '#0f172a', fontWeight: '500', fontSize: '14px' }}>
                        {notificationDetails.context.title}
                      </p>
                    </div>

                    {notificationDetails.context.description && (
                      <>
                        <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #d1fae5' }} />
                        <div>
                          <p style={{ margin: '0 0 6px 0', color: '#666', fontWeight: '500', fontSize: '12px' }}>Description:</p>
                          <p style={{ margin: 0, color: '#374151', fontSize: '13px', lineHeight: '1.4' }}>
                            {notificationDetails.context.description}
                          </p>
                        </div>
                      </>
                    )}

                    <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #d1fae5' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                      <div>
                        <p style={{ margin: '0 0 4px 0', color: '#666', fontWeight: '500' }}>Complainant:</p>
                        <p style={{ margin: 0, color: '#0f172a', fontWeight: '500' }}>{notificationDetails.context.complainant}</p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', color: '#666', fontWeight: '500' }}>Filed:</p>
                        <p style={{ margin: 0, color: '#0f172a' }}>{notificationDetails.context.createdDate}</p>
                      </div>
                    </div>

                    {notificationDetails.context.location && (
                      <>
                        <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #d1fae5' }} />
                        <div>
                          <p style={{ margin: '0 0 4px 0', color: '#666', fontWeight: '500', fontSize: '12px' }}>Location:</p>
                          <p style={{ margin: 0, color: '#0f172a', fontSize: '13px' }}>{notificationDetails.context.location}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Context Information - Panel Invitation */}
                {notificationDetails.context && notificationDetails.context.type === 'Panel Invitation' && (
                  <div style={{ backgroundColor: '#f5f3ff', padding: '16px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #e9d5ff' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#6d28d9', fontSize: '14px', fontWeight: '600' }}>
                      Panel Invitation Details
                    </h4>
                    <div style={{ fontSize: '13px' }}>
                      <p style={{ margin: '8px 0', color: '#0f172a' }}>
                        <strong>Role:</strong> {notificationDetails.context.role}
                      </p>
                      <p style={{ margin: '8px 0', color: '#0f172a' }}>
                        <strong>Panel ID:</strong> {notificationDetails.context.panelId}
                      </p>
                    </div>
                  </div>
                )}

                {/* Context Information - Election */}
                {notificationDetails.context && notificationDetails.context.type === 'Election' && (
                  <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #fecaca' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#991b1b', fontSize: '14px', fontWeight: '600' }}>
                      Election Details
                    </h4>
                    <div style={{ fontSize: '13px', color: '#0f172a' }}>
                      <p style={{ margin: '8px 0' }}>
                        <strong>Election ID:</strong> {notificationDetails.context.id}
                      </p>
                      <p style={{ margin: '8px 0', color: '#666' }}>{notificationDetails.context.note}</p>
                    </div>
                  </div>
                )}

                {/* Context Information - Meeting */}
                {notificationDetails.context && notificationDetails.context.type === 'Committee Meeting' && (
                  <div style={{ backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #bae6fd' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#0c4a6e', fontSize: '14px', fontWeight: '600' }}>
                      Meeting Details
                    </h4>
                    <div style={{ fontSize: '13px', color: '#0f172a' }}>
                      <p style={{ margin: '8px 0' }}>
                        <strong>Meeting ID:</strong> {notificationDetails.context.id}
                      </p>
                      <p style={{ margin: '8px 0', color: '#666' }}>{notificationDetails.context.note}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <button 
                    onClick={closeDetailModal}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationList;