// src/api.js

const API_URL = "http://localhost:3001/api";

export const getNHCList = async () => {
  const response = await fetch(`${API_URL}/nhc`);
  return response.json();
};

export const createNHC = async (nhcData) => {
  const response = await fetch(`${API_URL}/nhc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nhcData)
  });
  return response.json();
};

export const signUpUser = async (userData) => {
  const response = await fetch(`${API_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
};

export const loginUser = async (cnic, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnic, password })
  });
  return response.json();
};

export const updateUser = async (cnic, updatedData) => {
  const response = await fetch(`${API_URL}/user`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnic, ...updatedData })
  });
  return response.json();
};

export const uploadProfileImage = async (cnic, imageBase64) => {
  const response = await fetch(`${API_URL}/user-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnic, profileImage: imageBase64 })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload profile image');
  }
  return response.json();
};

export const getAllUsers = async () => {
  const response = await fetch(`${API_URL}/users`);
  return response.json();
};

export const deleteUserById = async (id) => {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete user');
  }
  return response.json();
};

export const getCommitteeSettings = async () => {
  const response = await fetch(`${API_URL}/committee-settings`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch committee settings');
  }
  return response.json();
};

export const sendRequest = async (requestData) => {
  const response = await fetch(`${API_URL}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });
  return response.json();
};

// --- ADD THESE TWO NEW FUNCTIONS ---
export const sendNotification = async (data) => {
  const response = await fetch(`${API_URL}/notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const getNotifications = async (cnic, nhcCode) => {
  let url = `${API_URL}/notifications?cnic=${cnic}`;
  if (nhcCode) {
    url += `&nhcCode=${encodeURIComponent(nhcCode)}`;
  }
  const response = await fetch(url);
  return response.json();
};

export const getPositions = async () => {
  const response = await fetch(`${API_URL}/positions`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch positions');
  }
  return response.json();
};

export const createPosition = async (name) => {
  const response = await fetch(`${API_URL}/positions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create position');
  }
  return response.json();
};

export const getRequests = async () => {
  const response = await fetch(`${API_URL}/requests`);
  return response.json();
};

export const getUser = async (cnic) => {
  const response = await fetch(`${API_URL}/user?cnic=${cnic}`);
  return response.json();
};

export const assignRequest = async (requestId, nhcCode) => {
  const response = await fetch(`${API_URL}/request/assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, nhcCode })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to assign request');
  }
  return response.json();
};

export const setNominationDate = async (nhcId, nominationStartDate, nominationEndDate) => {
  const payload = { nhcId, nominationStartDate, nominationEndDate };
  console.log("🔵 API: setNominationDate called with:", payload);
  const response = await fetch(`${API_URL}/nhc/nomination`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json();
    console.error("🔴 API Error Response:", error);
    throw new Error(error.error || 'Failed to set nomination date');
  }
  const data = await response.json();
  console.log("🟢 API Success Response:", data);
  return data;
};

export const deleteNominationDate = async (nhcId) => {
  console.log("🔵 API: deleteNominationDate called with nhcId:", nhcId);
  const response = await fetch(`${API_URL}/nhc/nomination/${nhcId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const error = await response.json();
    console.error("🔴 API Error Response:", error);
    throw new Error(error.error || 'Failed to delete nomination date');
  }
  const data = await response.json();
  console.log("🟢 API Success Response:", data);
  return data;
};

export const setElectionDate = async (nhcId, electionStartDate, electionEndDate) => {
  const payload = { nhcId, electionStartDate, electionEndDate };
  console.log("🔵 API: setElectionDate called with:", payload);
  const response = await fetch(`${API_URL}/nhc/election`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json();
    console.error("🔴 API Error Response:", error);
    throw new Error(error.error || 'Failed to set election date');
  }
  const data = await response.json();
  console.log("🟢 API Success Response:", data);
  return data;
};

export const deleteElectionDate = async (nhcId) => {
  console.log("🔵 API: deleteElectionDate called with nhcId:", nhcId);
  const response = await fetch(`${API_URL}/nhc/election/${nhcId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const error = await response.json();
    console.error("🔴 API Error Response:", error);
    throw new Error(error.error || 'Failed to delete election date');
  }
  const data = await response.json();
  console.log("🟢 API Success Response:", data);
  return data;
};

export const getNominations = async (nhcId = null) => {
  let url = `${API_URL}/nominations`;
  if (nhcId) {
    url += `?nhcId=${nhcId}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch nominations');
  }
  return response.json();
};

export const getElections = async (nhcId = null) => {
  let url = `${API_URL}/elections`;
  if (nhcId) {
    url += `?nhcId=${nhcId}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch elections');
  }
  return response.json();
};

export const getCandidates = async (nhcId, supporterCnic, eligibleOnly = false) => {
  let url = `${API_URL}/candidates?nhcId=${nhcId}`;
  if (supporterCnic) url += `&supporterCnic=${encodeURIComponent(supporterCnic)}`;
  if (eligibleOnly) url += '&eligible=true';
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch candidates');
  }
  return response.json();
};

// deprecated: individual nomination disabled
export const nominateSelf = async () => {
  throw new Error('Individual self-nomination is disabled. Use createPanel instead.');
};

export const getNHCMembers = async (nhcId) => {
  const response = await fetch(`${API_URL}/nhc/${nhcId}/members`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch NHC members');
  }
  return response.json();
};

export const getNHCMembersByCode = async (nhcCode) => {
  const response = await fetch(`${API_URL}/nhc-members-by-code/${encodeURIComponent(nhcCode)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch NHC members');
  }
  return response.json();
};

// panel APIs
export const createPanel = async ({ panelName, presidentCnic, nhcId, members, treasurerCnic, viceCnic, complaintId, description, isCommittee }) => {
  const payload = { panelName, presidentCnic, nhcId };
  // dynamic members list takes precedence; legacy fields kept for backwards compatibility
  if (members) payload.members = members;
  if (treasurerCnic) payload.treasurerCnic = treasurerCnic;
  if (viceCnic) payload.viceCnic = viceCnic;
  if (typeof complaintId !== 'undefined' && complaintId !== null && complaintId !== '') payload.complaintId = complaintId;
  if (description) payload.description = description;
  if (isCommittee) payload.isCommittee = true;
  const response = await fetch(`${API_URL}/panels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create panel');
  }
  return response.json();
};

export const acceptPanelInvite = async (panelId, cnic) => {
  const response = await fetch(`${API_URL}/panels/${panelId}/members/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnic })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to accept invitation');
  }
  return response.json();
};

export const declinePanelInvite = async (panelId, cnic) => {
  const response = await fetch(`${API_URL}/panels/${panelId}/members/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnic })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to decline invitation');
  }
  return response.json();
};

export const getPanels = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.nhcId) params.append('nhcId', filters.nhcId);
  if (filters.cnic) params.append('cnic', filters.cnic);
  if (filters.committeeOnly) params.append('committeeOnly', 'true');
  const response = await fetch(`${API_URL}/panels?${params.toString()}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch panels');
  }
  return response.json();
};

export const checkNHCHasPanel = async (nhcId) => {
  try {
    const panels = await getPanels({ nhcId });
    return Array.isArray(panels) && panels.length > 0;
  } catch (err) {
    console.error('Error checking for panels:', err);
    return false;
  }
};

export const getPanelMembers = async (panelId) => {
  const response = await fetch(`${API_URL}/panels/${panelId}/members`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch panel members');
  }
  return response.json();
};

export const scheduleCommitteeMeeting = async ({ panelId, meetingDate, meetingTime, reason, scheduledByCnic }) => {
  const url = `${API_URL}/panels/${panelId}/schedule-meeting`;
  console.log('🔵 API request URL:', url);
  console.log('🔵 API request payload:', { panelId, meetingDate, meetingTime, reason, scheduledByCnic });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingDate, meetingTime, reason, scheduledByCnic }),
  });
  console.log('✓ API response status:', response.status);
  
  if (!response.ok) {
    let errorText = await response.text();
    console.error('❌ API error response text:', errorText);
    try {
      const err = JSON.parse(errorText);
      throw new Error(err.error || 'Failed to schedule committee meeting');
    } catch (parseErr) {
      if (parseErr.message.includes('Failed to schedule')) throw parseErr;
      console.error('❌ Could not parse error response as JSON');
      throw new Error('Failed to schedule committee meeting');
    }
  }
  const result = await response.json();
  console.log('✓ API response data:', result);
  return result;
};

