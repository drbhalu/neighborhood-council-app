
import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import { getNHCList, getRequests } from '../api';
import SendNotification from './SendNotification'; // Import
import logo from '../assets/logo.png';
import AllUsers from './AllUsers';

const AdminDashboard = ({ user, onLogout, onCreateNHC, onNotify, onViewRequests, onViewAllUsers, onViewElections, onViewComplaints }) => {
  // Dashboard counts keep the admin home screen current without manual refresh.
  const [totalNHC, setTotalNHC] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    // Load the high-level admin counts on mount.
    const fetchCounts = async () => {
      try {
        const nhcList = await getNHCList();
        setTotalNHC(nhcList.length);
        
        const requests = await getRequests();
        const pendingCount = requests.filter(r => (r.Status || r.status) === 'Pending').length;
        setPendingRequests(pendingCount);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };
    fetchCounts();
  }, []);

  return (
    <div className="admin-dashboard-container">
      {/* Header area: brand, title, and live summary cards. */}
      <div className="dashboard-header">
        <div className="dashboard-logo-img">
          <img src={logo} alt="Logo" />
        </div>
        <div className="dashboard-logo">
          <h1>ADMIN NEIGHBOURHOOD COUNCIL</h1>
        </div>
        <div className="dashboard-stats">
          <div className="stat-card">
            <span className="stat-label">Pending Request</span>
            <span className="stat-value">{pendingRequests}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total NHC</span>
            <span className="stat-value">{totalNHC}</span>
          </div>
        </div>
      </div>

      {/* Main navigation for admin tasks. */}
     <div className="dashboard-menu">
  <button className="menu-btn" onClick={onCreateNHC}>CREATE NHC</button>
  
  {/* ADD CLICK HANDLER */}
  <button className="menu-btn" onClick={onNotify}>MEMBER NOTIFY</button>
  <button className="menu-btn" onClick={onViewElections}>ELECTIONS</button>
  <button className="menu-btn" onClick={onViewComplaints}>COMPLAINTS</button>
  <button className="menu-btn" onClick={onViewAllUsers}>ALL USERS</button>
  <button className="menu-btn" onClick={onViewRequests}>REQUEST</button>
   <button onClick={onLogout} className="logout-btn">Logout</button>
</div>

      {/* Logout */}
      <div style={{ marginTop: '30px' }}>
       
      </div>
    </div>
  );
};

export default AdminDashboard;