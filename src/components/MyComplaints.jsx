import React, { useEffect, useState } from 'react';
import { getComplaintsByUser } from '../api';

const getStatusStyle = (status) => {
  const normalized = (status || 'Pending').toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'resolved') return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
  if (normalized === 'in-progress' || normalized === 'inprogress') return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' };
  return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
};

const getStatusLabel = (status) => {
  const normalized = (status || 'Pending').toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'in-progress' || normalized === 'inprogress') return 'In-Progress';
  if (normalized === 'resolved') return 'Resolved';
  return 'Pending';
};

const MyComplaints = ({ user, onClose }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const getComplaintTypeLabel = (type) => {
    return String(type || '').toLowerCase() === 'against' ? 'Against Person' : 'Normal';
  };

  const getComplaintPhotos = (complaint) => {
    let paths = [];
    try {
      paths = complaint?.PhotoPaths ? JSON.parse(complaint.PhotoPaths) : [];
    } catch (_) {
      paths = [];
    }
    if ((!paths || paths.length === 0) && complaint?.PhotoPath) {
      paths = [complaint.PhotoPath];
    }
    return paths;
  };

  const getResolutionPhotos = (complaint) => {
    let paths = [];
    try {
      paths = complaint?.ResolutionPhotoPaths ? JSON.parse(complaint.ResolutionPhotoPaths) : [];
    } catch (_) {
      paths = [];
    }
    return paths;
  };

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        setLoading(true);
        const data = await getComplaintsByUser(user.cnic);
        setComplaints(data || []);
      } catch (err) {
        console.error('Error loading user complaints:', err);
        setError(err.message || 'Failed to load complaints');
      } finally {
        setLoading(false);
      }
    };

    loadComplaints();
  }, [user.cnic]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '28px 24px',
        width: '100%',
        maxWidth: '760px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '18px'
        }}>
          <h2 style={{ margin: 0, color: '#1f2937', fontSize: '26px' }}>My Complaints</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '26px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ marginTop: 0, color: '#64748b', marginBottom: '18px' }}>
          Track all complaints you have filed and their latest status.
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '12px'
          }}>
            {error}
          </div>
        )}

        {loading && <p style={{ color: '#475569' }}>Loading your complaints...</p>}

        {!loading && complaints.length === 0 && (
          <div style={{
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            color: '#475569'
          }}>
            You have not filed any complaints yet.
          </div>
        )}

        {!loading && !selectedComplaint && complaints.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {complaints.map((complaint) => {
              const statusStyle = getStatusStyle(complaint.Status);
              return (
                <div
                  key={complaint.Id}
                  onClick={() => setSelectedComplaint(complaint)}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', color: '#0f172a', fontSize: '18px' }}>{complaint.Category || 'Complaint'}</h3>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                        Complaint ID: {complaint.Id} | Filed: {new Date(complaint.CreatedDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span style={{
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.text,
                      border: `1px solid ${statusStyle.border}`,
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}>
                      {getStatusLabel(complaint.Status)}
                    </span>
                  </div>

                  <p style={{ margin: '10px 0 0 0', color: '#334155', lineHeight: '1.45' }}>
                    {complaint.Description}
                  </p>

                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#475569' }}>
                    <strong>Type:</strong> {complaint.ComplaintType === 'against' ? 'Against Member' : 'Normal'}
                  </div>

                  {complaint.ComplaintType === 'against' && complaint.AgainstMemberCNIC && (
                    <div style={{ marginTop: '6px', fontSize: '13px', color: '#475569' }}>
                      <strong>Against:</strong> {(complaint.AgainstMemberName || 'N/A')} (CNIC: {complaint.AgainstMemberCNIC})
                    </div>
                  )}

                  {(complaint.PhotoPaths || complaint.PhotoPath) && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}><strong>Photos:</strong></div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                        {(() => {
                          let paths = [];
                          try {
                            paths = complaint.PhotoPaths ? JSON.parse(complaint.PhotoPaths) : [];
                          } catch (_) {
                            paths = [];
                          }
                          if ((!paths || paths.length === 0) && complaint.PhotoPath) {
                            paths = [complaint.PhotoPath];
                          }
                          return (paths || []).map((pathItem, idx) => (
                            <img
                              key={`${complaint.Id}-my-photo-${idx}`}
                              src={`http://localhost:3001${pathItem}`}
                              alt={`Complaint ${complaint.Id} photo ${idx + 1}`}
                              style={{
                                width: '100%',
                                maxHeight: '110px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1'
                              }}
                            />
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && selectedComplaint && (
          <div style={{
            backgroundColor: '#f6f3fa',
            border: '1px solid #e9e3f2',
            borderRadius: '24px',
            padding: '22px'
          }}>
            <button
              onClick={() => setSelectedComplaint(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#1f2937',
                fontSize: '28px',
                lineHeight: 1,
                cursor: 'pointer',
                marginBottom: '8px'
              }}
              title="Back"
            >
              ←
            </button>

            <h3 style={{ margin: '0 0 14px 0', color: '#111827', fontSize: '42px', fontWeight: 'bold' }}>
              {selectedComplaint.Category || 'Complaint Detail'}
            </h3>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '26px', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                borderRadius: '999px',
                padding: '6px 14px',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {getComplaintTypeLabel(selectedComplaint.ComplaintType)}
              </span>
              <span style={{
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                borderRadius: '999px',
                padding: '6px 14px',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {getStatusLabel(selectedComplaint.Status)}
              </span>
            </div>

            <h4 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#111827' }}>Basic Information</h4>
            <p style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '16px' }}>
              <strong>Complaint Detail:</strong> {selectedComplaint.Description}
            </p>
            <p style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '16px' }}>
              <strong>Created Date:</strong> {new Date(selectedComplaint.CreatedDate).toLocaleDateString()}
            </p>
            <p style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '16px' }}>
              <strong>Updated Date:</strong> {new Date(selectedComplaint.UpdatedDate || selectedComplaint.CreatedDate).toLocaleDateString()}
            </p>
            <p style={{ margin: '0 0 18px 0', color: '#1f2937', fontSize: '16px' }}>
              <strong>Committee:</strong> {selectedComplaint.CommitteeName || 'Not assigned yet'}
            </p>

            {String(selectedComplaint.ComplaintType || '').toLowerCase() === 'against' && (
              <>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#111827' }}>Against Person Information</h4>
                <p style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '16px' }}>
                  <strong>Name:</strong> {selectedComplaint.AgainstMemberName || 'N/A'}
                </p>
                <p style={{ margin: '0 0 18px 0', color: '#1f2937', fontSize: '16px' }}>
                  <strong>CNIC:</strong> {selectedComplaint.AgainstMemberCNIC || 'N/A'}
                </p>
              </>
            )}

            {getComplaintPhotos(selectedComplaint).length > 0 && (
              <>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#111827' }}>Uploaded Complaint Images</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                  {getComplaintPhotos(selectedComplaint).map((photoPath, idx) => (
                    <img
                      key={`${selectedComplaint.Id}-detail-photo-${idx}`}
                      src={`http://localhost:3001${photoPath}`}
                      alt={`Complaint photo ${idx + 1}`}
                      style={{
                        width: '100%',
                        maxHeight: '180px',
                        objectFit: 'cover',
                        borderRadius: '14px',
                        border: '1px solid #d1d5db'
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            <h4 style={{ margin: '20px 0 10px 0', fontSize: '22px', color: '#111827' }}>Resolution Images</h4>
            {getResolutionPhotos(selectedComplaint).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                {getResolutionPhotos(selectedComplaint).map((photoPath, idx) => (
                  <img
                    key={`${selectedComplaint.Id}-resolution-photo-${idx}`}
                    src={`http://localhost:3001${photoPath}`}
                    alt={`Resolution photo ${idx + 1}`}
                    style={{
                      width: '100%',
                      maxHeight: '180px',
                      objectFit: 'cover',
                      borderRadius: '14px',
                      border: '1px solid #d1d5db'
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                padding: '18px',
                textAlign: 'center',
                color: '#374151',
                marginBottom: '10px'
              }}>
                No images
              </div>
            )}

            <h4 style={{ margin: '20px 0 10px 0', fontSize: '22px', color: '#111827' }}>Remarks</h4>
            <div style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              padding: '14px',
              color: '#1f2937',
              lineHeight: '1.5'
            }}>
              {selectedComplaint.CommitteeRemarks || 'No remarks yet'}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '10px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: '#2563eb',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default MyComplaints;
