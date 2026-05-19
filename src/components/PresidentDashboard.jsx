import React, { useState, useEffect } from 'react';
import { assignComplaintToPanel, getComplaintsByNHC, getPanels, getCommitteeSettings } from '../api';
import AllSuggestions from './AllSuggestions';
import PresidentBudgetRequests from './PresidentBudgetRequests';
import CreateCommitteeScreen from './CreateCommitteeScreen';
import CommitteeMeetingScreen from './CommitteeMeetingScreen';
import logo from '../assets/logo.png';

const PresidentDashboard = ({ user, onClose }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showBudgetApproval, setShowBudgetApproval] = useState(false);
  const [panels, setPanels] = useState([]);
  const [showCreateCommittee, setShowCreateCommittee] = useState(false);
  const [selectedComplaintForAssignment, setSelectedComplaintForAssignment] = useState(null);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const [selectedComplaintForReview, setSelectedComplaintForReview] = useState(null);
  const [assignmentMode, setAssignmentMode] = useState(null);
  const [enableUrgentWorkflow, setEnableUrgentWorkflow] = useState(true);
  const [urgentBlockAlert, setUrgentBlockAlert] = useState(false);
  const [urgentBlockMessage, setUrgentBlockMessage] = useState('');

  const normalizeStatus = (status) => {
    const normalized = String(status || 'Pending').toLowerCase().trim();
    const cleaned = normalized.replace(/[^a-z]+/g, ' ').trim();
    if (/\b(in[- ]?progress|inprogress)\b/.test(cleaned)) return 'in-progress';
    if (/\b(pending[- ]?(president[- ]?)?review|pendingreview|pending president review)\b/.test(cleaned)) return 'pending-president-review';
    if (/\b(resolved)\b/.test(cleaned)) return 'resolved';
    if (/\b(rejected)\b/.test(cleaned)) return 'rejected';
    if (/\b(pending)\b/.test(cleaned)) return 'pending';
    return normalized.replace(/\s+/g, '-');
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

  const isUrgentComplaint = (complaint) => {
    const value = complaint?.UrgentComplaint;
    return value === 1 || value === true || String(value || '').toLowerCase() === '1' || String(value || '').toLowerCase() === 'true';
  };

  const refreshDashboardData = async () => {
    try {
      setLoading(true);
      const [complaintsData, panelsData, settingsData] = await Promise.all([
        getComplaintsByNHC(user.nhcCode),
        getPanels(user.nhcId ? { nhcId: user.nhcId, committeeOnly: true } : { cnic: user.cnic, committeeOnly: true }),
        getCommitteeSettings(),
      ]);
      const uniqueComplaints = (complaintsData || []).reduce((acc, complaint) => {
        if (!acc.some(c => c.Id === complaint.Id)) acc.push(complaint);
        return acc;
      }, []);
      setComplaints(uniqueComplaints);
      setPanels(panelsData || []);
      setEnableUrgentWorkflow(settingsData?.enableUrgentWorkflow !== false);
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
    (panels || []).map((p) => p.ComplaintId).filter((id) => id !== null && typeof id !== 'undefined').map((id) => Number(id))
  );

  const isComplaintAssigned = (complaintId) => assignedComplaintIds.has(Number(complaintId));

  const uniqueActiveCommittees = Object.values(
    (panels || []).reduce((acc, panel) => {
      if ([1, '1', true, 'true'].includes(panel.IsCommittee)) {
        if (!acc[panel.Id]) acc[panel.Id] = panel;
      }
      return acc;
    }, {})
  );

  // --- URGENT WORKFLOW HELPERS ---
  const getUnassignedUrgentComplaints = () => {
    return complaints.filter((c) => isUrgentComplaint(c) && !isComplaintAssigned(c.Id) && normalizeStatus(c.Status) !== 'resolved');
  };

  const getUrgentInFinalReview = () => {
    return complaints.filter((c) =>
      isUrgentComplaint(c) &&
      normalizeStatus(c.Status) === 'pending-president-review' &&
      String(c.PresidentApprovalStatus || '').toLowerCase() !== 'approved' &&
      !['1', 'true'].includes(String(c.HasBudget || '').toLowerCase())
    );
  };

  const getUrgentBudgetRequests = () => {
    return complaints.filter((c) =>
      isUrgentComplaint(c) &&
      ['1', 'true'].includes(String(c.HasBudget || '').toLowerCase()) &&
      normalizeStatus(c.Status) === 'pending-president-review' &&
      String(c.PresidentApprovalStatus || '').toLowerCase() !== 'approved'
    );
  };

  const getPendingBudgetRequests = () => {
    return complaints.filter((c) =>
      ['1', 'true'].includes(String(c.HasBudget || '').toLowerCase()) &&
      normalizeStatus(c.Status) === 'pending-president-review' &&
      String(c.PresidentApprovalStatus || '').toLowerCase() !== 'approved'
    );
  };

  const isFinalResolutionComplaint = (complaint) => {
    const status = normalizeStatus(complaint.Status);
    const approvalStatus = String(complaint.PresidentApprovalStatus || '').toLowerCase();
    const hasCommitteeRecommendation = Boolean(complaint.MeetingDecision || complaint.MeetingMinutesPath || complaint.CommitteeRemarks);
    const isPendingPresidentReview = status === 'pending-president-review' && approvalStatus !== 'approved';
    const isInProgressNeedsReview = status === 'in-progress' && hasCommitteeRecommendation && approvalStatus !== 'approved';
    return (isPendingPresidentReview || isInProgressNeedsReview);
  };

  const isResolvedComplaint = (complaint) => normalizeStatus(complaint?.Status) === 'resolved';

  // --- CONSTRAINT CHECKS (ONLY ACTIVE IF enableUrgentWorkflow == 1) ---
  const canAssignComplaint = (complaint) => {
    if (isResolvedComplaint(complaint)) return false;
    if (!enableUrgentWorkflow) return true;
    if (isUrgentComplaint(complaint)) return true;
    return getUnassignedUrgentComplaints().length === 0;
  };

  const canFinalizeComplaint = (complaint) => {
    if (!enableUrgentWorkflow) return true;
    if (isUrgentComplaint(complaint)) return true;
    return getUrgentInFinalReview().length === 0;
  };

  const canApproveBudget = (complaint) => {
    if (!enableUrgentWorkflow) return true;
    if (isUrgentComplaint(complaint)) return true;
    return getUrgentBudgetRequests().length === 0;
  };

  // --- HANDLERS ---
  const handleAssignClick = (complaint) => {
    if (!canAssignComplaint(complaint)) {
      setUrgentBlockMessage('❌ You must assign URGENT complaints first to committees before assigning normal complaints!');
      setUrgentBlockAlert(true);
      return;
    }
    setSelectedComplaintForAssignment(complaint);
    setShowCreateCommittee(true);
    setAssignmentMode(null);
  };

  const handleFinalizeClick = (complaint) => {
    if (!canFinalizeComplaint(complaint)) {
      setUrgentBlockMessage(`⚠️ ${getUrgentInFinalReview().length} URGENT complaint(s) in the resolution queue need your attention first!`);
      setUrgentBlockAlert(true);
      return;
    }
    setSelectedComplaintForReview(complaint);
    setShowFinalReview(true);
  };

  // NEW: Handler for Budget Approvals (called by child component)
  const handleBudgetApproveAttempt = (complaint) => {
    if (!canApproveBudget(complaint)) {
      setUrgentBlockMessage(`⚠️ ${getUrgentBudgetRequests().length} URGENT budget request(s) need your attention first! Please approve urgent budgets before normal ones.`);
      setUrgentBlockAlert(true);
      return false; // Tells child component to STOP the approval
    }
    return true; // Tells child component to PROCEED
  };

  const getFilteredComplaints = () => {
    let filtered = [];
    switch (selectedCategory) {
      case 'total': filtered = complaints.filter((c) => !isFinalResolutionComplaint(c)); break;
      case 'pending': filtered = complaints.filter(c => normalizeStatus(c.Status) === 'pending'); break;
      case 'in-progress': filtered = complaints.filter(c => normalizeStatus(c.Status) === 'in-progress'); break;
      case 'resolved': filtered = complaints.filter(c => normalizeStatus(c.Status) === 'resolved'); break;
      case 'final-review':
        filtered = complaints.filter((c) => isFinalResolutionComplaint(c));
        break;
      case 'urgent': filtered = complaints.filter((c) => isUrgentComplaint(c)); break;
      default: return [];
    }
    
    if (enableUrgentWorkflow && selectedCategory !== 'urgent') {
      filtered.sort((a, b) => (isUrgentComplaint(a) ? 0 : 1) - (isUrgentComplaint(b) ? 0 : 1));
    }
    return filtered;
  };

  const getCategoryTitle = () => {
    switch (selectedCategory) {
      case 'total': return 'All Complaints';
      case 'pending': return 'Pending Complaints';
      case 'in-progress': return 'In-Progress Complaints';
      case 'resolved': return 'Resolved Complaints';
      case 'final-review': return 'Final Resolution Requests';
      case 'urgent': return 'Urgent Complaints';
      default: return '';
    }
  };

  const handleCardClick = (category) => setSelectedCategory(category);
  const handleBackToOverview = () => setSelectedCategory(null);

  const renderComplaintList = (items, emptyMessage) => {
    const unassignedUrgentComplaints = getUnassignedUrgentComplaints();
    const urgentInFinalReview = getUrgentInFinalReview();
    const hasNonUrgentInItems = items.some(c => !isUrgentComplaint(c));
    
    const hasUrgentAlert = enableUrgentWorkflow && (
      (selectedCategory === 'final-review' && urgentInFinalReview.length > 0) ||
      (selectedCategory !== 'final-review' && unassignedUrgentComplaints.length > 0 && selectedCategory !== 'urgent')
    );
    
    const pendingBudgetRequests = selectedCategory === 'final-review' ? getPendingBudgetRequests() : [];

    if (items.length === 0) {
      return (
        <div>
          {hasUrgentAlert && (
            <div style={{ backgroundColor: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '16px', fontSize: '15px', fontWeight: 'bold' }}>
              {selectedCategory === 'final-review' 
                ? <>⚠️ <strong>{urgentInFinalReview.length} URGENT complaint(s) in the resolution queue need attention first!</strong></>
                : <>⚠️ <strong>{unassignedUrgentComplaints.length} URGENT complaint(s) need to be assigned first!</strong></>}
            </div>
          )}
          {pendingBudgetRequests.length > 0 && (
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd', color: '#1e3a8a', padding: '16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              <strong>Note:</strong> There are {pendingBudgetRequests.length} budget request(s) currently pending president approval. These appear in the Budget Approval panel instead of the Final Resolution list.
            </div>
          )}
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666', backgroundColor: '#f9fafb', borderRadius: '8px' }}><p>{emptyMessage}</p></div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {hasUrgentAlert && (
          <div style={{ backgroundColor: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '8px', fontSize: '15px', fontWeight: 'bold' }}>
            {selectedCategory === 'final-review' 
              ? <>⚠️ <strong>{urgentInFinalReview.length} URGENT complaint(s) in the resolution queue need attention first!</strong></>
              : <>⚠️ <strong>{unassignedUrgentComplaints.length} URGENT complaint(s) need to be assigned first!</strong></>}
          </div>
        )}
        {items.map((complaint) => (
          <div key={complaint.Id} style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>{complaint.Category}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Submitted by: {complaint.UserName} (CNIC: {complaint.UserCNIC})</p>
                {isUrgentComplaint(complaint) && (
                  <span style={{ display: 'inline-block', marginTop: '6px', backgroundColor: '#dc2626', color: 'white', padding: '4px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 'bold' }}>URGENT</span>
                )}
              </div>
              <div style={{ backgroundColor: getStatusStyle(complaint.Status), color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                {getStatusLabel(complaint.Status)}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>Description:</p>
              <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>{complaint.Description}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Complaint Type:</span>
                <span style={{ marginLeft: '8px', fontSize: '14px', color: '#374151', fontWeight: 'bold' }}>{complaint.ComplaintType === 'against' ? 'Against Member' : 'Normal'}</span>
              </div>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Date Submitted:</span>
                <span style={{ marginLeft: '8px', fontSize: '14px', color: '#374151' }}>{new Date(complaint.CreatedDate).toLocaleDateString()}</span>
              </div>
            </div>
            {complaint.ComplaintType === 'against' && complaint.AgainstMemberCNIC && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Against Member:</span>
                <span style={{ marginLeft: '8px', fontSize: '14px', color: '#374151' }}>{(complaint.AgainstMemberName || 'N/A')} (CNIC: {complaint.AgainstMemberCNIC})</span>
              </div>
            )}
            {(complaint.PhotoPaths || complaint.PhotoPath) && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>📸 Photo Attachment(s):</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  {(() => {
                    let paths = [];
                    try { paths = complaint.PhotoPaths ? JSON.parse(complaint.PhotoPaths) : []; } catch { paths = []; }
                    if ((!paths || paths.length === 0) && complaint.PhotoPath) paths = [complaint.PhotoPath];
                    return (paths || []).map((pathItem, idx) => (
                      <img key={`${complaint.Id}-photo-${idx}`} src={`http://localhost:3001${pathItem}`} alt={`Complaint photo ${idx + 1}`} style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                    ));
                  })()}
                </div>
              </div>
            )}
            {String(user?.role || '').toLowerCase() === 'president' && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>Committee Remarks:</p>
                <div style={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px', color: '#1f2937', lineHeight: '1.5', fontSize: '14px' }}>
                  {complaint.CommitteeRemarks || 'No remarks yet'}
                </div>
              </div>
            )}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: isComplaintAssigned(complaint.Id) ? '#166534' : '#92400e', backgroundColor: isComplaintAssigned(complaint.Id) ? '#dcfce7' : '#fef3c7', border: `1px solid ${isComplaintAssigned(complaint.Id) ? '#86efac' : '#fcd34d'}`, borderRadius: '999px', padding: '4px 10px' }}>
                {isComplaintAssigned(complaint.Id) ? 'Assigned to Committee' : 'Not Assigned'}
              </span>
              {selectedCategory === 'final-review' ? (
                <button onClick={() => handleFinalizeClick(complaint)} disabled={!canFinalizeComplaint(complaint)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: !canFinalizeComplaint(complaint) ? 'not-allowed' : 'pointer', backgroundColor: !canFinalizeComplaint(complaint) ? '#cbd5e1' : '#f59e0b', color: 'white', opacity: !canFinalizeComplaint(complaint) ? 0.6 : 1 }} title={!canFinalizeComplaint(complaint) ? 'Complete urgent complaints in resolution queue first' : ''}>Review & Finalize</button>
              ) : (
                <button onClick={() => handleAssignClick(complaint)} disabled={isComplaintAssigned(complaint.Id) || !canAssignComplaint(complaint)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: (isComplaintAssigned(complaint.Id) || !canAssignComplaint(complaint)) ? 'not-allowed' : 'pointer', backgroundColor: (isComplaintAssigned(complaint.Id) || !canAssignComplaint(complaint)) ? '#cbd5e1' : '#0f766e', color: 'white', opacity: (isComplaintAssigned(complaint.Id) || !canAssignComplaint(complaint)) ? 0.8 : 1 }} title={isResolvedComplaint(complaint) ? 'Cannot assign a resolved complaint' : !canAssignComplaint(complaint) ? 'Assign urgent complaints first' : isComplaintAssigned(complaint.Id) ? 'Already Assigned' : ''}>{isComplaintAssigned(complaint.Id) ? 'Already Assigned' : 'Assign to Committee'}</button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', overflowY: 'auto' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px 30px', width: '100%', maxWidth: selectedCategory ? '900px' : '700px', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <img src={logo} alt="Logo" style={{ height: '60px', width: 'auto', marginBottom: '15px' }} />
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>{selectedCategory ? getCategoryTitle() : 'Dashboard'}</h1>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {!selectedCategory ? (
            <>
              <button onClick={() => handleCardClick('total')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Complaints</button>
              <button onClick={() => setShowSuggestions(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#7c3aed', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Suggestions</button>
              <button onClick={() => handleCardClick('urgent')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Urgent Complaints</button>
              <button onClick={() => setShowBudgetApproval(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Budget Approval</button>
              <button onClick={() => handleCardClick('final-review')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#f59e0b', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Final Resolution</button>
            </>
          ) : (
            <button onClick={() => handleCardClick('total')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#1d4ed8', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Show All Complaints</button>
          )}
        </div>

        {selectedCategory && (
          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={handleBackToOverview} style={{ backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>← Back to Overview</button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', fontWeight: 'bold', color: '#1f2937' }}>Assalam-o-Alikum, {user.role || 'President'} {user.firstName} {user.lastName}</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#666', fontStyle: 'italic' }}>{selectedCategory ? 'Here are the complaint details' : 'Here is an overview of citizen reports in your area'}</p>
        </div>

        {error && <div style={{ backgroundColor: '#fee2e2', border: '2px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#991b1b', fontSize: '14px' }}>⚠️ {error}</div>}
        {loading && <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}><p>Loading complaint statistics...</p></div>}

        {!loading && !selectedCategory && (<div><h3 style={{ margin: '0 0 12px 0', color: '#1f2937' }}>All Complaints</h3>{renderComplaintList(complaints.filter((c) => !isFinalResolutionComplaint(c)), 'No complaints found in this NHC.')}</div>)}
        {!loading && selectedCategory === 'final-review' && (<div>{renderComplaintList(getFilteredComplaints(), 'No complaints are waiting for final resolution.')}</div>)}
        {!loading && selectedCategory && selectedCategory !== 'final-review' && (<div>{renderComplaintList(getFilteredComplaints(), 'No complaints found in this category.')}</div>)}

        <button onClick={onClose} style={{ width: '100%', padding: '12px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease', marginTop: '20px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'} onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}>Close</button>
      </div>

      {showSuggestions && <AllSuggestions user={user} onClose={() => setShowSuggestions(false)} />}

      {showBudgetApproval && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999, padding: '20px', overflowY: 'auto' }} onClick={(e) => { if (e.target === e.currentTarget) setShowBudgetApproval(false); }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <PresidentBudgetRequests
                user={user}
                nhcCode={user.nhcCode}
                onBack={() => setShowBudgetApproval(false)}
                onApproved={refreshDashboardData}
                canApproveBudget={canApproveBudget}
                urgentBudgetCount={getUrgentBudgetRequests().length}
                enableUrgentWorkflow={enableUrgentWorkflow}
                onBeforeApprove={handleBudgetApproveAttempt}
              />
            </div>
          </div>
        </div>
      )}

      {urgentBlockAlert && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '30px', maxWidth: '500px', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)', border: '3px solid #dc2626' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px', color: '#dc2626' }}>⛔ WORKFLOW RESTRICTION</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '20px', lineHeight: '1.6' }}>{urgentBlockMessage}</div>
            <button onClick={() => { setUrgentBlockAlert(false); setUrgentBlockMessage(''); }} style={{ width: '100%', padding: '12px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Understood, Will Do Urgent First</button>
          </div>
        </div>
      )}

      {showCreateCommittee && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }} onClick={(e) => { if (e.target === e.currentTarget) { setShowCreateCommittee(false); setSelectedComplaintForAssignment(null); } }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)', width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px' }}>
              {!assignmentMode ? (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, color: '#1f2937', fontSize: '22px' }}>Assign Complaint</h3>
                    <button onClick={() => { setShowCreateCommittee(false); setSelectedComplaintForAssignment(null); setAssignmentMode(null); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
                  </div>
                  <p style={{ marginTop: 0, color: '#64748b', marginBottom: '16px' }}>Choose whether to create a new committee or assign this complaint to an active committee.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select value={assignmentMode || ''} onChange={(e) => setAssignmentMode(e.target.value || null)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1f2937', fontSize: '15px', boxSizing: 'border-box' }}>
                      <option value="">Select assignment type</option>
                      <option value="new">Create New Committee</option>
                      <option value="existing">Assign to Active Committee</option>
                    </select>
                    <button onClick={() => { if (!assignmentMode) { alert('Please choose an assignment type.'); return; } setAssignmentMode(assignmentMode); }} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#0f766e', color: 'white', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>Continue</button>
                  </div>
                </div>
              ) : assignmentMode === 'new' ? (
                <CreateCommitteeScreen user={user} initialComplaintId={selectedComplaintForAssignment?.Id || null} onBack={() => setAssignmentMode(null)} onCreated={async () => { await refreshDashboardData(); setShowCreateCommittee(false); setSelectedComplaintForAssignment(null); setAssignmentMode(null); }} />
              ) : (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <button onClick={() => setAssignmentMode(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>←</button>
                    <h3 style={{ margin: 0, color: '#1f2937', fontSize: '22px' }}>Available Committees</h3>
                    <div style={{ width: '24px' }} />
                  </div>
                  <p style={{ marginTop: 0, color: '#64748b', marginBottom: '16px' }}>Select an available committee to assign complaint #{selectedComplaintForAssignment?.Id}.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {uniqueActiveCommittees.length === 0 ? (
                      <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f8fafc', color: '#475569' }}>No available committees.</div>
                    ) : uniqueActiveCommittees.map((panel) => (
                      <div key={`assign-panel-${panel.Id}`} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', backgroundColor: '#fff' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>{panel.PanelName || `Committee #${panel.Id}`}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>Status: {panel.Status || 'active'}</div>
                        <button onClick={async () => { try { await assignComplaintToPanel({ panelId: panel.Id, complaintId: selectedComplaintForAssignment.Id, presidentCnic: user.cnic, }); await refreshDashboardData(); setShowCreateCommittee(false); setSelectedComplaintForAssignment(null); setAssignmentMode(null); alert('Complaint assigned to active committee successfully.'); } catch (err) { alert('Failed to assign complaint: ' + err.message); } }} style={{ padding: '10px 12px', border: 'none', borderRadius: '8px', backgroundColor: '#0f766e', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Assign Here</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showFinalReview && selectedComplaintForReview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '20px' }} onClick={(e) => { if (e.target === e.currentTarget) { setShowFinalReview(false); setSelectedComplaintForReview(null); } }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)', width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button onClick={() => { setShowFinalReview(false); setSelectedComplaintForReview(null); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
              </div>
              <CommitteeMeetingScreen committee={selectedComplaintForReview} user={user} nhcCode={user.nhcCode} allowPresidentReview={true} onBack={() => { setShowFinalReview(false); setSelectedComplaintForReview(null); }} onSaved={async () => { await refreshDashboardData(); setShowFinalReview(false); setSelectedComplaintForReview(null); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresidentDashboard;