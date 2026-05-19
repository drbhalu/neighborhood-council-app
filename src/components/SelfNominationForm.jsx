import React, { useState, useEffect } from 'react';
import { createPanel, getNominations, getPanels, getNHCMembers, getPanelMembers, getPositions } from '../api';

const SelfNominationForm = ({ user, onBack }) => {
  // Form state for creating a panel during an open nomination window.
  const [panelName, setPanelName] = useState('');
  const [positions, setPositions] = useState([]); // array of {Id, Name}
  const [roleAssignments, setRoleAssignments] = useState({}); // roleName -> cnic
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [createdPanelId, setCreatedPanelId] = useState(null);
  const [nominationOpen, setNominationOpen] = useState(false);
  const [nominationStartDate, setNominationStartDate] = useState(null);
  const [nominationEndDate, setNominationEndDate] = useState(null);
  const [currentNominationId, setCurrentNominationId] = useState(null);
  const [alreadyNominated, setAlreadyNominated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [panelMemberCnics, setPanelMemberCnics] = useState(new Set());
  const [openRoleDropdown, setOpenRoleDropdown] = useState(null);

  const handleCreatePanel = async () => {
    // Require a full, unique set of assignments before panel creation.
    if (!panelName) {
      alert('Please fill out panel name');
      return;
    }

    if (!user.nhcId) {
      alert('Your NHC information is not available. Please update your profile.');
      return;
    }

    if (!nominationOpen) {
      alert('Nominations are not open today for your NHC.');
      return;
    }

    if (alreadyNominated) {
      alert('You are already associated with a panel.');
      return;
    }

    // Build member assignments excluding the president role.
    const assignments = [];
    for (const pos of positions) {
      if (pos.Name === 'President') continue;
      const sel = roleAssignments[pos.Name];
      if (!sel) {
        alert(`Please select a member for position ${pos.Name}`);
        return;
      }
      if (panelMemberCnics.has(sel)) {
        alert(`The selected ${pos.Name} is already part of another panel. Please choose someone else.`);
        return;
      }
      assignments.push({ cnic: sel, role: pos.Name });
    }

    // Prevent the same member from occupying multiple roles.
    const cnicSet = new Set(assignments.map(a => String(a.cnic)));
    if (cnicSet.size !== assignments.length) {
      alert('Duplicate CNICs selected for different roles.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPanel({
        panelName,
        presidentCnic: user.cnic,
        nhcId: user.nhcId,
        members: assignments,
        nominationId: currentNominationId
      });
      setSuccessMessage(`✅ Panel created and invitations sent! Waiting for members to accept; you will be redirected when the panel is approved.`);
      setAlreadyNominated(true);
      setCreatedPanelId(result.panelId || null);
    } catch (err) {
      console.error('Panel creation error:', err);
      const msg = err && err.message ? err.message : '';
      if (msg.toLowerCase().includes('already')) {
        alert('You have already created a panel or nomination exists');
        setAlreadyNominated(true);
      } else if (msg.toLowerCase().includes('nomination') && msg.toLowerCase().includes('open')) {
        alert('Nominations are not open today for your NHC');
        setNominationOpen(false);
      } else {
        alert('Failed to create panel: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    const loadState = async () => {
      setLoading(true);
      try {
        if (!user || !user.nhcId) {
          setNominationOpen(false);
          setAlreadyNominated(false);
          return;
        }

        // Determine the active nomination window for this NHC.
        const nominations = await getNominations(user.nhcId);
        const nhcRecords = (nominations || []); // Backend now filters by nhcId
        let record = null;
        if (nhcRecords.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const withDates = nhcRecords.map(r => {
            const startStr = String(r.NominationStartDate || r.NominationStart || r.StartDate || '').split('T')[0];
            const endStr = String(r.NominationEndDate || r.NominationEnd || r.EndDate || '').split('T')[0];
            if (!startStr || !endStr) return null;
            const [sy, sm, sd] = startStr.split('-').map(Number);
            const [ey, em, ed] = endStr.split('-').map(Number);
            const startDate = new Date(sy, sm - 1, sd);
            const endDate = new Date(ey, em - 1, ed);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            return { raw: r, startDate, endDate };
          }).filter(Boolean);
          const active = withDates.find(p => today >= p.startDate && today <= p.endDate);
          if (active) {
            record = active.raw;
          } else if (withDates.length > 0) {
            withDates.sort((a, b) => b.startDate - a.startDate);
            record = withDates[0].raw;
          } else {
            record = nhcRecords[0];
          }
        }

        if (record && (record.NominationStartDate || record.NominationEndDate)) {
          const startDateStr = String(record.NominationStartDate || record.NominationStart || '').split('T')[0];
          const endDateStr = String(record.NominationEndDate || record.NominationEnd || '').split('T')[0];
          const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
          const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
          const startDate = new Date(startYear, startMonth - 1, startDay);
          const endDate = new Date(endYear, endMonth - 1, endDay);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isWithinRange = today >= startDate && today <= endDate;
          setNominationOpen(isWithinRange);
          setNominationStartDate(record.NominationStartDate || record.NominationStart || null);
          setNominationEndDate(record.NominationEndDate || record.NominationEnd || null);
          setCurrentNominationId(record.Id || null);
        } else {
          setNominationOpen(false);
          setNominationStartDate(null);
          setNominationEndDate(null);
          setCurrentNominationId(null);
        }

        // See whether the user is already tied to a panel in this cycle.
        try {
          const panels = await getPanels({ cnic: user.cnic, nhcId: user.nhcId, nominationId: record?.Id || null });
          setAlreadyNominated((panels || []).length > 0);
        } catch (pmErr) {
          console.error('Failed to check panels', pmErr);
          setAlreadyNominated(false);
        }

        // Load members available for nomination assignment.
        try {
          const members = await getNHCMembers(user.nhcId);
          setAvailableMembers(members || []);
        } catch (memErr) {
          console.error('Failed to load NHC members', memErr);
          setAvailableMembers([]);
        }

        // Load positions so the form can build the dynamic role inputs.
        try {
          const pos = await getPositions();
          setPositions(pos || []);
          // initialize assignment map for new roles (leave existing values if any)
          const assign = {};
          (pos || []).forEach(p => {
            if (p.Name && !assign[p.Name]) assign[p.Name] = '';
          });
          setRoleAssignments(assign);
        } catch (posErr) {
          console.error('Failed to load positions', posErr);
          setPositions([]);
        }

        // Exclude members already used in other panels for the cycle.
        try {
          const allPanels = await getPanels({ nhcId: user.nhcId, nominationId: record?.Id || null });
          const panelCnics = new Set();
          for (const panel of (allPanels || [])) {
            try {
              const members = await getPanelMembers(panel.Id);
              if (members) {
                members.forEach(member => {
                  panelCnics.add(member.CNIC);
                });
              }
              // also add the president
              if (panel.PresidentCNIC) {
                panelCnics.add(panel.PresidentCNIC);
              }
            } catch (memberErr) {
              console.error(`Failed to load members for panel ${panel.Id}`, memberErr);
            }
          }
          setPanelMemberCnics(panelCnics);
        } catch (panelErr) {
          console.error('Failed to load panels for filtering', panelErr);
          setPanelMemberCnics(new Set());
        }
      } catch (err) {
        console.error('Failed to load nomination state', err);
        setNominationOpen(false);
        setAlreadyNominated(false);
      } finally {
        setLoading(false);
      }
    };
    loadState();
  }, [user]);

  // helper flags for form validity and button state
  const nonPresidentRoles = positions.filter(p => p.Name !== 'President');
  const missingRole = nonPresidentRoles.some(p => !roleAssignments[p.Name]);
  const conflictRole = nonPresidentRoles.some(p => panelMemberCnics.has(roleAssignments[p.Name] || ''));

  useEffect(() => {
    const handleDocumentClick = () => setOpenRoleDropdown(null);
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const getMemberDisplayName = (member) => {
    if (!member) return '';
    return `${member.FirstName || ''} ${member.LastName || ''}`.trim() || member.CNIC || '';
  };

  const getMemberProfileSrc = (member) => member?.profileImage || member?.ProfileImage || '';

  const isMemberAssignedElsewhere = (member, currentRole) => {
    if (!member) return false;
    return Object.entries(roleAssignments).some(([role, cnic]) => role !== currentRole && String(cnic) === String(member.CNIC));
  };

  // when a panel is created, poll its status until approved
  useEffect(() => {
    if (!createdPanelId) return;
    let interval = null;
    const check = async () => {
      try {
        const panels = await getPanels({ nhcId: user.nhcId }); // get panels for this NHC
        const panel = (panels || []).find(p => p.Id === createdPanelId);
        if (panel && panel.Status === 'approved') {
          clearInterval(interval);
          // redirect user to support/nomination page
          onBack('nomination');
        }
      } catch (err) {
        console.error('Failed to poll panel status', err);
      }
    };
    interval = setInterval(check, 5000);
    // run immediately once
    check();
    return () => clearInterval(interval);
  }, [createdPanelId, onBack]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#1f2937' }}>🎯 Panel Nomination</h2>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div style={{
            backgroundColor: '#dcfce7',
            border: '2px solid #10b981',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            color: '#166534',
            textAlign: 'center'
          }}>
            {successMessage}
          </div>
        )}

        {/* CONTENT */}
        {!successMessage && (
          <div>
            {/* INFO / STATUS MESSAGE */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Checking nomination status...</div>
            ) : alreadyNominated ? (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '2px solid #10b981',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                color: '#065f46'
              }}>
                ✅ You are already part of a panel for this NHC.
              </div>
            ) : nominationOpen ? (
              <div style={{
                backgroundColor: '#eff6ff',
                border: '2px solid #0ea5e9',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                color: '#0369a1'
              }}>
                💡 Nominations are open today. Select your preferred position. You'll need 10 votes from your NHC members to become eligible.
              </div>
            ) : (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                color: '#92400e'
              }}>
                ⚠️ Nominations are not open currently for your NHC.
                {nominationStartDate && nominationEndDate && (
                  <div style={{ marginTop: 8, fontSize: '13px' }}>
                    📅 Nomination period: {new Date(nominationStartDate).toLocaleDateString()} to {new Date(nominationEndDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* PANEL DETAILS FORM */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937'
              }}>Panel Name (optional)</label>
              <input
                type="text"
                value={panelName}
                onChange={e => setPanelName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}
              />

              {panelMemberCnics.size > 0 && (
                <div style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#92400e'
                }}>
                  ℹ️ {panelMemberCnics.size} member(s) are already part of other panels and cannot be selected.
                </div>
              )}

              {positions.filter(p => p.Name !== 'President').map(pos => {
                const selectedCnic = roleAssignments[pos.Name] || '';
                const selectedMember = availableMembers.find(member => String(member.CNIC) === String(selectedCnic));
                return (
                  <div key={pos.Name} style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>{pos.Name}</label>
                    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenRoleDropdown(openRoleDropdown === pos.Name ? null : pos.Name); }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          backgroundColor: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '14px',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selectedMember ? (
                            <img src={getMemberProfileSrc(selectedMember)} alt="Member" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
                          ) : (
                            <span style={{ fontWeight: '700', color: '#64748b' }}>👤</span>
                          )}
                        </div>
                        <div style={{ flex: 1, color: selectedMember ? '#111827' : '#6b7280' }}>
                          {selectedMember ? `${getMemberDisplayName(selectedMember)} (${selectedMember.CNIC})` : `-- Select ${pos.Name} --`}
                        </div>
                        <span style={{ marginLeft: 'auto', color: '#9ca3af' }}>{openRoleDropdown === pos.Name ? '▴' : '▾'}</span>
                      </button>

                      {openRoleDropdown === pos.Name && (
                        <div style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          left: 0,
                          right: 0,
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
                          zIndex: 50,
                          maxHeight: '240px',
                          overflowY: 'auto'
                        }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ padding: '6px' }}>
                            {availableMembers.filter(member => !panelMemberCnics.has(member.CNIC) && member.CNIC !== user.cnic && !isMemberAssignedElsewhere(member, pos.Name)).map(member => (
                              <div
                                key={`opt-${pos.Name}-${member.CNIC}`}
                                onClick={() => {
                                  setRoleAssignments(prev => ({ ...prev, [pos.Name]: member.CNIC }));
                                  setOpenRoleDropdown(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {getMemberProfileSrc(member) ? (
                                      <img src={getMemberProfileSrc(member)} alt="Member" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
                                  ) : (
                                    <span style={{ fontWeight: '700', color: '#64748b' }}>{`${(member.FirstName || '').charAt(0)}${(member.LastName || '').charAt(0)}` || '👤'}</span>
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#111827' }}>{getMemberDisplayName(member)}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{member.CNIC}</div>
                                </div>
                              </div>
                            ))}
                            {availableMembers.filter(member => !panelMemberCnics.has(member.CNIC) && member.CNIC !== user.cnic && !isMemberAssignedElsewhere(member, pos.Name)).length === 0 && (
                              <div style={{ padding: '10px', color: '#6b7280' }}>No members available for selection.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ACTION BUTTONS */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px'
            }}>
              <button
                onClick={handleCreatePanel}
                disabled={missingRole || conflictRole || isSubmitting || !nominationOpen || alreadyNominated || loading}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  backgroundColor: (missingRole || conflictRole || isSubmitting || !nominationOpen || alreadyNominated || loading) ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: (missingRole || conflictRole || isSubmitting || !nominationOpen || alreadyNominated || loading) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (missingRole || conflictRole || isSubmitting || !nominationOpen || alreadyNominated || loading) return;
                  e.target.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  if (missingRole || conflictRole || isSubmitting || !nominationOpen || alreadyNominated || loading) return;
                  e.target.style.backgroundColor = '#10b981';
                }}
              >
                {isSubmitting ? 'Submitting...' : (!nominationOpen ? 'Nominations Closed' : (alreadyNominated ? 'Already Created Panel' : (conflictRole ? 'Member Already in Panel' : 'Create Panel')))}
              </button>
              <button
                onClick={onBack}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ef4444';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfNominationForm;
