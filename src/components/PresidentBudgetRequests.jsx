import React, { useState, useEffect } from 'react';
import { getBudgetRequests, getComplaintHistory, approveBudgetRequest, rejectBudgetRequest, requestBudgetChanges, getCommitteeSettings } from '../api';

const PresidentBudgetRequests = ({ user, nhcCode, onBack, onApproved, canApproveBudget, urgentBudgetCount, enableUrgentWorkflow: urgentWorkflowProp, onBeforeApprove }) => {
  // President review queue for budget requests and their history.
  const [budgetRequests, setBudgetRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null); // 'approve', 'reject', 'request-changes'
  const [viewMode, setViewMode] = useState('pending');
  const [localEnableUrgentWorkflow, setLocalEnableUrgentWorkflow] = useState(true);
  const [urgentBudgetRequests, setUrgentBudgetRequests] = useState([]);

  // Styles
  const containerStyle = {
    backgroundColor: '#f6f3fa',
    borderRadius: '24px',
    padding: '22px',
    maxWidth: '900px',
    margin: '0 auto',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  };

  const titleStyle = {
    margin: 0,
    fontSize: '26px',
    fontWeight: '700',
    color: '#111827',
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#1f2937',
    fontSize: '28px',
    cursor: 'pointer',
    lineHeight: 1,
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '18px',
    marginBottom: '12px',
  };

  const listItemStyle = {
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const buttonStyle = {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  };

  const approveButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#10b981',
    color: '#ffffff',
  };

  const rejectButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ef4444',
    color: '#ffffff',
  };

  const requestChangesButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f59e0b',
    color: '#ffffff',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#e2e8f0',
    color: '#1f2937',
  };

  const tabsStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '10px',
  };

  const tabStyle = (isActive) => ({
    padding: '10px 18px',
    border: 'none',
    background: isActive ? '#2563eb' : 'none',
    color: isActive ? '#ffffff' : '#64748b',
    fontSize: '14px',
    fontWeight: isActive ? '700' : '600',
    cursor: 'pointer',
    borderRadius: '999px',
  });

  const statusBadgeStyle = (status) => {
    let bgColor = '#fef3c7';
    let textColor = '#92400e';
    if (status === 'approved') {
      bgColor = '#dcfce7';
      textColor = '#166534';
    } else if (status === 'rejected') {
      bgColor = '#fee2e2';
      textColor = '#991b1b';
    } else if (status === 'revision-requested') {
      bgColor = '#fce7f3';
      textColor = '#be123c';
    }
    return {
      display: 'inline-block',
      backgroundColor: bgColor,
      color: textColor,
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '600',
    };
  };

  // Load only requests still waiting for president review.
  useEffect(() => {
    const loadRequests = async () => {
      if (!nhcCode) return;
      try {
        setLoading(true);
        setError('');
        const [data, settings] = await Promise.all([
          getBudgetRequests(nhcCode),
          getCommitteeSettings()
        ]);
        const isUrgentEnabled = typeof urgentWorkflowProp === 'boolean'
          ? urgentWorkflowProp
          : settings?.enableUrgentWorkflow !== false;
        setLocalEnableUrgentWorkflow(settings?.enableUrgentWorkflow !== false);
        
        // Filter for pending president review
        let pending = (data || []).filter(r => {
          const status = String(r.PresidentApprovalStatus || 'pending').toLowerCase();
          return status === 'pending';
        });
        
        // Sort with urgent requests first if workflow is enabled
        if (isUrgentEnabled) {
          pending.sort((a, b) => {
            const aIsUrgent = isUrgentComplaint(a) ? 0 : 1;
            const bIsUrgent = isUrgentComplaint(b) ? 0 : 1;
            return aIsUrgent - bIsUrgent;
          });
          const urgentFiltered = pending.filter(isUrgentComplaint);
          setUrgentBudgetRequests(urgentFiltered);
        } else {
          setUrgentBudgetRequests([]);
        }
        
        setBudgetRequests(pending);
      } catch (err) {
        setError('Failed to load budget requests: ' + err.message);
        setBudgetRequests([]);
      } finally {
        setLoading(false);
      }
    };
    loadRequests();
  }, [nhcCode]);

  // Load the selected request's history for context.
  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedRequest?.Id || !user?.cnic) return;
      try {
        setHistoryLoading(true);
        const rows = await getComplaintHistory(selectedRequest.Id, user.cnic);
        setHistory(rows || []);
      } catch (err) {
        console.error('Error loading history:', err);
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [selectedRequest?.Id, user?.cnic]);

  // Pull budget amount and reason from the committee remarks payload.
  const parseBudgetDetails = (remarks) => {
    if (!remarks) return { amount: '', reason: '' };
    const lines = String(remarks).split('\n\n');
    const amount = lines.find(l => l.includes('Budget Needed:'))?.replace('Budget Needed:', '').trim() || '';
    const reason = lines.find(l => l.includes('Budget Reason:'))?.replace('Budget Reason:', '').trim() || '';
    return { amount, reason };
  };

  const isUrgentComplaint = (record) => {
    const value = String(record?.UrgentComplaint ?? record?.urgentComplaint ?? '').toLowerCase();
    return value === '1' || value === 'true' || value === 'urgent';
  };

  const effectiveUrgentWorkflow = typeof urgentWorkflowProp === 'boolean' ? urgentWorkflowProp : localEnableUrgentWorkflow;
  const urgentRequests = budgetRequests.filter(isUrgentComplaint);

  const getFilteredRequests = () => {
    if (viewMode === 'urgent') return urgentRequests;
    return budgetRequests;
  };

  const renderUrgencyBadge = (record) => {
    if (!isUrgentComplaint(record)) return null;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 10px',
          borderRadius: '999px',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          fontSize: '12px',
          fontWeight: '700',
          marginLeft: '8px',
        }}
      >
        URGENT
      </span>
    );
  };

  const handleApprove = async () => {
    if (!selectedRequest?.Id) return;
    if (onBeforeApprove && !onBeforeApprove(selectedRequest)) return;
    try {
      setProcessingId(selectedRequest.Id);
      await approveBudgetRequest(selectedRequest.Id, user.cnic, approvalComments);
      alert('Budget request approved successfully!');
      setApprovalComments('');
      setShowApprovalForm(false);
      setSelectedRequest(null);
      // Reload requests
      const data = await getBudgetRequests(nhcCode);
      const pending = (data || []).filter(r => {
        const status = String(r.PresidentApprovalStatus || 'pending').toLowerCase();
        return status === 'pending';
      });
      setBudgetRequests(pending);
      if (typeof onApproved === 'function') onApproved();
    } catch (err) {
      alert('Error approving budget: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest?.Id) return;
    if (!approvalComments.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    try {
      setProcessingId(selectedRequest.Id);
      await rejectBudgetRequest(selectedRequest.Id, user.cnic, approvalComments);
      alert('Budget request rejected successfully!');
      setApprovalComments('');
      setShowApprovalForm(false);
      setSelectedRequest(null);
      // Reload requests
      const data = await getBudgetRequests(nhcCode);
      const pending = (data || []).filter(r => {
        const status = String(r.PresidentApprovalStatus || 'pending').toLowerCase();
        return status === 'pending';
      });
      setBudgetRequests(pending);
    } catch (err) {
      alert('Error rejecting budget: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedRequest?.Id) return;
    if (!approvalComments.trim()) {
      alert('Please specify what changes are needed');
      return;
    }
    try {
      setProcessingId(selectedRequest.Id);
      await requestBudgetChanges(selectedRequest.Id, user.cnic, approvalComments);
      alert('Budget revision request sent successfully!');
      setApprovalComments('');
      setShowApprovalForm(false);
      setSelectedRequest(null);
      // Reload requests
      const data = await getBudgetRequests(nhcCode);
      const pending = (data || []).filter(r => {
        const status = String(r.PresidentApprovalStatus || 'pending').toLowerCase();
        return status === 'pending';
      });
      setBudgetRequests(pending);
    } catch (err) {
      alert('Error requesting budget changes: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const renderRequestsList = (requests) => {
    if (requests.length === 0) {
      return (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#64748b', padding: '30px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
          {viewMode === 'urgent' ? 'No urgent budget requests' : 'No pending budget requests'}
        </div>
      );
    }

    return (
      <div>
        {requests
          .slice()
          .sort((a, b) => Number(isUrgentComplaint(b)) - Number(isUrgentComplaint(a)))
          .map((request) => {
            const budgetDetails = parseBudgetDetails(request.CommitteeRemarks);
          const isSelected = selectedRequest?.Id === request.Id;
          
          return (
            <div
              key={request.Id}
              style={{
                ...cardStyle,
                ...listItemStyle,
                backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                borderLeft: isSelected ? '4px solid #2563eb' : '1px solid #e2e8f0',
              }}
              onClick={() => {
                setSelectedRequest(request);
                setShowApprovalForm(false);
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                      {request.Category || 'Budget Request'}
                    </h3>
                    {renderUrgencyBadge(request)}
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#475569', lineHeight: 1.5 }}>
                    {request.Description || 'No description'}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>
                    <strong>Complainant:</strong> {request.UserName || request.UserCNIC || 'Unknown'}
                  </p>
                  {budgetDetails.amount && (
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1f2937' }}>
                      <strong style={{ color: '#dc2626' }}>Amount Requested:</strong> {budgetDetails.amount}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={statusBadgeStyle('pending')}>
                    Pending
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetailView = () => {
    if (!selectedRequest) return null;

    const budgetDetails = parseBudgetDetails(selectedRequest.CommitteeRemarks);

    return (
      <div style={{ ...cardStyle, marginTop: '20px', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setSelectedRequest(null);
              setShowApprovalForm(false);
            }}
            style={backButtonStyle}
            title="Back to list"
          >
            ←
          </button>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111827' }}>
            Budget Request Review
          </h2>
          {renderUrgencyBadge(selectedRequest)}
        </div>

        {/* Complaint Details */}
        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
            Complaint Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div>
              <strong style={{ color: '#64748b' }}>Category:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#1f2937' }}>{selectedRequest.Category}</p>
            </div>
            <div>
              <strong style={{ color: '#64748b' }}>Complainant:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#1f2937' }}>
                {selectedRequest.UserName || selectedRequest.UserCNIC}
              </p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <strong style={{ color: '#64748b' }}>Description:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#1f2937', lineHeight: 1.5 }}>
                {selectedRequest.Description}
              </p>
            </div>
          </div>
        </div>

        {/* Budget Details */}
        <div style={{ backgroundColor: '#fef3c7', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #fcd34d' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#92400e' }}>
            Budget Requested by Committee
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div>
              <strong style={{ color: '#92400e' }}>Amount:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#78350f', fontSize: '18px', fontWeight: '700' }}>
                {budgetDetails.amount || 'Not specified'}
              </p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <strong style={{ color: '#92400e' }}>Reason:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#78350f', lineHeight: 1.5 }}>
                {budgetDetails.reason || 'Not provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Committee Remarks */}
        {selectedRequest.CommitteeRemarks && (
          <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #bfdbfe' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#1e40af' }}>
              Committee Remarks
            </h3>
            <p style={{ margin: 0, color: '#1e40af', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {selectedRequest.CommitteeRemarks}
            </p>
          </div>
        )}

        {/* History */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
            Activity History
          </h3>
          {historyLoading ? (
            <p style={{ color: '#64748b' }}>Loading history...</p>
          ) : history.length === 0 ? (
            <p style={{ color: '#64748b' }}>No activity history available</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.slice(0, 5).map((item) => (
                <div
                  key={`history-${item.Id}`}
                  style={{ fontSize: '13px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #2563eb' }}
                >
                  <div style={{ color: '#334155', marginBottom: '4px' }}>
                    {new Date(item.CreatedDate).toLocaleString()}
                  </div>
                  <div style={{ color: '#1f2937' }}>
                    <strong>{item.ActorRole || 'System'}:</strong> {item.ActionType || 'Update'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval Form */}
        {!showApprovalForm && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => {
                if (onBeforeApprove && !onBeforeApprove(selectedRequest)) return;
                setApprovalAction('approve');
                setApprovalComments('');
                setShowApprovalForm(true);
              }}
              style={approveButtonStyle}
              disabled={processingId === selectedRequest.Id}
            >
              ✓ Approve
            </button>
            <button
              onClick={() => {
                setApprovalAction('reject');
                setApprovalComments('');
                setShowApprovalForm(true);
              }}
              style={rejectButtonStyle}
              disabled={processingId === selectedRequest.Id}
            >
              ✕ Reject
            </button>
            <button
              onClick={() => {
                setApprovalAction('request-changes');
                setApprovalComments('');
                setShowApprovalForm(true);
              }}
              style={requestChangesButtonStyle}
              disabled={processingId === selectedRequest.Id}
            >
              ⟲ Request Changes
            </button>
          </div>
        )}

        {/* Approval Comments Form */}
        {showApprovalForm && (
          <div style={{ marginTop: '20px', backgroundColor: '#fef3c7', padding: '16px', borderRadius: '12px', border: '1px solid #fcd34d' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#92400e' }}>
              {approvalAction === 'approve' ? '✓ Approve Budget' : approvalAction === 'reject' ? '✕ Reject Budget' : '⟲ Request Changes'}
            </h3>
            
            {approvalAction !== 'approve' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '6px' }}>
                  {approvalAction === 'reject' ? 'Reason for Rejection' : 'What changes are needed?'}
                </label>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder={approvalAction === 'reject' ? 'Explain why this budget cannot be approved...' : 'Describe the required changes...'}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    border: '1px solid #fcd34d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {approvalAction === 'approve' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '6px' }}>
                  Optional Comments
                </label>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder='Add any comments about this approval (optional)...'
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    border: '1px solid #fcd34d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              {approvalAction === 'approve' && (
                <button
                  onClick={handleApprove}
                  style={{ ...approveButtonStyle, flex: 1 }}
                  disabled={processingId === selectedRequest.Id}
                >
                  {processingId === selectedRequest.Id ? 'Processing...' : 'Confirm Approval'}
                </button>
              )}
              {approvalAction === 'reject' && (
                <button
                  onClick={handleReject}
                  style={{ ...rejectButtonStyle, flex: 1 }}
                  disabled={processingId === selectedRequest.Id || !approvalComments.trim()}
                >
                  {processingId === selectedRequest.Id ? 'Processing...' : 'Confirm Rejection'}
                </button>
              )}
              {approvalAction === 'request-changes' && (
                <button
                  onClick={handleRequestChanges}
                  style={{ ...requestChangesButtonStyle, flex: 1 }}
                  disabled={processingId === selectedRequest.Id || !approvalComments.trim()}
                >
                  {processingId === selectedRequest.Id ? 'Processing...' : 'Send Changes Request'}
                </button>
              )}
              <button
                onClick={() => {
                  setShowApprovalForm(false);
                  setApprovalComments('');
                  setApprovalAction(null);
                }}
                style={{ ...secondaryButtonStyle, flex: 1 }}
                disabled={processingId === selectedRequest.Id}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={onBack} style={backButtonStyle} title="Back to dashboard">
          ←
        </button>
        <h1 style={titleStyle}>Budget Approval</h1>
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...cardStyle, backgroundColor: '#fee2e2', color: '#991b1b', marginBottom: '16px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#64748b', padding: '30px' }}>
          Loading budget requests...
        </div>
      )}

      {/* Content */}
      {!loading && !selectedRequest && (
        <div>
          {/* URGENT WORKFLOW ALERT */}
          {effectiveUrgentWorkflow && urgentBudgetRequests.length > 0 && viewMode !== 'urgent' && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '2px solid #dc2626',
              color: '#991b1b',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '15px',
              fontWeight: 'bold'
            }}>
              ⚠️ <strong>{urgentBudgetRequests.length} URGENT budget request(s) need approval first!</strong> Please review and approve urgent requests before others.
            </div>
          )}
          <div style={tabsStyle}>
            <button style={tabStyle(viewMode === 'pending')} onClick={() => setViewMode('pending')}>
              Pending ({budgetRequests.length})
            </button>
            <button style={tabStyle(viewMode === 'urgent')} onClick={() => setViewMode('urgent')}>
              Urgent ({urgentRequests.length})
            </button>
          </div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            {viewMode === 'urgent' ? 'Urgent Budget Requests' : 'Pending Budget Requests'}
          </h2>
          {renderRequestsList(getFilteredRequests())}
        </div>
      )}

      {/* Detail View */}
      {selectedRequest && renderDetailView()}

      {/* Empty State */}
      {!loading && budgetRequests.length === 0 && !selectedRequest && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            No Pending Budget Requests
          </h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            All budget requests have been processed.
          </p>
        </div>
      )}
    </div>
  );
};

export default PresidentBudgetRequests;