export const assignComplaintToPanel = async ({ panelId, complaintId, presidentCnic }) => {
  const response = await fetch(`${API_URL}/panels/${panelId}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ complaintId, presidentCnic })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to assign complaint to committee');
  }
  return response.json();
};

export const supportCandidate = async (candidateId, supporterCnic) => {
  const response = await fetch(`${API_URL}/candidates/${candidateId}/support`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supporterCnic })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to support candidate');
  }
  return response.json();
};

export const getCandidateEligibilityResults = async (nhcId) => {
  const response = await fetch(`${API_URL}/candidates/eligibility/results?nhcId=${nhcId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch eligibility results');
  }
  return response.json();
};

export const getCandidatesSummary = async (nhcId) => {
  const response = await fetch(`${API_URL}/candidates/summary?nhcId=${nhcId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch candidates summary');
  }
  return response.json();
};

export const getSupportHistory = async (nhcId) => {
  const response = await fetch(`${API_URL}/support-history?nhcId=${nhcId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch support history');
  }
  return response.json();
};

export const getCandidateSupporters = async (candidateId) => {
  const response = await fetch(`${API_URL}/support-history/candidate/${candidateId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch supporter list');
  }
  return response.json();
};

export const getSupportStats = async (nhcId) => {
  const response = await fetch(`${API_URL}/support-stats?nhcId=${nhcId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch support statistics');
  }
  return response.json();
};

export const castElectionVote = async (electionId, voterCnic, candidateId) => {
  const response = await fetch(`${API_URL}/election-vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ electionId, voterCnic, candidateId })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to cast vote');
  }
  return response.json();
};

export const getElectionVoteHistory = async (electionId) => {
  const response = await fetch(`${API_URL}/election-vote-history?electionId=${electionId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch election vote history');
  }
  return response.json();
};

export const getCandidateElectionVotes = async (candidateId) => {
  const response = await fetch(`${API_URL}/election-votes/candidate/${candidateId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch candidate election votes');
  }
  return response.json();
};

export const getElectionStats = async (idOrObj) => {
  let url = `${API_URL}/election-stats`;
  if (typeof idOrObj === 'object' && idOrObj !== null) {
    if (idOrObj.nhcId) url += `?nhcId=${idOrObj.nhcId}`;
    else if (idOrObj.electionId) url += `?electionId=${idOrObj.electionId}`;
  } else if (typeof idOrObj === 'number' || (typeof idOrObj === 'string' && /^[0-9]+$/.test(idOrObj))) {
    // default to electionId for backward compatibility
    url += `?electionId=${idOrObj}`;
  } else {
    throw new Error('Invalid parameter for getElectionStats');
  }

  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch election statistics');
  }
  return response.json();
};

export const getPastElectionResults = async (nhcId) => {
  const url = `${API_URL}/election-results/${nhcId}`;
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No past election results found');
  }
  return response.json();
};

export const uploadProfilePicture = async (cnic, file) => {
  const formData = new FormData();
  formData.append('profilePic', file);
  formData.append('cnic', cnic);

  const response = await fetch(`${API_URL}/upload-profile-pic`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload profile picture');
  }
  return response.json();
};

export const submitComplaint = async (formData) => {
  const response = await fetch(`${API_URL}/complaint`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit complaint');
  }
  return response.json();
};

export const getAllComplaints = async () => {
  const response = await fetch(`${API_URL}/complaints`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch all complaints');
  }
  return response.json();
};

export const getComplaintsByNHC = async (nhcCode) => {
  const response = await fetch(`${API_URL}/complaints-by-nhc/${encodeURIComponent(nhcCode)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch complaints');
  }
  return response.json();
};

export const getComplaintHistory = async (complaintId, actorCnic) => {
  const response = await fetch(`${API_URL}/complaints/${complaintId}/history?actorCnic=${encodeURIComponent(actorCnic)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch complaint history');
  }
  return response.json();
};

export const getComplaintsByUser = async (userCnic, nhcCode = null) => {
  let url = `${API_URL}/complaints/${userCnic}`;
  if (nhcCode) {
    url += `?nhcCode=${encodeURIComponent(nhcCode)}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch your complaints');
  }
  return response.json();
};

export const saveCommitteeMeetingDecision = async ({ complaintId, remarks, status, decision, minutesFile, actorCnic, budgetAmount, budgetReason, moreWorkNeeded, resolutionDescription }) => {
  const formData = new FormData();
  if (remarks) formData.append('remarks', remarks);
  if (status) formData.append('status', status);
  if (decision) formData.append('decision', decision);
  if (minutesFile) formData.append('minutesPdf', minutesFile);
  if (actorCnic) formData.append('actorCnic', actorCnic);
  if (budgetAmount) formData.append('budgetAmount', budgetAmount);
  if (budgetReason) formData.append('budgetReason', budgetReason);
  if (moreWorkNeeded) formData.append('moreWorkNeeded', moreWorkNeeded);
  if (resolutionDescription) formData.append('resolutionDescription', resolutionDescription);

  const response = await fetch(`${API_URL}/complaints/${complaintId}/committee-meeting`, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save meeting decision');
  }
  return response.json();
};

// Suggestion APIs
export const createSuggestion = async ({ userCnic, userName, nhcCode, title, description }) => {
  const response = await fetch(`${API_URL}/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userCnic, userName, nhcCode, title, description })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit suggestion');
  }
  return response.json();
};

export const getSuggestionsByNHC = async (nhcCode) => {
  const response = await fetch(`${API_URL}/suggestions-by-nhc/${nhcCode}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch suggestions');
  }
  return response.json();
};

export const getSuggestionsByUser = async (userCnic) => {
  const response = await fetch(`${API_URL}/suggestions/${userCnic}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch your suggestions');
  }
  return response.json();
};

export const updateSuggestionStatus = async (id, status, nhcCode) => {
  const response = await fetch(`${API_URL}/suggestions/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, nhcCode })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update suggestion status');
  }
  return response.json();
};

// Get NHC-specific role for user
export const getUserRoleInNHC = async (cnic, nhcCode) => {
  const response = await fetch(`${API_URL}/user-role?cnic=${encodeURIComponent(cnic)}&nhcCode=${encodeURIComponent(nhcCode)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch user role for this NHC');
  }
  return response.json();
};

// Budget Management APIs
export const getBudgetRequests = async (nhcCode) => {
  const response = await fetch(`${API_URL}/complaints-by-nhc/${encodeURIComponent(nhcCode)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch budget requests');
  }
  const allComplaints = await response.json();
  return (allComplaints || []).filter((c) => {
    const hasBudget =
      String(c.HasBudget || '').toLowerCase() === '1' ||
      c.HasBudget === true ||
      String(c.HasBudget).toLowerCase() === 'true';
    const isBudgetDecision = String(c.MeetingDecision || '').toLowerCase().trim() === 'budget';
    return hasBudget && isBudgetDecision;
  });
};

export const getBudgetStats = async (nhcCode) => {
  const response = await fetch(`${API_URL}/budget-stats/${encodeURIComponent(nhcCode)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch budget statistics');
  }
  return response.json();
};

export const getBudgetAvailable = async (nhcCode) => {
  const response = await fetch(`${API_URL}/budget-available/${encodeURIComponent(nhcCode)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch available budget');
  }
  return response.json();
};

export const getBudgetHistory = async (nhcCode, cnic) => {
  const response = await fetch(`${API_URL}/budget-history/${encodeURIComponent(nhcCode)}?cnic=${encodeURIComponent(cnic)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch budget history');
  }
  return response.json();
};

export const setBudgetAvailable = async (nhcCode, availableBudget) => {
  const response = await fetch(`${API_URL}/budget-available/${encodeURIComponent(nhcCode)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ availableBudget })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update available budget');
  }
  return response.json();
};

export const allocateBudget = async (complaintId, treasurerCnic, allocatedAmount, budgetCategory) => {
  const response = await fetch(`${API_URL}/complaints/${complaintId}/allocate-budget`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      allocatedAmount,
      budgetCategory,
      treasurerCnic,
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to allocate budget');
  }
  return response.json();
};

export const releaseBudget = async (complaintId, treasurerCnic, allocatedAmount = null, budgetCategory = null) => {
  const payload = { treasurerCnic };
  if (allocatedAmount !== null) payload.allocatedAmount = allocatedAmount;
  if (budgetCategory) payload.budgetCategory = budgetCategory;

  const response = await fetch(`${API_URL}/complaints/${complaintId}/release-budget`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to release budget');
  }
  return response.json();
};

export const rejectBudget = async (complaintId, treasurerCnic, rejectionReason) => {
  const response = await fetch(`${API_URL}/complaints/${complaintId}/reject-budget`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rejectionReason,
      treasurerCnic
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reject budget request');
  }
  return response.json();
};

export const approveBudgetRequest = async (complaintId, presidentCnic, presidentComments = '') => {
  const response = await fetch(`${API_URL}/complaints/${complaintId}/president-approval`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'approve',
      presidentCnic,
      presidentComments
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to approve budget request');
  }
  return response.json();
};

export const rejectBudgetRequest = async (complaintId, presidentCnic, presidentComments = '') => {
  const response = await fetch(`${API_URL}/complaints/${complaintId}/president-approval`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'reject',
      presidentCnic,
      presidentComments
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reject budget request');
  }
  return response.json();
};

export const requestBudgetChanges = async (complaintId, presidentCnic, presidentComments = '') => {
  const response = await fetch(`${API_URL}/complaints/${complaintId}/president-approval`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'request-changes',
      presidentCnic,
      presidentComments
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to request budget changes');
  }
  return response.json();
};
