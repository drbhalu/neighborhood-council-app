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

export const getNotifications = async (cnic) => {
  const response = await fetch(`${API_URL}/notifications?cnic=${cnic}`);
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

export const getNominations = async () => {
  const response = await fetch(`${API_URL}/nominations`);
  if (!response.ok) {
    throw new Error('Failed to fetch nominations');
  }
  return response.json();
};

export const getElections = async () => {
  const response = await fetch(`${API_URL}/elections`);
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

// panel APIs
export const createPanel = async ({ panelName, presidentCnic, nhcId, members, treasurerCnic, viceCnic }) => {
  const payload = { panelName, presidentCnic, nhcId };
  // dynamic members list takes precedence; legacy fields kept for backwards compatibility
  if (members) payload.members = members;
  if (treasurerCnic) payload.treasurerCnic = treasurerCnic;
  if (viceCnic) payload.viceCnic = viceCnic;
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
  const response = await fetch(`${API_URL}/panels?${params.toString()}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch panels');
  }
  return response.json();
};

export const getPanelMembers = async (panelId) => {
  const response = await fetch(`${API_URL}/panels/${panelId}/members`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch panel members');
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
