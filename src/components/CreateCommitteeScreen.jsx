import React, { useEffect, useState } from 'react';
import { createPanel, getCommitteeSettings, getNHCMembersByCode, getComplaintsByNHC, getPanels, getPanelMembers } from '../api';

const CreateCommitteeScreen = ({ user, onBack, onCreated, initialComplaintId = null }) => {
  // Build the committee form from the current NHC, complaint list, and committee settings.
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [committeeMemberCount, setCommitteeMemberCount] = useState(3);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [existingPanels, setExistingPanels] = useState([]);
  const [restrictSingleCommitteeMembership, setRestrictSingleCommitteeMembership] = useState(false);
  const [cascadeDeleteOnWithdraw, setCascadeDeleteOnWithdraw] = useState(false);
  const [existingCommitteeMemberCnics, setExistingCommitteeMemberCnics] = useState(new Set());
  const [enableUrgentWorkflow, setEnableUrgentWorkflow] = useState(true);
  const [unassignedUrgentComplaints, setUnassignedUrgentComplaints] = useState([]);
  const [formData, setFormData] = useState({
    committeeName: '',
    complaintId: '',
    committeeHead: '',
    member1: '',
    member2: '',
    member3: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [membersData, complaintsData, panelsData, settingsData] = await Promise.all([
          getNHCMembersByCode(user.nhcCode),
          getComplaintsByNHC(user.nhcCode),
          getPanels(user.nhcId ? { nhcId: user.nhcId } : { cnic: user.cnic }),
          getCommitteeSettings(),
        ]);

        // Use the configured member count, but fall back to three if settings are missing.
        const configuredCount = Number(settingsData?.committeeMemberCount) || 3;
        setCommitteeMemberCount(Math.max(1, configuredCount));
        setAvailableMembers((membersData || []).filter((m) => String(m.CNIC) !== String(user.cnic)));
        setComplaints(complaintsData || []);
        setExistingPanels(panelsData || []);
        const restrictOneCommittee = Boolean(settingsData?.restrictSingleCommitteeMembership === true);
        setRestrictSingleCommitteeMembership(restrictOneCommittee);
        setCascadeDeleteOnWithdraw(settingsData?.cascadeDeleteOnWithdraw === true);
        setEnableUrgentWorkflow(settingsData?.enableUrgentWorkflow !== false);

        // compute existing committee membership when restriction is enabled
        if (restrictOneCommittee) {
          const panelCnics = new Set();
          for (const panel of panelsData || []) {
            try {
              const members = await getPanelMembers(panel.Id);
              (members || []).forEach((member) => {
                if (member?.CNIC) panelCnics.add(String(member.CNIC));
              });
            } catch (memberErr) {
              console.error('Failed to load panel members for uniqueness check:', memberErr);
            }
            if (panel?.PresidentCNIC) panelCnics.add(String(panel.PresidentCNIC));
            if (panel?.TreasurerCNIC) panelCnics.add(String(panel.TreasurerCNIC));
            if (panel?.ViceCNIC) panelCnics.add(String(panel.ViceCNIC));
          }
          setExistingCommitteeMemberCnics(panelCnics);
        }

        // compute unassigned urgent complaints when urgent workflow is enabled
        if (settingsData?.enableUrgentWorkflow) {
          const assignedComplaintIds = new Set((panelsData || []).map((p) => p.ComplaintId).filter((id) => id !== null && typeof id !== 'undefined').map((id) => Number(id)));
          const urgentUnassigned = (complaintsData || []).filter((c) => {
            const v = String(c?.UrgentComplaint ?? c?.urgentComplaint ?? '').toLowerCase();
            const isUrgent = v === '1' || v === 'true' || v === 'urgent' || c?.UrgentComplaint === 1;
            return isUrgent && !assignedComplaintIds.has(Number(c.Id));
          });
          setUnassignedUrgentComplaints(urgentUnassigned);
        }
      } catch (err) {
        console.error('Error loading create committee screen data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user.cnic, user.nhcCode, user.nhcId]);

  useEffect(() => {
    if (initialComplaintId) {
      setFormData((prev) => ({ ...prev, complaintId: String(initialComplaintId) }));
    }
  }, [initialComplaintId]);

  const memberFieldNames = Array.from({ length: committeeMemberCount }, (_, index) => `member${index + 1}`);
  const selectedMembers = memberFieldNames.map((fieldName) => formData[fieldName]);
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    const handleDocClick = () => setOpenDropdown(null);
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  useEffect(() => {
    setFormData((prev) => {
      const next = { ...prev };
      memberFieldNames.forEach((fieldName) => {
        if (typeof next[fieldName] === 'undefined') {
          next[fieldName] = '';
        }
      });
      Object.keys(next).forEach((key) => {
        if (/^member\d+$/.test(key) && !memberFieldNames.includes(key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [committeeMemberCount]);

  useEffect(() => {
    if (formData.committeeHead && !selectedMembers.includes(formData.committeeHead)) {
      setFormData((prev) => ({ ...prev, committeeHead: '' }));
    }
  }, [formData.committeeHead, selectedMembers.join('|')]);

  const getAvailableOptionsForField = (fieldName) => {
    const selected = new Set(selectedMembers.filter((cnic) => cnic && cnic !== formData[fieldName]));
    return availableMembers.filter((member) => {
      const cnic = String(member.CNIC || '');
      if (!cnic) return false;
      if (formData[fieldName] === cnic) return true;
      if (restrictSingleCommitteeMembership && existingCommitteeMemberCnics.has(cnic)) return false;
      return !selected.has(cnic);
    });
  };

  const getAssignableComplaints = () => {
    // Prevent duplicate committee assignment for the same complaint.
    const assignedComplaintIds = new Set(
      (existingPanels || [])
        .map((p) => p.ComplaintId)
        .filter((id) => id !== null && typeof id !== 'undefined')
        .map((id) => Number(id))
    );

    return (complaints || []).filter((c) => {
      const status = String(c.Status || '').toLowerCase().replace(/\s+/g, '-');
      const isPending = status === 'pending' || status === 'open';
      const isUnassigned = !assignedComplaintIds.has(Number(c.Id));
      const isRequested = initialComplaintId && Number(c.Id) === Number(initialComplaintId);
      const isResolved = status === 'resolved';

      if (isRequested) {
        return isUnassigned && !isResolved;
      }
      return isPending && isUnassigned;
    });
  };

  const assignableComplaints = getAssignableComplaints();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user.nhcId) {
      alert('NHC information is missing. Please login again.');
      return;
    }

    const uniqueMembers = new Set(selectedMembers);

    if (!formData.committeeName.trim()) {
      alert('Please enter committee name.');
      return;
    }
    if (selectedMembers.some((cnic) => !cnic)) {
      alert(`Please select all ${committeeMemberCount} committee members.`);
      return;
    }
    if (uniqueMembers.size !== selectedMembers.length) {
      alert('Please select 5 different members.');
      return;
    }
    if (!formData.committeeHead) {
      alert('Please select a committee head from selected members.');
      return;
    }
    if (!formData.complaintId) {
      alert('Please select a complaint to assign this committee.');
      return;
    }

    if (restrictSingleCommitteeMembership) {
      const conflicted = selectedMembers.filter((cnic) => existingCommitteeMemberCnics.has(cnic));
      if (conflicted.length > 0) {
        alert('One or more selected members already belong to another committee. Choose different members or disable the single-committee restriction.');
        return;
      }
    }

    // Urgent-first enforcement: block assigning a normal complaint when urgent unassigned complaints exist
    try {
      const selected = complaints.find((c) => String(c.Id) === String(formData.complaintId));
      const selUrgentVal = String(selected?.UrgentComplaint ?? selected?.urgentComplaint ?? '').toLowerCase();
      const selectedIsUrgent = selUrgentVal === '1' || selUrgentVal === 'true' || selUrgentVal === 'urgent' || selected?.UrgentComplaint === 1;
      if (enableUrgentWorkflow && unassignedUrgentComplaints.length > 0 && !selectedIsUrgent) {
        alert('Assign urgent first to committees');
        setSubmitting(false);
        return;
      }
    } catch (err) {
      // ignore and continue
    }

    try {
      setSubmitting(true);
      // Create the committee panel with the selected head and members.
      await createPanel({
        panelName: formData.committeeName.trim(),
        presidentCnic: user.cnic,
        nhcId: user.nhcId,
        members: selectedMembers.map((cnic) => ({
          cnic,
          role: cnic === formData.committeeHead ? 'Head' : 'Member',
        })),
        complaintId: Number(formData.complaintId),
        isCommittee: true,
        cascadeDeleteOnWithdraw,
      });

      alert('Committee created successfully.');
      if (typeof onCreated === 'function') {
        onCreated();
      }
    } catch (error) {
      alert('Error creating committee: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, color: '#1f2937', fontSize: '22px' }}>Create Committee</h3>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}
        >
          ✕
        </button>
      </div>

      <p style={{ marginTop: 0, color: '#64748b', marginBottom: '14px' }}>
        Enter committee details and assign one complaint.
      </p>

      {loading ? (
        <p style={{ color: '#475569' }}>Loading form data...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
              Committee Name
            </label>
            {restrictSingleCommitteeMembership && (
              <div style={{ marginTop: '8px', color: '#525252', fontSize: '13px' }}>
                Members already assigned to another committee are hidden from selection.
              </div>
            )}
            <input
              type="text"
              required
              value={formData.committeeName}
              onChange={(e) => setFormData({ ...formData, committeeName: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              placeholder="Enter committee name"
            />
          </div>

          {memberFieldNames.map((fieldKey, index) => (
            <div style={{ marginBottom: '15px' }} key={fieldKey}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
                Member {index + 1}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === fieldKey ? null : fieldKey)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px'
                    }}
                  >
                    {(() => {
                      const sel = availableMembers.find(m => String(m.CNIC) === String(formData[fieldKey]));
                      if (!sel) return <span style={{ color: '#9ca3af' }}>Select member {index + 1}</span>;
                      const src = sel?.profileImage || sel?.ProfileImage || null;
                      const initials = `${(sel.FirstName || '').charAt(0) || ''}${(sel.LastName || '').charAt(0) || ''}`;
                      return (
                        <>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {src ? <img src={src} alt="Member" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: '700', color: '#64748b' }}>{initials || '👤'}</span>}
                          </div>
                          <div style={{ flex: 1 }}>{sel.FirstName} {sel.LastName} <span style={{ color: '#6b7280' }}>({sel.CNIC})</span></div>
                        </>
                      );
                    })()}
                    <div style={{ marginLeft: 'auto', color: '#9ca3af' }}>▾</div>
                  </button>

                  {openDropdown === fieldKey && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 6px 24px rgba(15,23,42,0.12)', zIndex: 40, maxHeight: 220, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ padding: '8px' }}>
                        {getAvailableOptionsForField(fieldKey).map((member) => (
                          <div key={`opt-${fieldKey}-${member.CNIC}`} onClick={() => { setFormData({ ...formData, [fieldKey]: String(member.CNIC) }); setOpenDropdown(null); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>
                            {/* oncreateprofile */}
                            {/* <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {member.profileImage || member.ProfileImage ? (
                                <img src={member.profileImage || member.ProfileImage} alt="opt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontWeight: '700', color: '#64748b' }}>{`${(member.FirstName||'').charAt(0)}${(member.LastName||'').charAt(0)}` || '👤'}</span>
                              )}
                            </div> */}
                            <div style={{ fontSize: '14px', color: '#111827' }}>
                              <div style={{ fontWeight: 600 }}>{member.FirstName} {member.LastName}</div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>{member.CNIC}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {formData[fieldKey] && (() => {
                  const sel = availableMembers.find(m => String(m.CNIC) === String(formData[fieldKey]));
                  const src = sel?.profileImage || sel?.ProfileImage || null;
                  const initials = sel ? `${(sel.FirstName || '').charAt(0) || ''}${(sel.LastName || '').charAt(0) || ''}` : '';
                  return (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {src ? (
                        <img src={src} alt="Member" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontWeight: '700', color: '#64748b' }}>{initials || '👤'}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
              Committee Head
            </label>
            <select
              required
              value={formData.committeeHead}
              onChange={(e) => setFormData({ ...formData, committeeHead: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
            >
              <option value="">Select committee head</option>
              {selectedMembers
                .filter(Boolean)
                .map((cnic) => {
                  const member = availableMembers.find((m) => String(m.CNIC) === String(cnic));
                  return (
                    <option key={`head-${cnic}`} value={cnic}>
                      {member ? `${member.FirstName} ${member.LastName}` : cnic} ({cnic})
                    </option>
                  );
                })}
            </select>
            {/* show head preview */}
            {formData.committeeHead && (() => {
              const head = availableMembers.find((m) => String(m.CNIC) === String(formData.committeeHead));
              const src = head?.profileImage || head?.ProfileImage || null;
              const initials = head ? `${(head.FirstName || '').charAt(0) || ''}${(head.LastName || '').charAt(0) || ''}` : '';
              return (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {src ? <img src={src} alt="Head" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: '700', color: '#64748b' }}>{initials || '👤'}</span>}
                  </div>
                  <div style={{ color: '#1f2937', fontWeight: '600' }}>{head ? `${head.FirstName} ${head.LastName}` : formData.committeeHead}</div>
                </div>
              );
            })()}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
              Assign Complaint
            </label>
            <select
              required
              value={formData.complaintId}
              onChange={(e) => setFormData({ ...formData, complaintId: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
            >
              <option value="">Select complaint</option>
              {assignableComplaints.map((complaint) => (
                <option key={`complaint-${complaint.Id}`} value={complaint.Id}>
                  #{complaint.Id} - {complaint.Category} ({complaint.UserName || complaint.UserCNIC || 'Unknown'})
                </option>
              ))}
            </select>
            {assignableComplaints.length === 0 && (
              <div style={{ marginTop: '8px', color: '#991b1b', fontSize: '12px' }}>
                No pending unassigned complaints available.
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || assignableComplaints.length === 0}
            style={{
              width: '100%',
              padding: '10px 20px',
              backgroundColor: '#0f766e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Creating...' : 'Create Committee'}
          </button>
        </form>
      )}
    </div>
  );
};

export default CreateCommitteeScreen;
