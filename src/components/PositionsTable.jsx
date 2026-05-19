import React, { useEffect, useState } from 'react';
import { getPositions } from '../api';
import './AdminDashboard.css';

const PositionsTable = () => {
  // Simple lookup table for configured positions.
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPositions = async () => {
    // Load the current position catalog from the backend.
    setLoading(true);
    try {
      const data = await getPositions();
      setPositions(data);
    } catch (err) {
      setError(err.message || 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  return (
    <div className="positions-container">
      {/* Positions list and loading/error states. */}
      <h3>Positions</h3>
      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}
      <table className="positions-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p, idx) => (
            <tr key={p.Id || p.id}>
              <td>{idx + 1}</td>
              <td>{p.Name || p.name}</td>
              <td>{p.CreatedDate ? new Date(p.CreatedDate).toLocaleString() : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PositionsTable;
