import React, { useEffect, useState } from 'react';
import { getComplaintHistory, saveCommitteeMeetingDecision, sendNotification, getAllUsers } from '../api';

const CommitteeMeetingScreen = ({ committee, user, onBack, onSaved, allowPresidentReview = false, nhcCode }) => {
  const normalizeDecision = (value) => {
    const v = String(value || '').toLowerCase().trim();
    if (v === 'budget' || v === 'budget needed') return 'budget';
    if (v === 'solved' || v === 'complaint solved in meeting') return 'solved';
    if (v === 'inprogress' || v === 'in-progress' || v === 'need more work / still in progress') return 'inprogress';
    return '';
  };

  const [minutesFile, setMinutesFile] = useState(null);
  const [remarks, setRemarks] = useState(committee?.CommitteeRemarks || '');
  const [decision, setDecision] = useState(normalizeDecision(committee?.MeetingDecision));
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetReason, setBudgetReason] = useState('');
  const [moreWorkNeeded, setMoreWorkNeeded] = useState('');
  const [resolutionDescription, setResolutionDescription] = useState('');
  const [presidentDecisionStatus, setPresidentDecisionStatus] = useState(''); // Approved, Rejected, Needs More Info
  const [presidentDecisionReason, setPresidentDecisionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const isPresident = String(user?.role || '').toLowerCase() === 'president';
  const isPresidentFinalReview = isPresident && allowPresidentReview;
  const isReadOnlyView = (isPresident && !allowPresidentReview) || isPresidentFinalReview;
  const complaintId = committee?.ComplaintId || committee?.Id;

  const complainant = committee?.ComplaintUserName || committee?.UserName || committee?.ComplaintUserCNIC || committee?.UserCNIC || 'N/A';
  const complaintType = String(committee?.ComplaintType || '').toLowerCase() === 'against' ? 'Against Member' : 'Normal';
  const statusLabel = committee?.ComplaintStatus || committee?.Status || 'In Progress';

  const mapDecisionToStatus = (value, presidentDecision = '') => {
    // If president is making final review, use their decision
    if (isPresidentFinalReview && presidentDecision) {
      if (presidentDecision === 'approved') {
        if (value === 'solved') return 'Resolved';
        if (value === 'budget') return 'Budget Approved';
        return 'In-Progress';
      }
      if (presidentDecision === 'rejected') {
        return 'Rejected';
      }
      if (presidentDecision === 'needsMoreInfo') {
        return 'Needs More Information';
      }
      // Fallback if presidentDecision has unexpected value
      return 'Pending President Review';
    }
    
    // For committee decision or pending review
    if (value === 'solved') {
      return isPresident && allowPresidentReview ? 'Resolved' : 'Pending President Review';
    }
    if (value === 'budget') {
      return 'Pending President Review';
    }
    return 'In-Progress';
  };

  const decisionLabelMap = {
    budget: 'Budget Needed',
    solved: 'Issue Solve in Meating',
    inprogress: 'Need More Work / Still In Progress',
  };

  const toEvidencePaths = (rawValue) => {
    if (!rawValue) return [];
    if (Array.isArray(rawValue)) return rawValue.filter(Boolean);
    if (typeof rawValue !== 'string') return [rawValue].filter(Boolean);

    const trimmed = rawValue.trim();
    if (!trimmed) return [];

    try {
      if (trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean);
      }
    } catch (_) {
      // Fall back to plain string path handling below.
    }

    return [trimmed];
  };

  const toAbsoluteEvidenceUrl = (pathValue) => {
    const filePath = String(pathValue || '').trim();
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
    return `http://localhost:3001${filePath.startsWith('/') ? '' : '/'}${filePath}`;
  };

  const isImageEvidence = (pathValue) => {
    const value = String(pathValue || '').toLowerCase();
    return /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)(\?|$)/.test(value);
  };

  const prettyActionLabel = (actionType) => {
    const raw = String(actionType || '').trim();
    if (!raw) return 'Update';
    return raw
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  };

  const roleLabel = (actorRole) => {
    const role = String(actorRole || '').toLowerCase();
    if (role === 'president') return 'President';
    if (role === 'treasurer') return 'Treasurer';
    if (role === 'admin') return 'Admin';
    if (role === 'user') return 'Member';
    if (role === 'committee') return 'Committee';
    return actorRole || 'System';
  };

  const roleBadgeStyle = (actorRole) => {
    const role = String(actorRole || '').toLowerCase();
    if (role === 'president') return { color: '#1e3a8a', backgroundColor: '#dbeafe', border: '1px solid #93c5fd' };
    if (role === 'treasurer') return { color: '#065f46', backgroundColor: '#d1fae5', border: '1px solid #6ee7b7' };
    if (role === 'admin') return { color: '#7c2d12', backgroundColor: '#ffedd5', border: '1px solid #fdba74' };
    return { color: '#334155', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' };
  };

  const actionChipStyle = (actionType) => {
    const action = String(actionType || '').toLowerCase();
    if (action.includes('finalized') || action.includes('resolved')) {
      return { color: '#065f46', backgroundColor: '#dcfce7', border: '1px solid #86efac' };
    }
    if (action.includes('budget')) {
      return { color: '#92400e', backgroundColor: '#fef3c7', border: '1px solid #fcd34d' };
    }
    if (action.includes('president')) {
      return { color: '#1e3a8a', backgroundColor: '#dbeafe', border: '1px solid #93c5fd' };
    }
    if (action.includes('committee')) {
      return { color: '#7c3aed', backgroundColor: '#ede9fe', border: '1px solid #c4b5fd' };
    }
    return { color: '#334155', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' };
  };

  const cardStyle = {
    backgroundColor: '#f6f3fa',
    border: '1px solid #e9e3f2',
    borderRadius: '24px',
    padding: '22px',
  };

  const sectionTitleStyle = {
    margin: '0 0 10px 0',
    fontSize: '22px',
    color: '#111827',
    fontWeight: '700',
  };

  const inputStyle = {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '15px',
    color: '#1f2937',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  };

  useEffect(() => {
    const loadHistory = async () => {
      if (!complaintId || !user?.cnic) return;
      try {
        setHistoryLoading(true);
        setHistoryError('');
        const rows = await getComplaintHistory(complaintId, user.cnic);
        setHistory(rows || []);
      } catch (err) {
        setHistoryError(err.message || 'Failed to load complaint history');
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [complaintId, user?.cnic]);

  const handleSave = async () => {
    if (isPresident && !allowPresidentReview) {
      alert('President can only view committee decisions.');
      return;
    }

    const selectedDecision = isPresidentFinalReview ? (decision || 'solved') : decision;

    if (!complaintId) {
      alert('No complaint is assigned to this committee.');
      return;
    }
    if (!selectedDecision) {
      alert('Please select a meeting decision.');
      return;
    }
    if (selectedDecision === 'budget') {
      if (!String(budgetAmount || '').trim()) {
        alert('Please enter how much budget is needed.');
        return;
      }
      if (!String(budgetReason || '').trim()) {
        alert('Please enter why more budget is needed.');
        return;
      }
    }
    if (selectedDecision === 'solved') {
      const isPresidentReview = isPresident && allowPresidentReview;
      if (!isPresidentReview && !minutesFile) {
        alert('Please upload resolution photos.');
        return;
      }
      if (!isPresidentReview && !String(resolutionDescription || '').trim()) {
        alert('Please describe how the issue was resolved.');
        return;
      }
    }
    if (selectedDecision === 'inprogress' && !String(moreWorkNeeded || '').trim()) {
      alert('Please enter what more work is needed.');
      return;
    }
    if (isPresidentFinalReview && !presidentDecisionStatus) {
      alert('Please select your decision: Approved, Rejected, or Needs More Info.');
      return;
    }
    if ((presidentDecisionStatus === 'rejected' || presidentDecisionStatus === 'needsMoreInfo') && !String(presidentDecisionReason || '').trim()) {
      alert(presidentDecisionStatus === 'rejected' ? 'Please provide a reason for rejection.' : 'Please specify what information is needed.');
      return;
    }

    try {
      setSaving(true);
      const requestStatus = mapDecisionToStatus(selectedDecision, presidentDecisionStatus);
      console.log('Saving meeting decision with:', {
        complaintId,
        remarks: remarks?.trim(),
        status: requestStatus,
        decision: selectedDecision,
        presidentDecisionStatus: isPresidentFinalReview ? presidentDecisionStatus : '',
        presidentDecisionReason: isPresidentFinalReview ? presidentDecisionReason.trim() : '',
        minutesFile,
        actorCnic: user?.cnic,
        budgetAmount: selectedDecision === 'budget' ? budgetAmount.trim() : '',
        budgetReason: selectedDecision === 'budget' ? budgetReason.trim() : '',
        moreWorkNeeded: selectedDecision === 'inprogress' ? moreWorkNeeded.trim() : '',
      });
      await saveCommitteeMeetingDecision({
        complaintId,
        remarks: remarks?.trim(),
        status: requestStatus,
        decision: selectedDecision,
        presidentDecisionStatus: isPresidentFinalReview ? presidentDecisionStatus : '',
        presidentDecisionReason: isPresidentFinalReview ? presidentDecisionReason.trim() : '',
        minutesFile,
        actorCnic: user?.cnic,
        budgetAmount: selectedDecision === 'budget' ? budgetAmount.trim() : '',
        budgetReason: selectedDecision === 'budget' ? budgetReason.trim() : '',
        moreWorkNeeded: selectedDecision === 'inprogress' ? moreWorkNeeded.trim() : '',
        resolutionDescription: selectedDecision === 'solved' ? resolutionDescription.trim() : '',
      });
      
      console.log('Final Status Set:', requestStatus, 'President Decision:', presidentDecisionStatus);
      
      // Send notification to all NHC members when president finalizes
      if (isPresidentFinalReview && nhcCode) {
        try {
          const allUsers = await getAllUsers();
          const nhcMembers = allUsers.filter(u => u.NHC_Code && u.NHC_Code.split(', ').includes(nhcCode));
          
          const decisionText = presidentDecisionStatus === 'approved' ? '✅ Approved' : 
                              presidentDecisionStatus === 'rejected' ? '❌ Rejected' : 
                              '❓ Needs More Information';
          
          const notificationMessage = `President's Final Review: Complaint "${committee?.ComplaintCategory || 'Complaint'}" has been ${decisionText}. Status: ${requestStatus}. ${presidentDecisionReason ? 'Details: ' + presidentDecisionReason : ''}`;
          
          for (const member of nhcMembers) {
            await sendNotification({ 
              recipientCnic: member.CNIC, 
              message: notificationMessage, 
              nhcCode 
            });
          }
          console.log(`Notification sent to ${nhcMembers.length} NHC members`);
        } catch (notificationErr) {
          console.error('Error sending notifications:', notificationErr);
          // Don't fail the whole operation if notification fails
        }
      }
      alert(
        isPresident && allowPresidentReview
          ? 'Complaint finalized successfully.'
          : requestStatus === 'Pending President Review'
            ? 'Meeting decision saved as a recommendation. It is now pending president review.'
            : 'Meeting decision saved successfully.'
      );
      try {
        const rows = await getComplaintHistory(complaintId, user.cnic);
        setHistory(rows || []);
      } catch (_) {}
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      console.error('Error saving meeting decision:', err);
      alert('Failed to save meeting decision: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#1f2937', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}
          title="Back"
        >
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#111827' }}>
          {isPresidentFinalReview ? 'Review & Finalize Complaint' : 'Committee Meeting'}
        </h2>
      </div>

      {/* COMPLAINT OVERVIEW */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '18px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#111827' }}>
          {committee?.ComplaintCategory || committee?.PanelName || 'Committee Complaint'}
        </h3>
        <p style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#334155', lineHeight: 1.55 }}>
          {committee?.ComplaintDescription || 'No complaint details available.'}
        </p>
        <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1f2937' }}>
          <strong>Complainant:</strong> {complainant}
        </p>
        <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1f2937' }}>
          <strong>Type:</strong> {complaintType}
        </p>
        <p style={{ margin: 0, fontSize: '15px', color: '#1f2937' }}>
          <strong>Status:</strong> {statusLabel}
        </p>
      </div>

      {/* COMMITTEE DECISION - HIGHLIGHTED FOR PRESIDENT REVIEW */}
      {isPresidentFinalReview && (
        <div style={{ marginTop: '14px', backgroundColor: '#eff6ff', borderRadius: '16px', border: '2px solid #3b82f6', padding: '18px' }}>
          <h3 style={{ ...sectionTitleStyle, color: '#1e3a8a', margin: '0 0 14px 0' }}>
            ✓ Committee Recommendation
          </h3>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #93c5fd', marginBottom: '12px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#1e3a8a' }}>
              {decisionLabelMap[decision] || committee?.MeetingDecision || 'Not provided'}
            </p>
            {committee?.CommitteeRemarks && (
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#1f2937', whiteSpace: 'pre-wrap' }}>
                <strong>Committee Remarks:</strong> {committee.CommitteeRemarks}
              </p>
            )}
          </div>

          {/* Show relevant details based on committee decision */}
          {decision === 'budget' && (
            <div style={{ backgroundColor: '#fef3c7', borderRadius: '12px', padding: '12px', border: '1px solid #fcd34d', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
                💰 Budget Request
              </p>
              {committee?.BudgetAmount && (
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#78350f' }}>
                  <strong>Amount:</strong> {committee.BudgetAmount}
                </p>
              )}
              {committee?.BudgetReason && (
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#78350f', whiteSpace: 'pre-wrap' }}>
                  <strong>Reason:</strong> {committee.BudgetReason}
                </p>
              )}
            </div>
          )}

          {decision === 'solved' && committee?.ResolutionPhotoPaths && (
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '12px', border: '1px solid #dcfce7', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600', color: '#065f46' }}>
                ✓ Resolution Evidence
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {(() => {
                  try {
                    const evidencePaths = toEvidencePaths(committee.ResolutionPhotoPaths);
                    if (!evidencePaths.length) {
                      return <span style={{ color: '#666', fontSize: '13px' }}>No evidence file found</span>;
                    }
                    return evidencePaths.map((pathValue, idx) => {
                      const evidenceUrl = toAbsoluteEvidenceUrl(pathValue);
                      if (isImageEvidence(pathValue)) {
                        return (
                          <a
                            key={`evidence-image-${idx}`}
                            href={evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'inline-block' }}
                            title="Open full image"
                          >
                            <img
                              src={evidenceUrl}
                              alt={`Resolution Evidence ${idx + 1}`}
                              style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '6px', border: '2px solid #dcfce7' }}
                            />
                          </a>
                        );
                      }
                      return (
                        <a
                          key={`evidence-file-${idx}`}
                          href={evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '150px',
                            minHeight: '56px',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #a7f3d0',
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            fontSize: '13px',
                            textDecoration: 'underline',
                            textAlign: 'center',
                          }}
                        >
                          Open evidence file {idx + 1}
                        </a>
                      );
                    });
                  } catch (e) {
                    return <span style={{ color: '#666', fontSize: '13px' }}>Unable to display photos</span>;
                  }
                })()}
              </div>
            </div>
          )}

          {decision === 'solved' && committee?.ResolutionDescription && (
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '12px', border: '1px solid #dcfce7' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600', color: '#065f46' }}>
                Resolution Description
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#065f46', whiteSpace: 'pre-wrap' }}>
                {committee.ResolutionDescription}
              </p>
            </div>
          )}

          {decision === 'inprogress' && committee?.MoreWorkNeeded && (
            <div style={{ backgroundColor: '#fef3c7', borderRadius: '12px', padding: '12px', border: '1px solid #fcd34d' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
                ⚙️ More Work Needed
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#78350f', whiteSpace: 'pre-wrap' }}>
                {committee.MoreWorkNeeded}
              </p>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      <div style={{ marginTop: '14px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '18px' }}>
        <h3 style={sectionTitleStyle}>History</h3>
        {historyLoading ? (
          <p style={{ margin: 0, color: '#64748b' }}>Loading history...</p>
        ) : historyError ? (
          <p style={{ margin: 0, color: '#b91c1c' }}>{historyError}</p>
        ) : history.length === 0 ? (
          <p style={{ margin: 0, color: '#64748b' }}>No previous updates yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((item) => (
              <div
                key={`history-${item.Id}`}
                style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', backgroundColor: '#f8fafc' }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ ...actionChipStyle(item.ActionType), borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                    {prettyActionLabel(item.ActionType)}
                  </span>
                  <span style={{ ...roleBadgeStyle(item.ActorRole), borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                    {roleLabel(item.ActorRole)}
                  </span>
                  <span style={{ fontSize: '12px', color: '#475569' }}>
                    {new Date(item.CreatedDate).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#1f2937', marginBottom: '4px' }}>
                  <strong>By:</strong> {item.ActorCNIC || 'System'} {item.ActorRole ? `(${item.ActorRole})` : ''}
                </div>
                {item.StatusSnapshot ? (
                  <div style={{ fontSize: '13px', color: '#1f2937', marginBottom: '4px' }}>
                    <strong>Status:</strong> {item.StatusSnapshot}
                  </div>
                ) : null}
                {item.RemarksSnapshot ? (
                  <div style={{ fontSize: '13px', color: '#1f2937', whiteSpace: 'pre-wrap', marginBottom: '4px' }}>
                    <strong>Remarks:</strong> {item.RemarksSnapshot}
                  </div>
                ) : null}
                {item.MinutesPathSnapshot ? (
                  <a
                    href={`http://localhost:3001${item.MinutesPathSnapshot}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'underline' }}
                  >
                    Open minutes PDF
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MEETING DETAILS - HIDDEN FOR PRESIDENT REVIEW */}
      {!isPresidentFinalReview && (
        <div style={{ marginTop: '14px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '18px' }}>
          <h3 style={sectionTitleStyle}>Meeting Details</h3>

          <label
            style={{
              display: 'block',
              border: '1px dashed #94a3b8',
              borderRadius: '12px',
              padding: '12px 14px',
              textAlign: 'center',
              fontSize: '15px',
              color: '#475569',
              cursor: 'pointer',
              marginBottom: '12px',
              backgroundColor: '#f8fafc',
            }}
          >
            {minutesFile ? minutesFile.name : committee?.MeetingMinutesPath ? 'Replace Minutes PDF' : 'Upload Minutes PDF'}
            <input
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              disabled={isReadOnlyView}
              onChange={(e) => setMinutesFile(e.target.files?.[0] || null)}
            />
          </label>

          {isPresident && !allowPresidentReview ? (
            <p style={{ margin: '0 0 12px 0', color: '#991b1b', fontSize: '14px' }}>
              View only: President cannot make committee decisions.
            </p>
          ) : null}

          {committee?.MeetingMinutesPath && !minutesFile ? (
            <a
              href={`http://localhost:3001${committee.MeetingMinutesPath}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-block', margin: '0 0 12px 0', color: '#2563eb', fontSize: '14px', textDecoration: 'underline' }}
            >
              Open existing minutes file
            </a>
          ) : null}

          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={isReadOnlyView}
            placeholder="Enter meeting summary / minutes remarks"
            style={{
              ...inputStyle,
              minHeight: '120px',
              resize: 'vertical',
            }}
          />
        </div>
      )}

      {/* MEETING DECISION - HIDDEN FOR PRESIDENT REVIEW */}
      {!isPresidentFinalReview && (
        <div style={{ marginTop: '14px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '18px' }}>
          <h3 style={sectionTitleStyle}>Meeting Decision</h3>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontSize: '15px', color: '#1f2937' }}>
            <input
              type="radio"
              name="meetingDecision"
              checked={decision === 'budget'}
              onChange={() => {
                setDecision('budget');
              }}
              disabled={isReadOnlyView}
              style={{ width: '18px', height: '18px' }}
            />
            {decisionLabelMap.budget}
          </label>
          {decision === 'budget' ? (
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                disabled={isReadOnlyView}
                placeholder="How much budget is needed"
                style={{
                  ...inputStyle,
                  marginBottom: '10px',
                }}
              />
              <textarea
                value={budgetReason}
                onChange={(e) => setBudgetReason(e.target.value)}
                disabled={isReadOnlyView}
                placeholder="Why more budget is needed"
                style={{
                  ...inputStyle,
                  minHeight: '120px',
                  resize: 'vertical',
                }}
              />
            </div>
          ) : null}
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontSize: '15px', color: '#1f2937' }}>
            <input
              type="radio"
              name="meetingDecision"
              checked={decision === 'solved'}
              onChange={() => {
                setDecision('solved');
              }}
              disabled={isReadOnlyView}
              style={{ width: '18px', height: '18px' }}
            />
            {decisionLabelMap.solved}
          </label>
          {decision === 'solved' ? (
            <div style={{ marginBottom: '12px', marginLeft: '28px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#1f2937' }}>
                Attach Resolution Evidence
              </label>
              {committee?.ResolutionPhotoPaths && (
                <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Existing Resolution Evidence:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {(() => {
                      try {
                        const evidencePaths = toEvidencePaths(committee.ResolutionPhotoPaths);
                        if (!evidencePaths.length) {
                          return <span style={{ color: '#666', fontSize: '13px' }}>No evidence file found</span>;
                        }

                        return evidencePaths.map((pathValue, idx) => {
                          const evidenceUrl = toAbsoluteEvidenceUrl(pathValue);

                          if (isImageEvidence(pathValue)) {
                            return (
                              <a
                                key={`evidence-image-${idx}`}
                                href={evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-block' }}
                                title="Open full image"
                              >
                                <img
                                  src={evidenceUrl}
                                  alt={`Resolution Evidence ${idx + 1}`}
                                  style={{ maxWidth: '220px', maxHeight: '220px', borderRadius: '6px', border: '1px solid #dcfce7' }}
                                />
                              </a>
                            );
                          }

                          return (
                            <a
                              key={`evidence-file-${idx}`}
                              href={evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '150px',
                                minHeight: '56px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid #a7f3d0',
                                backgroundColor: '#ecfdf5',
                                color: '#065f46',
                                fontSize: '13px',
                                textDecoration: 'underline',
                                textAlign: 'center',
                              }}
                            >
                              Open evidence file {idx + 1}
                            </a>
                          );
                        });
                      } catch (e) {
                        return <span style={{ color: '#666', fontSize: '13px' }}>Unable to display photos</span>;
                      }
                    })()}
                  </div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setMinutesFile(e.target.files[0] || null)}
                disabled={isReadOnlyView}
                style={{ marginBottom: '12px' }}
              />
              <textarea
                value={resolutionDescription}
                onChange={(e) => setResolutionDescription(e.target.value)}
                disabled={isReadOnlyView}
                placeholder="Describe how the issue was resolved and confirm completion"
                style={{
                  ...inputStyle,
                  minHeight: '120px',
                  resize: 'vertical',
                }}
              />
            </div>
          ) : null}
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#1f2937' }}>
            <input
              type="radio"
              name="meetingDecision"
              checked={decision === 'inprogress'}
              onChange={() => {
                setDecision('inprogress');
              }}
              disabled={isReadOnlyView}
              style={{ width: '18px', height: '18px' }}
            />
            {decisionLabelMap.inprogress}
          </label>
          {decision === 'inprogress' ? (
            <textarea
              value={moreWorkNeeded}
              onChange={(e) => setMoreWorkNeeded(e.target.value)}
              disabled={isReadOnlyView}
              placeholder="What more work is needed"
              style={{
                ...inputStyle,
                minHeight: '120px',
                marginTop: '10px',
                resize: 'vertical',
              }}
            />
          ) : null}
        </div>
      )}

      {/* PRESIDENT DECISION SECTION - ONLY FOR PRESIDENT REVIEW */}
      {isPresidentFinalReview && (
        <div style={{ marginTop: '14px', backgroundColor: '#ffffff', borderRadius: '16px', border: '2px solid #dc2626', padding: '18px' }}>
          <h3 style={{ ...sectionTitleStyle, color: '#dc2626', margin: '0 0 14px 0' }}>
            Your Final Decision
          </h3>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', fontSize: '15px', color: '#1f2937', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', cursor: 'pointer' }}>
            <input
              type="radio"
              name="presidentDecision"
              value="approved"
              checked={presidentDecisionStatus === 'approved'}
              onChange={(e) => setPresidentDecisionStatus(e.target.value)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '16px', fontWeight: '600' }}>✅ Approve</span>
            <span style={{ fontSize: '13px', color: '#666', marginLeft: 'auto' }}>Accept committee decision</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', fontSize: '15px', color: '#1f2937', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', cursor: 'pointer' }}>
            <input
              type="radio"
              name="presidentDecision"
              value="rejected"
              checked={presidentDecisionStatus === 'rejected'}
              onChange={(e) => setPresidentDecisionStatus(e.target.value)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '16px', fontWeight: '600' }}>❌ Reject</span>
            <span style={{ fontSize: '13px', color: '#666', marginLeft: 'auto' }}>Reject this complaint</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontSize: '15px', color: '#1f2937', padding: '12px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', cursor: 'pointer' }}>
            <input
              type="radio"
              name="presidentDecision"
              value="needsMoreInfo"
              checked={presidentDecisionStatus === 'needsMoreInfo'}
              onChange={(e) => setPresidentDecisionStatus(e.target.value)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '16px', fontWeight: '600' }}>❓ More Info Needed</span>
            <span style={{ fontSize: '13px', color: '#666', marginLeft: 'auto' }}>Request additional information</span>
          </label>
          
          {(presidentDecisionStatus === 'rejected' || presidentDecisionStatus === 'needsMoreInfo') && (
            <div style={{ marginTop: '16px', padding: '14px', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '1px solid #d1d5db' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                {presidentDecisionStatus === 'rejected' ? '⚠️ Reason for Rejection' : '❓ What Information is Needed?'}
              </label>
              <textarea
                value={presidentDecisionReason}
                onChange={(e) => setPresidentDecisionReason(e.target.value)}
                placeholder={presidentDecisionStatus === 'rejected' ? 'Explain why you are rejecting this complaint...' : 'Specify what additional information is needed...'}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  minHeight: '100px',
                  resize: 'vertical',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* FINALIZE BUTTON - ONLY FOR PRESIDENT REVIEW */}
      {isPresidentFinalReview && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: '20px',
            width: '100%',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 16px',
            backgroundColor: '#dc2626',
            color: '#ffffff',
            fontSize: '17px',
            fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {saving ? '⏳ Finalizing...' : '✓ Finalize Complaint'}
        </button>
      )}

      {/* SAVE BUTTON - FOR COMMITTEE */}
      {!isPresidentFinalReview && (!isPresident || allowPresidentReview) && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: '20px',
            width: '100%',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 16px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontSize: '17px',
            fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {saving ? '⏳ Saving...' : 'Save Meeting Decision'}
        </button>
      )}
    </div>
  );
};

export default CommitteeMeetingScreen;
