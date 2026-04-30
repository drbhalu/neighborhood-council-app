import React, { useState, useEffect } from 'react';
import { assignComplaintToPanel, getComplaintsByNHC, getPanels } from '../api';
import AllSuggestions from './AllSuggestions'; // NEW: Import AllSuggestions
import PresidentBudgetRequests from './PresidentBudgetRequests'; // NEW: Import PresidentBudgetRequests
import CreateCommitteeScreen from './CreateCommitteeScreen';
import CommitteeMeetingScreen from './CommitteeMeetingScreen';
import logo from '../assets/logo.png';

const PresidentDashboard = ({ user, onClose }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null); // null = overview, 'total', 'open', 'in-progress', 'resolved'
  const [showSuggestions, setShowSuggestions] = useState(false); // NEW: State for showing suggestions
  const [showBudgetApproval, setShowBudgetApproval] = useState(false); // NEW: State for showing budget approval
  const [panels, setPanels] = useState([]);
  const [showCreateCommittee, setShowCreateCommittee] = useState(false);
  const [selectedComplaintForAssignment, setSelectedComplaintForAssignment] = useState(null);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const [selectedComplaintForReview, setSelectedComplaintForReview] = useState(null);
  const [assignmentMode, setAssignmentMode] = useState(null); // null, 'new', 'existing'

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
    if (normalized === 'pending-president-review') return '#f59e0b';
    if (normalized === 'pending') return '#ef4444';
    return '#6b7280';
  };

  const getStatusLabel = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'in-progress') return 'In-Progress';
    if (normalized === 'resolved') return 'Resolved';
    if (normalized === 'pending-president-review') return 'Pending Review';
    if (normalized === 'pending') return 'Pending';
    return status || 'Pending';
  };

  const refreshDashboardData = async () => {
    try {
      setLoading(true);
      const [complaintsData, panelsData] = await Promise.all([
        getComplaintsByNHC(user.nhcCode),
        getPanels(user.nhcId ? { nhcId: user.nhcId, committeeOnly: true } : { cnic: user.cnic, committeeOnly: true }),
      ]);
      // Deduplicate complaints by ID to prevent showing the same complaint multiple times
      const uniqueComplaints = (complaintsData || []).reduce((acc, complaint) => {
        if (!acc.some(c => c.Id === complaint.Id)) {
          acc.push(complaint);
        }
        return acc;
      }, []);
      setComplaints(uniqueComplaints);
      setPanels(panelsData || []);
      setError('');
    } catch (err) {
      console.error('Error fetching complaints/panels:', err);
      setError(err.message);
      setComplaints([]);
      setPanels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboardData();
  }, [user.nhcCode, user.nhcId, user.cnic]);

  const assignedComplaintIds = new Set(
    (panels || [])
      .map((p) => p.ComplaintId)
      .filter((id) => id !== null && typeof id !== 'undefined')
      .map((id) => Number(id))
  );

  const isComplaintAssigned = (complaintId) => assignedComplaintIds.has(Number(complaintId));

  const uniqueActiveCommittees = Object.values(
    (panels || []).reduce((acc, panel) => {
      const isCommittee = [1, '1', true, 'true'].includes(panel.IsCommittee);
      if (!isCommittee) return acc;
      if (!acc[panel.Id]) {
        acc[panel.Id] = panel;
      }
      return acc;
    }, {})
  );

  // Calculate statistics
  // const totalComplaints = complaints.length;
  // const pendingComplaints = complaints.filter(c => normalizeStatus(c.Status) === 'pending').length;
  // const inProgressComplaints = complaints.filter(c => normalizeStatus(c.Status) === 'in-progress').length;
  // const resolvedComplaints = complaints.filter(c => normalizeStatus(c.Status) === 'resolved').length;
  // const finalResolutionRequests = complaints.filter((c) => {
  //   const status = normalizeStatus(c.Status);
  //   return ['in-progress', 'pending-president-review'].includes(status) && (c.MeetingDecision || c.MeetingMinutesPath || c.CommitteeRemarks);
  // }).length;

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
      case 'final-review':
        return complaints.filter((c) => {
          const status = normalizeStatus(c.Status);
          const approvalStatus = String(c.PresidentApprovalStatus || '').toLowerCase();
          const isBudgetRequest = ['1', 'true'].includes(String(c.HasBudget || '').toLowerCase());
          return !isBudgetRequest &&
                 ['in-progress', 'pending-president-review'].includes(status) && 
                 (c.MeetingDecision || c.MeetingMinutesPath || c.CommitteeRemarks) &&
                 approvalStatus !== 'approved';
        });
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
      case 'final-review':
        return 'Final Resolution Requests';
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
                    } catch {
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

            {String(user?.role || '').toLowerCase() === 'president' && (
              <div style={{ marginTop: '12px' }}>
                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#374151'
                }}>
                  Committee Remarks:
                </p>
                <div style={{
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#1f2937',
                  lineHeight: '1.5',
                  fontSize: '14px'
                }}>
                  {complaint.CommitteeRemarks || 'No remarks yet'}
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: isComplaintAssigned(complaint.Id) ? '#166534' : '#92400e',
                  backgroundColor: isComplaintAssigned(complaint.Id) ? '#dcfce7' : '#fef3c7',
                  border: `1px solid ${isComplaintAssigned(complaint.Id) ? '#86efac' : '#fcd34d'}`,
                  borderRadius: '999px',
                  padding: '4px 10px'
                }}
              >
                {isComplaintAssigned(complaint.Id) ? 'Assigned to Committee' : 'Not Assigned'}
              </span>

              {selectedCategory === 'final-review' ? (
                <button
                  onClick={() => {
                    setSelectedComplaintForReview(complaint);
                    setShowFinalReview(true);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    backgroundColor: '#f59e0b',
                    color: 'white'
                  }}
                >
                  Review & Finalize
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedComplaintForAssignment(complaint);
                    setShowCreateCommittee(true);
                    setAssignmentMode(null);
                  }}
                  disabled={isComplaintAssigned(complaint.Id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: isComplaintAssigned(complaint.Id) ? 'not-allowed' : 'pointer',
                    backgroundColor: isComplaintAssigned(complaint.Id) ? '#cbd5e1' : '#0f766e',
                    color: 'white',
                    opacity: isComplaintAssigned(complaint.Id) ? 0.8 : 1
                  }}
                >
                  {isComplaintAssigned(complaint.Id) ? 'Already Assigned' : 'Assign to Committee'}
                </button>
              )}
            </div>
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
              <button
                onClick={() => setShowBudgetApproval(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Budget Approval
              </button>
              <button
                onClick={() => handleCardClick('final-review')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Final Resolution
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

        {/* FINAL REVIEW VIEW */}
        {!loading && selectedCategory === 'final-review' && (
          <div>
            {renderComplaintList(getFilteredComplaints(), 'No complaints are waiting for final resolution.')}
          </div>
        )}

        {/* OTHER CATEGORY VIEWS */}
        {!loading && selectedCategory && selectedCategory !== 'final-review' && (
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

      {/* NEW: Show Budget Approval */}
      {showBudgetApproval && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
            padding: '20px',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBudgetApproval(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <PresidentBudgetRequests
                user={user}
                nhcCode={user.nhcCode}
                onBack={() => setShowBudgetApproval(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showCreateCommittee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateCommittee(false);
              setSelectedComplaintForAssignment(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '760px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '20px' }}>
              {!assignmentMode ? (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, color: '#1f2937', fontSize: '22px' }}>Assign Complaint</h3>
                    <button
                      onClick={() => {
                        setShowCreateCommittee(false);
                        setSelectedComplaintForAssignment(null);
                        setAssignmentMode(null);
                      }}
                      style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}
                    >
                      ✕
                    </button>
                  </div>

                  <p style={{ marginTop: 0, color: '#64748b', marginBottom: '16px' }}>
                    Choose whether to create a new committee or assign this complaint to an active committee.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select
                      value={assignmentMode || ''}
                      onChange={(e) => setAssignmentMode(e.target.value || null)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1f2937',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Select assignment type</option>
                      <option value="new">Create New Committee</option>
                      <option value="existing">Assign to Active Committee</option>
                    </select>

                    <button
                      onClick={() => {
                        if (!assignmentMode) {
                          alert('Please choose an assignment type.');
                          return;
                        }
                        setAssignmentMode(assignmentMode);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#0f766e',
                        color: 'white',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : assignmentMode === 'new' ? (
                <CreateCommitteeScreen
                  user={user}
                  initialComplaintId={selectedComplaintForAssignment?.Id || null}
                  onBack={() => setAssignmentMode(null)}
                  onCreated={async () => {
                    await refreshDashboardData();
                    setShowCreateCommittee(false);
                    setSelectedComplaintForAssignment(null);
                    setAssignmentMode(null);
                  }}
                />
              ) : (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <button
                      onClick={() => setAssignmentMode(null)}
                      style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}
                    >
                      ←
                    </button>
                    <h3 style={{ margin: 0, color: '#1f2937', fontSize: '22px' }}>Available Committees</h3>
                    <div style={{ width: '24px' }} />
                  </div>

                  <p style={{ marginTop: 0, color: '#64748b', marginBottom: '16px' }}>
                    Select an available committee to assign complaint #{selectedComplaintForAssignment?.Id}.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {uniqueActiveCommittees.length === 0 ? (
                      <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f8fafc', color: '#475569' }}>
                        No available committees.
                      </div>
                    ) : (
                      uniqueActiveCommittees.map((panel) => (
                        <div key={`assign-panel-${panel.Id}`} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', backgroundColor: '#fff' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                            {panel.PanelName || `Committee #${panel.Id}`}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                            Status: {panel.Status || 'active'}
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await assignComplaintToPanel({
                                  panelId: panel.Id,
                                  complaintId: selectedComplaintForAssignment.Id,
                                  presidentCnic: user.cnic,
                                });
                                await refreshDashboardData();
                                setShowCreateCommittee(false);
                                setSelectedComplaintForAssignment(null);
                                setAssignmentMode(null);
                                alert('Complaint assigned to active committee successfully.');
                              } catch (err) {
                                alert('Failed to assign complaint: ' + err.message);
                              }
                            }}
                            style={{
                              padding: '10px 12px',
                              border: 'none',
                              borderRadius: '8px',
                              backgroundColor: '#0f766e',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Assign Here
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showFinalReview && selectedComplaintForReview && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1200,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFinalReview(false);
              setSelectedComplaintForReview(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '760px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button
                  onClick={() => {
                    setShowFinalReview(false);
                    setSelectedComplaintForReview(null);
                  }}
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}
                >
                  ✕
                </button>
              </div>
              <CommitteeMeetingScreen
                committee={selectedComplaintForReview}
                user={user}
                nhcCode={user.nhcCode}
                allowPresidentReview={true}
                onBack={() => {
                  setShowFinalReview(false);
                  setSelectedComplaintForReview(null);
                }}
                onSaved={async () => {
                  await refreshDashboardData();
                  setShowFinalReview(false);
                  setSelectedComplaintForReview(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresidentDashboard;
