import React, { useState } from 'react';
import { saveCommitteeMeetingDecision } from '../api';

const CommitteeMeetingScreen = ({ committee, onBack, onSaved }) => {
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
  const [saving, setSaving] = useState(false);

  const complainant = committee?.ComplaintUserName || committee?.ComplaintUserCNIC || 'N/A';
  const complaintType = String(committee?.ComplaintType || '').toLowerCase() === 'against' ? 'Against Member' : 'Normal';
  const statusLabel = committee?.ComplaintStatus || committee?.Status || 'In Progress';

  const mapDecisionToStatus = (value) => {
    if (value === 'solved') return 'Resolved';
    return 'In-Progress';
  };

  const decisionLabelMap = {
    budget: 'Budget Needed',
    solved: 'Complaint Solved In Meeting',
    inprogress: 'Need More Work / Still In Progress',
  };

  const handleSave = async () => {
    if (!committee?.ComplaintId) {
      alert('No complaint is assigned to this committee.');
      return;
    }
    if (!decision) {
      alert('Please select a meeting decision.');
      return;
    }

    try {
      setSaving(true);
      await saveCommitteeMeetingDecision({
        complaintId: committee.ComplaintId,
        remarks: remarks?.trim(),
        status: mapDecisionToStatus(decision),
        decision,
        minutesFile,
      });
      alert('Meeting decision saved successfully.');
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      alert('Failed to save meeting decision: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#e5e7eb', borderRadius: '12px', padding: '12px' }}>
      <div style={{ backgroundColor: '#3193bf', color: 'white', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#0f172a', fontSize: '32px', cursor: 'pointer', lineHeight: 1 }}
          title="Back"
        >
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '500' }}>Committee Meeting</h2>
      </div>

      <div style={{ marginTop: '12px', backgroundColor: '#f3f4f6', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '38px', color: '#202124' }}>
          {committee?.ComplaintCategory || committee?.PanelName || 'Committee Complaint'}
        </h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '36px', color: '#2b2e34', lineHeight: 1.2 }}>
          {committee?.ComplaintDescription || 'No complaint details available.'}
        </p>
        <p style={{ margin: '0 0 8px 0', fontSize: '34px', color: '#2b2e34' }}>
          Complainant: {complainant}
        </p>
        <p style={{ margin: '0 0 8px 0', fontSize: '34px', color: '#2b2e34' }}>
          Type: {complaintType}
        </p>
        <p style={{ margin: 0, fontSize: '34px', color: '#2b2e34' }}>
          Status: {statusLabel}
        </p>
      </div>

      <div style={{ marginTop: '12px', backgroundColor: '#f3f4f6', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '42px', color: '#202124' }}>Meeting Details</h3>

        <label
          style={{
            display: 'block',
            border: '2px solid #7a7f89',
            borderRadius: '40px',
            padding: '18px 16px',
            textAlign: 'center',
            fontSize: '40px',
            color: '#6a5b8f',
            cursor: 'pointer',
            marginBottom: '14px',
          }}
        >
          {minutesFile ? minutesFile.name : committee?.MeetingMinutesPath ? 'Replace Minutes PDF' : 'Upload Minutes PDF'}
          <input
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => setMinutesFile(e.target.files?.[0] || null)}
          />
        </label>

        {committee?.MeetingMinutesPath && !minutesFile ? (
          <p style={{ margin: '0 0 12px 0', color: '#334155', fontSize: '20px' }}>
            Existing minutes file is already saved.
          </p>
        ) : null}

        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter meeting summary / minutes remarks"
          style={{
            width: '100%',
            minHeight: '180px',
            border: '2px solid #7a7f89',
            borderRadius: '20px',
            padding: '18px',
            fontSize: '40px',
            color: '#3a3f47',
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
      </div>

      <div style={{ marginTop: '12px', backgroundColor: '#f3f4f6', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '42px', color: '#202124' }}>Meeting Decision</h3>

        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', fontSize: '42px', color: '#1f2937' }}>
          <input type="radio" name="meetingDecision" checked={decision === 'budget'} onChange={() => setDecision('budget')} style={{ width: '26px', height: '26px' }} />
          {decisionLabelMap.budget}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', fontSize: '42px', color: '#1f2937' }}>
          <input type="radio" name="meetingDecision" checked={decision === 'solved'} onChange={() => setDecision('solved')} style={{ width: '26px', height: '26px' }} />
          {decisionLabelMap.solved}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '42px', color: '#1f2937' }}>
          <input type="radio" name="meetingDecision" checked={decision === 'inprogress'} onChange={() => setDecision('inprogress')} style={{ width: '26px', height: '26px' }} />
          {decisionLabelMap.inprogress}
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: '12px',
          width: '100%',
          border: 'none',
          borderRadius: '12px',
          padding: '16px',
          backgroundColor: '#3193bf',
          color: '#dbe3e8',
          fontSize: '38px',
          fontWeight: '600',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save Meeting Decision'}
      </button>
    </div>
  );
};

export default CommitteeMeetingScreen;
