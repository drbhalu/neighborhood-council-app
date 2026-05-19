import React, { useEffect, useState } from 'react';
import './AdminDashboard.css';
import { getRequests, assignRequest } from '../api'; // <--- ADD THIS

const AllRequests = ({ onBack }) => {
  // Admin request inbox.
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    // Fetch the latest requests when the screen opens.
    const loadRequests = async () => {
      try {
        const data = await getRequests();
        
        setRequests(data);
      } catch (error) {
        console.error("Failed to load requests", error);
      }
    };
    loadRequests();
  }, []);

  return (
    <div className="admin-dashboard-container">
      {/* Screen header with a back action and title. */}
      <div className="simple-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>ALL REQUESTS</h2>
      </div>

      {/* Requests table or empty state. */}
      <div style={{ padding: '20px' }}>
        {requests.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No requests found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', minWidth: '700px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>User</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Type</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Message</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Location</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  let locationDisplay = 'N/A';
                  if (req.Location) {
                    locationDisplay = req.Location;
                  }
                  return (
                    <tr key={req.Id}>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                        {req.FirstName} {req.LastName}<br/>
                        <small style={{ color: '#666' }}>{req.CNIC}</small>                        
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{req.RequestType}</td>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{req.Message}</td>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                        📍 {locationDisplay}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#f59e0b' }}>
                        {req.Status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllRequests;