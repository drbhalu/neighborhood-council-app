import React, { useState, useEffect } from 'react';
import { getBudgetRequests, getComplaintHistory, getBudgetStats, getBudgetAvailable, getBudgetHistory, releaseBudget, rejectBudget } from '../api';

const TreasurerBudgetManagement = ({ user, nhcCode, onBack }) => {
  const [budgetRequests, setBudgetRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [budgetHistoryLoading, setBudgetHistoryLoading] = useState(false);
  const [budgetHistoryError, setBudgetHistoryError] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalRequests: 0,
    approvedRequests: 0,
    allocatedRequests: 0,
    releasedRequests: 0,
    rejectedRequests: 0,
    pendingAllocation: 0,
    totalAllocatedAmount: 0,
    totalReleasedAmount: 0,
    totalBudgetAvailable: 0,
  });

  const totalBudgetAvailable = typeof stats.totalBudgetAvailable === 'number'
    ? stats.totalBudgetAvailable
    : Math.max(0, stats.totalAllocatedAmount - stats.totalReleasedAmount);
  const [viewMode, setViewMode] = useState('approved');
  const [budgetCategory, setBudgetCategory] = useState('');
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [allocationError, setAllocationError] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const containerStyle = {
    backgroundColor: '#f6f3fa',
    borderRadius: '24px',
    padding: '22px',
    maxWidth: '940px',
    margin: '0 auto',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '24px',
  };

  const titleStyle = {
    margin: 0,
    fontSize: '28px',
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

  const tabsStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '10px',
  };

  const tabStyle = (isActive) => ({
    padding: '10px 20px',
    border: 'none',
    background: isActive ? '#2563eb' : 'none',
    color: isActive ? '#ffffff' : '#64748b',
    fontSize: '14px',
    fontWeight: isActive ? '700' : '600',
    cursor: 'pointer',
    borderRadius: '999px',
  });

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

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#2563eb',
    color: '#ffffff',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#e5e7eb',
    color: '#111827',
  };

  const rejectButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ef4444',
    color: '#ffffff',
  };

  const statusBadgeStyle = (status) => {
    const normalized = String(status || 'pending').toLowerCase();
    let bgColor = '#eff6ff';
    let textColor = '#1e40af';
    if (normalized === 'approved' || normalized === 'released') {
      bgColor = '#dcfce7';
      textColor = '#166534';
    } else if (normalized === 'allocated') {
      bgColor = '#dbeafe';
      textColor = '#1e3a8a';
    } else if (normalized === 'rejected') {
      bgColor = '#fee2e2';
      textColor = '#991b1b';
    } else if (normalized === 'revision-requested') {
      bgColor = '#fce7f3';
      textColor = '#be123c';
    } else if (normalized === 'pending') {
      bgColor = '#fef3c7';
      textColor = '#92400e';
    }
    return {
      display: 'inline-block',
      backgroundColor: bgColor,
      color: textColor,
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '700',
    };
  };

  useEffect(() => {
    const loadRequests = async () => {
      if (!nhcCode) return;
      try {
        setLoading(true);
        setError('');
        const data = await getBudgetRequests(nhcCode);
        setBudgetRequests(data || []);
      } catch (err) {
        setError('Failed to load budget requests: ' + err.message);
        setBudgetRequests([]);
      } finally {
        setLoading(false);
      }
    };
    loadRequests();
  }, [nhcCode, refreshKey]);

  useEffect(() => {
    const loadStats = async () => {
      if (!nhcCode) return;
      try {
        const [statsData, budgetData] = await Promise.all([
          getBudgetStats(nhcCode),
          getBudgetAvailable(nhcCode),
        ]);
        setStats({
          totalRequests: statsData.totalRequests || 0,
          approvedRequests: statsData.approvedRequests || 0,
          allocatedRequests: statsData.allocatedRequests || 0,
          releasedRequests: statsData.releasedRequests || 0,
          rejectedRequests: statsData.rejectedRequests || 0,
          pendingAllocation: statsData.pendingAllocation || 0,
          totalAllocatedAmount: statsData.totalAllocatedAmount || 0,
          totalReleasedAmount: statsData.totalReleasedAmount || 0,
          totalBudgetAvailable: Number.parseFloat(budgetData?.availableBudget ?? statsData.totalBudgetAvailable) || 0,
        });
      } catch (err) {
        console.warn('Failed to load budget statistics:', err.message);
      }
    };
    loadStats();
  }, [nhcCode, refreshKey]);

  useEffect(() => {
    const loadBudgetHistory = async () => {
      if (!nhcCode || viewMode !== 'history' || !user?.cnic) return;
      try {
        setBudgetHistoryLoading(true);
        setBudgetHistoryError('');
        const rows = await getBudgetHistory(nhcCode, user.cnic);
        setBudgetHistory(rows || []);
      } catch (err) {
        setBudgetHistoryError(err.message);
        setBudgetHistory([]);
      } finally {
        setBudgetHistoryLoading(false);
      }
    };
    loadBudgetHistory();
  }, [nhcCode, viewMode, refreshKey, user?.cnic]);

  useEffect(() => {
    if (!selectedRequest) return;
    const { amount } = parseBudgetDetails(selectedRequest.CommitteeRemarks);
    setBudgetCategory(selectedRequest.BudgetCategory || '');
    setAllocatedAmount(
      selectedRequest.BudgetAllocatedAmount > 0
        ? String(selectedRequest.BudgetAllocatedAmount)
        : String(parseAmountValue(amount) || '')
    );
    setAllocationError('');
  }, [selectedRequest]);

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

  const parseBudgetDetails = (remarks) => {
    if (!remarks) return { amount: '', reason: '' };
    const lines = String(remarks).split('\n\n');
    const amount = lines.find(l => l.includes('Budget Needed:'))?.replace('Budget Needed:', '').trim() || '';
    const reason = lines.find(l => l.includes('Budget Reason:'))?.replace('Budget Reason:', '').trim() || '';
    return { amount, reason };
  };

  const parseAmountValue = (amountString) => {
    const parsed = parseFloat(String(amountString || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const normalizeStatus = (value) => String(value || 'pending').toLowerCase();

  const pendingRequests = budgetRequests.filter((request) => normalizeStatus(request.PresidentApprovalStatus) === 'pending');
  const approvedRequests = budgetRequests.filter((request) => normalizeStatus(request.PresidentApprovalStatus) === 'approved');
  const rejectedRequests = budgetRequests.filter((request) => normalizeStatus(request.PresidentApprovalStatus) === 'rejected');
  const revisionRequests = budgetRequests.filter((request) => normalizeStatus(request.PresidentApprovalStatus) === 'revision-requested');
  const allocatedRequests = budgetRequests.filter((request) => normalizeStatus(request.BudgetAllocationStatus) === 'allocated');
  const releasedRequests = budgetRequests.filter((request) => normalizeStatus(request.BudgetAllocationStatus) === 'released');

  const getFilteredRequests = () => {
    return budgetRequests.filter((request) => {
      const approval = normalizeStatus(request.PresidentApprovalStatus);
      const allocation = normalizeStatus(request.BudgetAllocationStatus);
      if (viewMode === 'history') return false;
      if (viewMode === 'approved') return approval === 'approved' && allocation === 'pending';
      if (viewMode === 'allocated') return allocation === 'allocated';
      if (viewMode === 'released') return allocation === 'released';
      if (viewMode === 'pending') return approval === 'pending';
      if (viewMode === 'rejected') return approval === 'rejected';
      if (viewMode === 'revision') return approval === 'revision-requested';
      return true;
    });
  };

  const renderRequestsList = (requests) => {
    if (requests.length === 0) {
      return (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#64748b', padding: '30px' }}>
          No budget requests found
        </div>
      );
    }

    return (
      <div>
        {requests.map((request) => {
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
              onClick={() => setSelectedRequest(request)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                    {request.Category || 'Budget Request'}
                  </h3>
                  <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#475569', lineHeight: 1.5 }}>
                    {request.Description || 'No description'}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>
                    <strong>Complainant:</strong> {request.UserName || request.UserCNIC || 'Unknown'}
                  </p>
                  {budgetDetails.amount && (
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1f2937' }}>
                      <strong style={{ color: '#dc2626' }}>Budget Needed:</strong> {budgetDetails.amount}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {(() => {
                    const status = normalizeStatus(request.BudgetAllocationStatus) !== 'pending'
                      ? normalizeStatus(request.BudgetAllocationStatus)
                      : normalizeStatus(request.PresidentApprovalStatus);
                    return (
                      <div style={statusBadgeStyle(status)}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </div>
                    );
                  })()}
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
    const approval = normalizeStatus(selectedRequest.PresidentApprovalStatus);
    const allocation = normalizeStatus(selectedRequest.BudgetAllocationStatus);

    return (
      <div style={{ ...cardStyle, marginTop: '20px', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <button
            onClick={() => setSelectedRequest(null)}
            style={backButtonStyle}
            title="Back to list"
          >
            ←
          </button>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111827' }}>
            Budget Request Details
          </h2>
        </div>

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

        <div style={{ backgroundColor: '#fef3c7', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #fcd34d' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#92400e' }}>
            Budget Request Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div>
              <strong style={{ color: '#92400e' }}>Amount Needed:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#78350f', fontSize: '18px', fontWeight: '700' }}>
                {budgetDetails.amount || 'Not specified'}
              </p>
            </div>
            <div>
              <strong style={{ color: '#92400e' }}>Approval Status:</strong>
              <p style={{ margin: '4px 0 0 0' }}>
                <span style={statusBadgeStyle(approval)}>{approval.charAt(0).toUpperCase() + approval.slice(1)}</span>
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

        {approval !== 'pending' && selectedRequest.PresidentApprovalComments && (
          <div style={{ backgroundColor: '#fce7f3', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #fbcfe8' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#be123c' }}>
              President's Feedback
            </h3>
            <p style={{ margin: 0, color: '#831843', lineHeight: 1.5 }}>
              {selectedRequest.PresidentApprovalComments}
            </p>
          </div>
        )}

        {approval === 'approved' && allocation !== 'released' && (
          <div style={{ backgroundColor: '#eef2ff', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #c7d2fe' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#4338ca' }}>
              Treasurer Action
            </h3>
            {allocation === 'allocated' ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <strong>Allocated Amount</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#111827' }}>PKR {selectedRequest.BudgetAllocatedAmount || '0.00'}</p>
                  </div>
                  <div>
                    <strong>Budget Category</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#111827' }}>{selectedRequest.BudgetCategory || 'Not assigned'}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      setIsReleasing(true);
                      await releaseBudget(selectedRequest.Id, user.cnic);
                      setError('');
                      setSelectedRequest(null);
                      setRefreshKey((prev) => prev + 1);
                    } catch (err) {
                      setError('Failed to release budget: ' + err.message);
                    } finally {
                      setIsReleasing(false);
                    }
                  }}
                  style={{ ...primaryButtonStyle, minWidth: '220px' }}
                  disabled={isReleasing}
                >
                  {isReleasing ? 'Releasing...' : 'Release Budget to Committee'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 12px 0', color: '#1f2937' }}>
                  This approved request has been forwarded to the treasurer. Fill in the budget category and amount, then release it to the committee.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4338ca', marginBottom: '8px' }}>
                      Budget Category
                    </label>
                    <select
                      value={budgetCategory}
                      onChange={(e) => setBudgetCategory(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #c7d2fe', fontSize: '14px' }}
                    >
                      <option value="">Choose category</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Operations">Operations</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Programs">Programs</option>
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Community Outreach">Community Outreach</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4338ca', marginBottom: '8px' }}>
                      Amount to Release
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={allocatedAmount}
                      onChange={(e) => setAllocatedAmount(e.target.value)}
                      placeholder="PKR amount"
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #c7d2fe', fontSize: '14px' }}
                    />
                  </div>
                </div>
                {allocationError && (
                  <p style={{ color: '#b91c1c', marginTop: '12px' }}>{allocationError}</p>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    style={{ ...rejectButtonStyle, flex: 1, minWidth: '120px' }}
                    disabled={isRejecting}
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={async () => {
                      const amount = parseFloat(allocatedAmount);
                      if (!budgetCategory) {
                        setAllocationError('Please select a budget category.');
                        return;
                      }
                      if (!amount || amount <= 0) {
                        setAllocationError('Please enter a valid budget amount.');
                        return;
                      }
                      if (amount > totalBudgetAvailable) {
                        setAllocationError(`Allocated amount (PKR ${amount.toFixed(2)}) exceeds available budget (PKR ${totalBudgetAvailable.toFixed(2)}).`);
                        return;
                      }
                      try {
                        setAllocationError('');
                        setIsAllocating(true);
                        await releaseBudget(selectedRequest.Id, user.cnic, amount, budgetCategory);
                        setError('');
                        setSelectedRequest(null);
                        setRefreshKey((prev) => prev + 1);
                      } catch (err) {
                        setAllocationError(err.message);
                      } finally {
                        setIsAllocating(false);
                      }
                    }}
                    style={{ ...primaryButtonStyle, flex: 1, minWidth: '120px' }}
                    disabled={isAllocating}
                  >
                    {isAllocating ? 'Releasing...' : 'Release Budget to Committee'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showRejectForm && (
          <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #fecaca' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#991b1b' }}>
              Reject Budget Request
            </h3>
            <p style={{ margin: '0 0 12px 0', color: '#7f1d1d' }}>
              Please provide a reason for rejecting this budget request.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                fontSize: '14px',
                minHeight: '80px',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason('');
                }}
                style={{ ...secondaryButtonStyle, flex: 1 }}
                disabled={isRejecting}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!rejectionReason.trim()) {
                    alert('Please provide a rejection reason.');
                    return;
                  }
                  try {
                    setIsRejecting(true);
                    await rejectBudget(selectedRequest.Id, user.cnic, rejectionReason.trim());
                    setError('');
                    setShowRejectForm(false);
                    setRejectionReason('');
                    setSelectedRequest(null);
                    setRefreshKey((prev) => prev + 1);
                  } catch (err) {
                    alert('Error rejecting budget: ' + err.message);
                  } finally {
                    setIsRejecting(false);
                  }
                }}
                style={{ ...rejectButtonStyle, flex: 1 }}
                disabled={isRejecting}
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}

        {allocation === 'rejected' && (
          <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #fecaca' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#991b1b' }}>
              Budget Request Rejected
            </h3>
            <p style={{ margin: 0, color: '#7f1d1d' }}>
              <strong>Reason:</strong> {selectedRequest.BudgetRejectionReason || 'No reason provided'}
            </p>
          </div>
        )}

        {allocation === 'released' && (
          <div style={{ backgroundColor: '#dcfce7', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #bbf7d0' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#166534' }}>
              Budget Released
            </h3>
            <p style={{ margin: 0, color: '#166534' }}>
              This budget has already been released to the committee on {selectedRequest.BudgetReleasedDate ? new Date(selectedRequest.BudgetReleasedDate).toLocaleDateString() : 'unknown date'}.
            </p>
          </div>
        )}

        <div style={{ marginTop: '16px' }}>
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
                  {item.RemarksSnapshot && (
                    <div style={{ color: '#475569', marginTop: '4px', whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                      {item.RemarksSnapshot}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '12px', marginTop: '20px', border: '1px solid #bfdbfe' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#1e40af', lineHeight: 1.6 }}>
            ℹ️ <strong>Treasurer Review:</strong> This budget request has been reviewed by the President. Your next step is to assign budgeted funds to an expense category and release them when the committee is ready to act.
          </p>
        </div>
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
        <h1 style={titleStyle}>Budget Review</h1>
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...cardStyle, backgroundColor: '#fee2e2', color: '#991b1b', marginBottom: '16px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <div style={tabsStyle}>
        <button style={tabStyle(viewMode === 'approved')} onClick={() => setViewMode('approved')}>
          Approved ({approvedRequests.filter((request) => normalizeStatus(request.BudgetAllocationStatus) === 'pending').length})
        </button>
        <button style={tabStyle(viewMode === 'history')} onClick={() => {
          setViewMode('history');
          setSelectedRequest(null);
        }}>
          History ({budgetHistory.length})
        </button>
        {/*
        <button style={tabStyle(viewMode === 'allocated')} onClick={() => setViewMode('allocated')}>
          Allocated ({allocatedRequests.length})
        </button>
        <button style={tabStyle(viewMode === 'released')} onClick={() => setViewMode('released')}>
          Released ({releasedRequests.length})
        </button>
        <button style={tabStyle(viewMode === 'pending')} onClick={() => setViewMode('pending')}>
          Pending President ({pendingRequests.length})
        </button>
        <button style={tabStyle(viewMode === 'rejected')} onClick={() => setViewMode('rejected')}>
          Rejected ({rejectedRequests.length})
        </button>
        <button style={tabStyle(viewMode === 'revision')} onClick={() => setViewMode('revision')}>
          Changes Requested ({revisionRequests.length})
        </button>
        */}
      </div>

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <div style={{ ...cardStyle, backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }}>
            <div style={{ fontSize: '12px', color: '#2563eb', marginBottom: '8px', fontWeight: '700' }}>Total Budget Available</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937' }}>PKR {totalBudgetAvailable.toFixed(2)}</div>
          </div>
          <div style={{ ...cardStyle, backgroundColor: '#fef3c7', borderColor: '#fde68a' }}>
            <div style={{ fontSize: '12px', color: '#b45309', marginBottom: '8px', fontWeight: '700' }}>Total Budget Requests</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#92400e' }}>{stats.totalRequests}</div>
          </div>
          <div style={{ ...cardStyle, backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }}>
            <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '8px', fontWeight: '700' }}>Approved Requests</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#166534' }}>{stats.approvedRequests}</div>
          </div>
        </div>
      )}

      {/*
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <div style={{ ...cardStyle, backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <div style={{ fontSize: '12px', color: '#334155', marginBottom: '8px', fontWeight: '700' }}>Approved Requests</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>{stats.approvedRequests}</div>
          </div>
          <div style={{ ...cardStyle, backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }}>
            <div style={{ fontSize: '12px', color: '#2563eb', marginBottom: '8px', fontWeight: '700' }}>Allocated Requests</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>{stats.allocatedRequests}</div>
          </div>
          <div style={{ ...cardStyle, backgroundColor: '#f8fafc', borderColor: '#dbeafe' }}>
            <div style={{ fontSize: '12px', color: '#0f172a', marginBottom: '8px', fontWeight: '700' }}>Total Allocated</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>PKR {stats.totalAllocatedAmount.toFixed(2)}</div>
          </div>
        </div>
      )}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <div style={{ ...cardStyle, backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <div style={{ fontSize: '12px', color: '#334155', marginBottom: '8px', fontWeight: '700' }}>Total Released Amount</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#166534' }}>PKR {stats.totalReleasedAmount.toFixed(2)}</div>
          </div>
        </div>
      )}
      */}

      {/* Loading */}
      {loading && (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#64748b', padding: '30px' }}>
          Loading budget requests...
        </div>
      )}

      {/* Content */}
      {!loading && !selectedRequest && viewMode !== 'history' && (
        <div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            {viewMode === 'approved' ? 'Approved Requests Awaiting Allocation' :
             viewMode === 'allocated' ? 'Allocated Budget Requests' :
             viewMode === 'released' ? 'Released Budget Requests' :
             viewMode === 'pending' ? 'Pending President Review' :
             viewMode === 'rejected' ? 'Rejected Requests' :
             viewMode === 'revision' ? 'Requests Needing Changes' : 'Budget Requests'}
          </h2>
          {renderRequestsList(getFilteredRequests())}
        </div>
      )}

      {!loading && !selectedRequest && viewMode === 'history' && (
        <div>
          {budgetHistoryLoading ? (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#64748b', padding: '30px' }}>
              Loading budget history...
            </div>
          ) : budgetHistoryError ? (
            <div style={{ ...cardStyle, backgroundColor: '#fee2e2', color: '#991b1b', padding: '18px' }}>
              {budgetHistoryError}
            </div>
          ) : budgetHistory.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#64748b', padding: '30px' }}>
              No budget history available.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {budgetHistory.map((item) => (
                <div key={`budget-history-${item.Id}`} style={{ ...cardStyle, padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Complaint #{item.ComplaintId}</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>{item.Category || 'Budget action'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={statusBadgeStyle(item.ActionType?.replace('budget-', ''))}>{item.ActionType?.replace('budget-', ' ')}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>{new Date(item.CreatedDate).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '14px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>Amount</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                        {item.BudgetAllocatedAmount != null ? `PKR ${Number(item.BudgetAllocatedAmount).toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>Category</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>{item.BudgetCategory || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>Status</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>{item.BudgetAllocationStatus || 'N/A'}</div>
                    </div>
                  </div>
                  {item.RemarksSnapshot && (
                    <div style={{ marginTop: '14px', fontSize: '14px', color: '#475569', whiteSpace: 'pre-wrap' }}>
                      <strong>Notes:</strong> {item.RemarksSnapshot}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail View */}
      {selectedRequest && renderDetailView()}

      {/* Empty State */}
      {!loading && viewMode !== 'history' && budgetRequests.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            No Processed Budget Requests
          </h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            Budget requests will appear here after the President reviews them.
          </p>
        </div>
      )}
    </div>
  );
};

export default TreasurerBudgetManagement;
