import React, { useEffect, useState } from 'react';
import { getRequests, assignRequest } from '../api';

const RequestsList = ({ onBack, nhcList }) => {
  // Admin request queue with assignment and removal actions.
  const [requests, setRequests] = useState([]);
  const [assigningId, setAssigningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedNHC, setSelectedNHC] = useState({});

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await getRequests();
        setRequests(data);
      } catch (err) {
        console.error('Failed to fetch requests', err);
      }
    };
    fetchRequests();
  }, []);

  const refresh = async () => {
    // Reload the list after an admin action.
    try { const d = await getRequests(); setRequests(d); } catch (e) { console.error(e); }
  };

  const handleAssign = async (reqId) => {
    // Assign the request to the selected NHC.
    const nhc = selectedNHC[reqId] || (nhcList && nhcList[0] && nhcList[0].name);
    if (!nhc) return alert('Select an NHC to assign');
    setAssigningId(reqId);
    try {
      await assignRequest(reqId, nhc);
      alert('Assigned successfully');
      await refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to assign');
    } finally { setAssigningId(null); }
  };

  const handleDelete = async (reqId) => {
    // Remove the request from the admin inbox without deleting the record.
    if (!window.confirm('Remove this request from admin view? It will remain in the database.')) return;
    setDeletingId(reqId);
    try {
      setRequests((prev) => prev.filter((x) => (x.Id || x.id) !== reqId));
      alert('Removed from admin view');
    } catch (err) {
      console.error(err);
      alert('Failed to remove request from view');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Header and back action for the request inbox. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Requests</h2>
        <button onClick={onBack} className="menu-btn">Back</button>
      </div>

      {/* Request cards and assignment controls. */}
      {requests.length === 0 ? (
        <p>No requests found.</p>
      ) : (
        requests.map((r) => {
          let locationDisplay = 'N/A';
          if (r.Location) {
            locationDisplay = r.Location;
          }
          return (
            <div key={r.Id || r.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 6, marginBottom: 10 }}>
              <div style={{ fontWeight: 'bold' }}>{r.FirstName || r.firstName} {r.LastName || r.lastName} ({r.CNIC || r.cnic})</div>
              <div style={{ marginTop: 6 }}>{r.RequestType || r.requestType}</div>
              <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{r.Message || r.message}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#0ea5e9', fontWeight: 'bold' }}>📍 Location: {locationDisplay}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{new Date(r.CreatedDate || r.createdDate).toLocaleString()}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                {(r.Status || r.status) === 'Pending' && (
                  <>
                    <select value={selectedNHC[r.Id || r.id] || ''} onChange={(e) => setSelectedNHC({ ...selectedNHC, [r.Id || r.id]: e.target.value })}>
                      <option value="">Select NHC</option>
                      {nhcList && nhcList.map((n) => <option key={n.id || n.name} value={n.name}>{n.name}</option>)}
                    </select>
                    <button className="menu-btn" onClick={() => handleAssign(r.Id || r.id)} disabled={assigningId === (r.Id || r.id) || deletingId === (r.Id || r.id)}>
                      {assigningId === (r.Id || r.id) ? 'Assigning...' : 'Assign'}
                    </button>
                    <button className="menu-btn" onClick={() => handleDelete(r.Id || r.id)} disabled={deletingId === (r.Id || r.id) || assigningId === (r.Id || r.id)}>
                      {deletingId === (r.Id || r.id) ? 'Deleting...' : 'Delete'}
                    </button>
                  </>
                )}
                <div style={{ marginLeft: 'auto', fontSize: 12, color: '#444' }}>{r.Status || r.status}</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default RequestsList;
