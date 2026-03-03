import React, { useState, useEffect } from 'react';
import { createPanel, getNominations, getPanels, getNHCMembers, getPanelMembers, getPositions } from '../api';

const SelfNominationForm = ({ user, onBack }) => {
  const [panelName, setPanelName] = useState('');
  const [positions, setPositions] = useState([]); // array of {Id, Name}
  const [roleAssignments, setRoleAssignments] = useState({}); // roleName -> cnic
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [createdPanelId, setCreatedPanelId] = useState(null);
  const [nominationOpen, setNominationOpen] = useState(false);
  const [nominationStartDate, setNominationStartDate] = useState(null);
  const [nominationEndDate, setNominationEndDate] = useState(null);
  const [alreadyNominated, setAlreadyNominated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [panelMemberCnics, setPanelMemberCnics] = useState(new Set());

  const handleCreatePanel = async () => {
    // only allow creation if all non-president positions are assigned
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

    // build list of member assignments excluding president
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

    // ensure distinct CNICs
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
        members: assignments
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

        // determine nomination period as before
        const nominations = await getNominations();
        const nhcRecords = (nominations || []).filter(n => Number(n.NHC_Id) === Number(user.nhcId) || Number(n.NHCId) === Number(user.nhcId));
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
        } else {
          setNominationOpen(false);
          setNominationStartDate(null);
          setNominationEndDate(null);
        }

        // check if user is part of any panel already
        try {
          const panels = await getPanels({ cnic: user.cnic });
          setAlreadyNominated((panels || []).length > 0);
        } catch (pmErr) {
          console.error('Failed to check panels', pmErr);
          setAlreadyNominated(false);
        }

        // load available members in this NHC
        try {
          const members = await getNHCMembers(user.nhcId);
          setAvailableMembers(members || []);
        } catch (memErr) {
          console.error('Failed to load NHC members', memErr);
          setAvailableMembers([]);
        }

        // load positions so form can render dynamic fields
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

        // load all existing panel members to filter them out from dropdown
        try {
          const allPanels = await getPanels({ nhcId: user.nhcId });
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

  // when a panel is created, poll its status until approved
  useEffect(() => {
    if (!createdPanelId) return;
    let interval = null;
    const check = async () => {
      try {
        const panels = await getPanels({}); // get all panels for user by cnic
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
                💡 Nominations are open today. Select your preferred position. You'll need 5 votes from your NHC members to become eligible.
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

              {positions.filter(p => p.Name !== 'President').map(pos => (
                <div key={pos.Name} style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>{pos.Name}</label>
                  <select
                    value={roleAssignments[pos.Name] || ''}
                    onChange={e => setRoleAssignments(prev => ({ ...prev, [pos.Name]: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Select {pos.Name} --</option>
                    {availableMembers.map(member => (
                      !panelMemberCnics.has(member.CNIC) && member.CNIC !== user.cnic && !Object.values(roleAssignments).includes(member.CNIC) && (
                        <option key={member.CNIC} value={member.CNIC}>
                          {member.FirstName} {member.LastName} ({member.CNIC})
                        </option>
                      )
                    ))}
                  </select>
                </div>
              ))}
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
