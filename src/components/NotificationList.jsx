import React, { useState, useEffect } from 'react';
import { getNotifications, acceptPanelInvite, declinePanelInvite } from '../api';

const NotificationList = ({ user, onClose }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getNotifications(user.cnic);
        setNotifications(data);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    if(user && user.cnic) fetchNotifications();
  }, [user]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{ 
          backgroundColor: 'white', padding: '20px', borderRadius: '8px', 
          width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' 
        }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3>Notifications</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {notifications.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888' }}>No new notifications.</p>
        ) : (
          notifications.map((note) => (
            <div key={note.Id} style={{ 
                borderBottom: '1px solid #eee', padding: '10px 0'
              }}>
              <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold' }}>Message:</p>
              <p style={{ margin: '5px 0 0 0' }}>{note.Message}</p>
              {note.PanelId && note.Role && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    onClick={async () => {
                      try {
                        await acceptPanelInvite(note.PanelId, user.cnic);
                        // refresh list
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
                      cursor: 'pointer'
                    }}
                    onClick={async () => {
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
    </div>
  );
};

export default NotificationList;