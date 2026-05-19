import React, { useEffect, useState } from 'react';
import { deleteUserById, getAllUsers, getNHCList } from '../api';
import './AdminDashboard.css';
import logo from '../assets/logo.png';

const AllUsers = ({ onBack, onEditUser }) => {
  // Admin user directory with search and row actions.
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [deletingId, setDeleteId] = useState(null);
  const [searchCnic, setSearchCnic] = useState('');
  const [nhcList, setNhcList] = useState([]);
  const [selectedNhcCode, setSelectedNhcCode] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const usersData = await getAllUsers();
        setUsers(usersData);
        setFilteredUsers(usersData);
        
        const nhcsData = await getNHCList();
        setNhcList(nhcsData || []);
      } catch (error) {
        console.error("Failed to load data", error);
        alert("Error loading data");
      }
    };
    loadData();
  }, []);

  const applyFilters = (usersToFilter, cnic, nhcCode) => {
    let result = usersToFilter;
    
    // Filter by CNIC
    if (cnic.trim() !== '') {
      result = result.filter(u => u.CNIC && u.CNIC.includes(cnic));
    }
    
    // Filter by NHC
    if (nhcCode.trim() !== '') {
      result = result.filter(u => {
        const userNhcCodes = (u.nhcCodes && Array.isArray(u.nhcCodes) ? u.nhcCodes : [])
          .concat(u.NHC_Code ? u.NHC_Code.split(',').map(code => code.trim()) : [])
          .filter(Boolean);
        return userNhcCodes.includes(nhcCode);
      });
    }
    
    return result;
  };

  const handleSearch = (cnic) => {
    setSearchCnic(cnic);
    setFilteredUsers(applyFilters(users, cnic, selectedNhcCode));
  };

  const handleNhcChange = (nhcCode) => {
    setSelectedNhcCode(nhcCode);
    setFilteredUsers(applyFilters(users, searchCnic, nhcCode));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    setDeleteId(id);
    try {
      await deleteUserById(id);
      setUsers(users.filter(u => u.Id !== id));
      setFilteredUsers(filteredUsers.filter(u => u.Id !== id));
      alert("User deleted successfully.");
    } catch (error) {
      alert("Error deleting user: " + (error.message || 'Unknown error'));
    } finally {
      setDeleteId(null);
    }
  };

  const handleEditClick = (user) => {
    onEditUser(user);
  };

  return (
    <div className="admin-dashboard-containerR">
      {/* Admin header, search bar, and the user table. */}
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
        {/* SEARCH BAR AND NHC DROPDOWN */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>Search by CNIC:</label>
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
          
          <div style={{ minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>Filter by NHC:</label>
            <select
              value={selectedNhcCode}
              onChange={(e) => handleNhcChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">All NHCs</option>
              {nhcList.map((nhc) => (
                <option key={nhc.id} value={nhc.name}>
                  {nhc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No users found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Profile</th>
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
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', width: '56px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' }}>
                        {(() => {
                          const imgSrc = u.profileImage || u.ProfileImage || u.ProfileImagePath || null;
                          return imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={`${u.FirstName} ${u.LastName}`}
                              onError={(e) => { e.target.style.display = 'none'; }}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : null;
                        })()}
                      </div>
                    </td>
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
                        {((u.nhcCodes && Array.isArray(u.nhcCodes) ? u.nhcCodes : [])
                          .concat(u.NHC_Code ? u.NHC_Code.split(',').map(code => code.trim()) : [])
                          .filter(Boolean)
                          .join(', ')) || "N/A"}
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