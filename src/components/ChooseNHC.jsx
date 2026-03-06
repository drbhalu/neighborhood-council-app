import React, { useState } from 'react';
import './AdminDashboard.css';

const ChooseNHC = ({ user, onSelect, onCancel }) => {
  const options = user.nhcOptions || [];
  const [selectedNHC, setSelectedNHC] = useState("");

  const handleSubmit = () => {
    if (selectedNHC) {
      onSelect(selectedNHC);
    } else {
      alert("Please select an NHC");
    }
  };

  return (
    <div
      className="admin-dashboard-container"
      style={{ textAlign: "center", padding: "40px 20px" }}
    >
      <h2 style={{ fontSize: "24px", marginBottom: "30px" }}>Select NHC</h2>

      {options.length === 0 && (
        <p>No council information available for your account.</p>
      )}

      {options.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
          
          <select
            value={selectedNHC}
            onChange={(e) => setSelectedNHC(e.target.value)}
            style={{
              padding: "10px",
              minWidth: "220px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "16px"
            }}
          >
            <option value="">-- Select NHC --</option>
            {options.map((code, idx) => (
              <option key={idx} value={code}>
                {code}
              </option>
            ))}
          </select>

          <button className="menu-btn" onClick={handleSubmit}>
            Continue
          </button>
        </div>
      )}

      <div style={{ marginTop: "40px" }}>
        <button className="logout-btn" onClick={onCancel}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default ChooseNHC;