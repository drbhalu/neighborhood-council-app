import React, { useState, useEffect } from 'react';
import { getComplaintsByNHC } from '../api';
import AllSuggestions from './AllSuggestions'; // NEW: Import AllSuggestions
import logo from '../assets/logo.png';

const PresidentDashboard = ({ user, onClose }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null); // null = overview, 'total', 'open', 'in-progress', 'resolved'
  const [showSuggestions, setShowSuggestions] = useState(false); // NEW: State for showing suggestions

  const normalizeStatus = (status) => {
    const normalized = (status || 'Pending').toLowerCase().replace(/\s+/g, '-');
    if (normalized === 'open') return 'pending';
    if (normalized === 'inprogress') return 'in-progress';
    return normalized;
  };

  const getStatusStyle = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'resolved') return '#10b981';
    if (normalized === 'in-progress') return '#f59e0b';
    if (normalized === 'pending') return '#ef4444';
    return '#6b7280';
  };

  const getStatusLabel = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'in-progress') return 'In-Progress';
    if (normalized === 'resolved') return 'Resolved';
    if (normalized === 'pending') return 'Pending';
    return status || 'Pending';
  };

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true);
        const data = await getComplaintsByNHC(user.nhcCode);
        setComplaints(data || []);
      } catch (err) {
        console.error('Error fetching complaints:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, [user.nhcCode]);

  // Calculate statistics
  const totalComplaints = complaints.length;
  const pendingComplaints = complaints.filter(c => normalizeStatus(c.Status) === 'pending').length;
  const inProgressComplaints = complaints.filter(c => normalizeStatus(c.Status) === 'in-progress').length;
  const resolvedComplaints = complaints.filter(c => normalizeStatus(c.Status) === 'resolved').length;

  // Filter complaints based on selected category
  const getFilteredComplaints = () => {
    switch (selectedCategory) {
      case 'total':
        return complaints;
      case 'pending':
        return complaints.filter(c => normalizeStatus(c.Status) === 'pending');
      case 'in-progress':
        return complaints.filter(c => normalizeStatus(c.Status) === 'in-progress');
      case 'resolved':
        return complaints.filter(c => normalizeStatus(c.Status) === 'resolved');
      default:
        return [];
    }
  };

  // Get category title
  const getCategoryTitle = () => {
    switch (selectedCategory) {
      case 'total':
        return 'All Complaints';
      case 'pending':
        return 'Pending Complaints';
      case 'in-progress':
        return 'In-Progress Complaints';
      case 'resolved':
        return 'Resolved Complaints';
      default:
        return '';
    }
  };

  // Handle card click
  const handleCardClick = (category) => {
    setSelectedCategory(category);
  };

  // Handle back to overview
  const handleBackToOverview = () => {
    setSelectedCategory(null);
  };

  const renderComplaintList = (items, emptyMessage) => {
    if (items.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#666',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {items.map((complaint) => (
          <div
            key={complaint.Id}
            style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <div>
                <h3 style={{
                  margin: '0 0 4px 0',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#1f2937'
                }}>
                  {complaint.Category}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  Submitted by: {complaint.UserName} (CNIC: {complaint.UserCNIC})
                </p>
              </div>
              <div style={{
                backgroundColor: getStatusStyle(complaint.Status),
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {getStatusLabel(complaint.Status)}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#374151'
              }}>
                Description:
              </p>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#4b5563',
                lineHeight: '1.5'
              }}>
                {complaint.Description}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  Complaint Type:
                </span>
                <span style={{
                  marginLeft: '8px',
                  fontSize: '14px',
                  color: '#374151',
                  fontWeight: 'bold'
                }}>
                  {complaint.ComplaintType === 'against' ? 'Against Member' : 'Normal'}
                </span>
              </div>
              <div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  Date Submitted:
                </span>
                <span style={{
                  marginLeft: '8px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  {new Date(complaint.CreatedDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {complaint.ComplaintType === 'against' && complaint.AgainstMemberCNIC && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  Against Member:
                </span>
                <span style={{ marginLeft: '8px', fontSize: '14px', color: '#374151' }}>
                  {(complaint.AgainstMemberName || 'N/A')} (CNIC: {complaint.AgainstMemberCNIC})
                </span>
              </div>
            )}

            {(complaint.PhotoPaths || complaint.PhotoPath) && (
              <div style={{ marginTop: '12px' }}>
                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#374151'
                }}>
                  📸 Photo Attachment(s):
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
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
                        key={`${complaint.Id}-photo-${idx}`}
                        src={`http://localhost:3001${pathItem}`}
                        alt={`Complaint photo ${idx + 1}`}
                        style={{
                          width: '100%',
                          maxHeight: '180px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db'
                        }}
                      />
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

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
        padding: '40px 30px',
        width: '100%',
        maxWidth: selectedCategory ? '900px' : '700px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* HEADER WITH CLOSE BUTTON */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '30px'
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <img src={logo} alt="Logo" style={{ height: '60px', width: 'auto', marginBottom: '15px' }} />
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
              {selectedCategory ? getCategoryTitle() : 'Dashboard'}
            </h1>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
          {!selectedCategory ? (
            <>
              <button
                onClick={() => handleCardClick('total')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Complaints
              </button>
              <button
                onClick={() => setShowSuggestions(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Suggestions
              </button>
            </>
          ) : (
            <button
              onClick={() => handleCardClick('total')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#1d4ed8',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Show All Complaints
            </button>
          )}
        </div>

        {/* BACK BUTTON (only show when viewing details) */}
        {selectedCategory && (
          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={handleBackToOverview}
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Back to Overview
            </button>
          </div>
        )}

        {/* USER INFO */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{
            margin: '0 0 10px 0',
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#1f2937'
          }}>
            Assalam-o-Alikum, {user.role || 'President'} {user.firstName} {user.lastName}
          </h2>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#666',
            fontStyle: 'italic'
          }}>
            {selectedCategory ? 'Here are the complaint details' : 'Here is an overview of citizen reports in your area'}
          </p>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#991b1b',
            fontSize: '14px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <p>Loading complaint statistics...</p>
          </div>
        )}

        {/* STATISTICS CARDS - COMMENTED OUT */}
        {/* {!loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '30px'
          }}>
            TOTAL COMPLAINTS
            <div
              style={{
                backgroundColor: '#0ea5e9',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onClick={() => handleCardClick('total')}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '12px',
                color: 'white',
                fontWeight: '500'
              }}>
                Total
              </p>
              <span style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {totalComplaints}
              </span>
            </div>

            PENDING COMPLAINTS
            <div
              style={{
                backgroundColor: '#0ea5e9',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onClick={() => handleCardClick('pending')}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '12px',
                color: 'white',
                fontWeight: '500'
              }}>
                Pending
              </p>
              <span style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {pendingComplaints}
              </span>
            </div>

            IN-PROGRESS COMPLAINTS
            <div
              style={{
                backgroundColor: '#0ea5e9',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onClick={() => handleCardClick('in-progress')}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '12px',
                color: 'white',
                fontWeight: '500'
              }}>
                In Progress
              </p>
              <span style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {inProgressComplaints}
              </span>
            </div>

            RESOLVED COMPLAINTS
            <div
              style={{
                backgroundColor: '#0ea5e9',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onClick={() => handleCardClick('resolved')}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '12px',
                color: 'white',
                fontWeight: '500'
              }}>
                Resolved
              </p>
              <span style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {resolvedComplaints}
              </span>
            </div>
          </div>
        )} */}

        {/* ALL COMPLAINTS IN DASHBOARD OVERVIEW */}
        {!loading && !selectedCategory && (
          <div>
            <h3 style={{ margin: '0 0 12px 0', color: '#1f2937' }}>All Complaints</h3>
            {renderComplaintList(complaints, 'No complaints found in this NHC.')}
          </div>
        )}

        {/* COMPLAINT DETAILS VIEW */}
        {!loading && selectedCategory && (
          <div>
            {renderComplaintList(getFilteredComplaints(), 'No complaints found in this category.')}
          </div>
        )}

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginTop: '20px'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#3b82f6';
          }}
        >
          Close
        </button>
      </div>

      {/* NEW: Show All Suggestions */}
      {showSuggestions && (
        <AllSuggestions user={user} onClose={() => setShowSuggestions(false)} />
      )}
    </div>
  );
};

export default PresidentDashboard;
