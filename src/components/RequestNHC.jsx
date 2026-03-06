import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const RequestNHC = ({ user, onSubmit, onCancel }) => {
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [reason, setReason] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // initialize with user data if available
  useEffect(() => {
    if (user) {
      if (user.location) setLocation(user.location);
      if (user.address || user.Address) setAddress(user.address || user.Address);
    }
  }, [user]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          setLocation(data.display_name || `${lat}, ${lng}`);
        } catch (e) {
          console.error(e);
          alert('Failed to resolve address from coordinates');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        alert('Unable to retrieve your location.');
        setIsLocating(false);
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a reason');
      return;
    }
    onSubmit(location, address, reason);
  };

  return (
    <div className="admin-dashboard-container" style={{ padding: '40px 20px', maxWidth: '500px', margin: '0 auto' }}>
      <div className="simple-header">
        <button className="back-btn" onClick={onCancel}>
          ← Back
        </button>
        <h2>Request New NHC</h2>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ fontWeight: 'bold' }}>Location</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location or coordinates"
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
            />
            <button type="button" className="map-btn" onClick={handleLocate} disabled={isLocating}>
              {isLocating ? 'Locating…' : '📍'}
            </button>
          </div>
        </div>
        <div>
          <label style={{ fontWeight: 'bold' }}>Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 'bold' }}>Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            placeholder="Why is a new NHC needed?"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="menu-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="submit-btn">
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
};

export default RequestNHC;