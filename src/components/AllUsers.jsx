import React, { useEffect, useState } from 'react';
import { getAllUsers } from '../api';
import './AdminDashboard.css';
import logo from '../assets/logo.png';

const AllUsers = ({ onBack, onEditUser }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [deletingId, setDeleteId] = useState(null);
  const [searchCnic, setSearchCnic] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await getAllUsers();
        setUsers(data);
        setFilteredUsers(data);
      } catch (error) {
        console.error("Failed to load users", error);
        alert("Error loading users");
      }
    };
    loadUsers();
  }, []);

  const handleSearch = (cnic) => {
    setSearchCnic(cnic);
    if (cnic.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(u => u.CNIC && u.CNIC.includes(cnic));
      setFilteredUsers(filtered);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    setDeleteId(id);
    try {
      setUsers(users.filter(u => u.Id !== id));
      setFilteredUsers(filteredUsers.filter(u => u.Id !== id));
      alert("User deleted (Visual only - DB logic pending)");
    } catch (error) {
      alert("Error deleting user");
    } finally {
      setDeleteId(null);
    }
  };

  const handleEditClick = (user) => {
    onEditUser(user);
  };

  return (
    <div className="admin-dashboard-containerR">
      <div className="dashboard-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={logo} alt="Logo" style={{ height: '100px', width: 'auto' }} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '225px', flex: 1 }}>
          <button className="back-btn" onClick={onBack}>← Back</button>
          <h2 style={{ margin: 0 }}>ALL USERS DATA</h2>
        </div>

        <div></div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* SEARCH BAR */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by CNIC..."
            value={searchCnic}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {filteredUsers.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No users found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Name</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>CNIC</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Email</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Role</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>NHC Code</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.Id}>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                      {u.FirstName} {u.LastName}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                      {u.CNIC}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                      {u.Email || "N/A"}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        backgroundColor: u.Role === 'Admin' ? '#dbeafe' : '#dcfce7', 
                        color: u.Role === 'Admin' ? '#1e40af' : '#166534', 
                        fontSize: '12px', fontWeight: 'bold' 
                      }}>
                        {u.Role}
                      </span>
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                      {u.nhcCodes && u.nhcCodes.length ? u.nhcCodes.join(', ') : u.NHC_Code || "N/A"}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => handleEditClick(u)}
                          style={{
                            background: '#2563eb', color: 'white', border: 'none', 
                            padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(u.Id)}
                          style={{
                            background: '#ef4444', color: 'white', border: 'none', 
                            padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                          }}
                          disabled={deletingId === u.Id}
                        >
                          {deletingId === u.Id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllUsers;