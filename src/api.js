// src/api.js

const API_URL = "http://localhost:3001/api";

// Base API URL for the backend server.
// All fetch calls use this base and append the endpoint path.
// If the backend port or host changes, update this constant.

// NHC zone APIs
// getNHCList returns all neighborhood council boundaries used by the map and NHC selector.
export const getNHCList = async () => {
  const response = await fetch(`${API_URL}/nhc`);
  return response.json();
};

// createNHC sends the new NHC zone data to the backend for storage.
// nhcData should include the NHC name and points array describing the boundary.
export const createNHC = async (nhcData) => {
  const response = await fetch(`${API_URL}/nhc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nhcData)
  });
  return response.json();
};

// Authentication APIs
// signUpUser sends registration data to the backend and returns the created user record or error details.
export const signUpUser = async (userData) => {
  const response = await fetch(`${API_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
};

// loginUser sends login credentials and returns session information or authentication failure.
export const loginUser = async (cnic, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnic, password })
  });
  return response.json();
};

// User profile management APIs
// updateUser updates the stored user profile fields for a CNIC.
export const updateUser = async (cnic, updatedData) => {
  const response = await fetch(`${API_URL}/user`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnic, ...updatedData })
  });
  return response.json();
};

// Upload APIs
// uploadProfileImage sends a base64 encoded profile picture to the backend.
// The server saves the image and updates the user's profile record.
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

// Admin and management APIs
// getAllUsers retrieves the full list of users from the backend.
export const getAllUsers = async () => {
  const response = await fetch(`${API_URL}/users`);
  return response.json();
};

// Admin APIs
// deleteUserById removes a user and returns the backend response.
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

// Committee configuration APIs
// getCommitteeSettings returns the global committee policy settings.
export const getCommitteeSettings = async () => {
  const response = await fetch(`${API_URL}/committee-settings`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch committee settings');
  }
  return response.json();
};

// Citizen request APIs
// sendRequest creates a new service or change request in the system.
export const sendRequest = async (requestData) => {
  const response = await fetch(`${API_URL}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });
  return response.json();
};

// Notification APIs
// sendNotification sends a notification payload to the backend, which stores it for the recipient.
export const sendNotification = async (data) => {
  const response = await fetch(`${API_URL}/notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// getNotifications reads notifications for a user, optionally filtered by NHC.
// The backend returns unread/new alerts for the user.
export const getNotifications = async (cnic, nhcCode) => {
  let url = `${API_URL}/notifications?cnic=${cnic}`;
  if (nhcCode) {
    url += `&nhcCode=${encodeURIComponent(nhcCode)}`;
  }
  const response = await fetch(url);
  return response.json();
};

// Election configuration APIs
// getPositions retrieves election positions such as President, Treasurer, etc.
export const getPositions = async () => {
  const response = await fetch(`${API_URL}/positions`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch positions');
  }
  return response.json();
};

// createPosition adds a new leadership position into the election configuration.
// This is used during setup or when adding more roles.
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

// Request handling APIs
// getRequests loads all submitted citizen requests for admin review.
export const getRequests = async () => {
  const response = await fetch(`${API_URL}/requests`);
  return response.json();
};

// getUser reads profile data for a specific CNIC.
// It is used by profile screens and member detail views.
export const getUser = async (cnic) => {
  const response = await fetch(`${API_URL}/user?cnic=${cnic}`);
  return response.json();
};

// assignRequest updates a request with the assigned NHC code.
// This is used when an admin routes a request to a specific council.
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

// Council change request APIs
// These functions allow members to request a transfer to another NHC
// and allow admins to approve or reject those requests.
export const submitCouncilChangeRequest = async (requestData) => {
  const response = await fetch(`${API_URL}/council-change-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to submit council change request');
  }
  return response.json();
};

export const getCouncilChangeRequests = async () => {
  const response = await fetch(`${API_URL}/council-change-requests`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch council change requests');
  }
  return response.json();
};

export const approveCouncilChangeRequest = async (requestId, adminCnic) => {
  // Approve a member's request to move from one NHC to another.
  const response = await fetch(`${API_URL}/council-change-request/${requestId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminCnic })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to approve council change request');
  }
  return response.json();
};

export const rejectCouncilChangeRequest = async (requestId, adminCnic, reason = '') => {
  // Reject a council change request with an optional reason.
  const response = await fetch(`${API_URL}/council-change-request/${requestId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminCnic, reason })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to reject council change request');
  }
  return response.json();
};

// Nomination and election scheduling APIs
// setNominationDate sets the nomination window for an NHC.
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

// deleteNominationDate ends an active nomination window by notifying the backend.
// The backend will keep historical nomination records, but stop current nomination activity.
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

// setElectionDate schedules the election window for an NHC.
// This is used once nomination is complete and voting can begin.
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

// deleteElectionDate cancels or ends an election period for the selected NHC.
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

// Nomination and election data APIs
// getNominations fetches nomination periods, optionally for one NHC.
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

// getElections returns the election windows for the selected NHC.
// The frontend can use this to display active, past, or upcoming elections.
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

// Candidate APIs
// Fetch candidate data for the current NHC and optionally filter by supporter or eligibility.
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

// nominateSelf is intentionally disabled in the current flow.
// Candidate selection has moved to the createPanel workflow.
export const nominateSelf = async () => {
  throw new Error('Individual self-nomination is disabled. Use createPanel instead.');
};

// Member list APIs
// getNHCMembers retrieves members for a specific NHC by its database id.
export const getNHCMembers = async (nhcId) => {
  const response = await fetch(`${API_URL}/nhc/${nhcId}/members`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch NHC members');
  }
  return response.json();
};

export const getNHCMembersByCode = async (nhcCode) => {
  // Fetch members by NHC code so we can load member lists even when only the code is known.
  const response = await fetch(`${API_URL}/nhc-members-by-code/${encodeURIComponent(nhcCode)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch NHC members');
  }
  return response.json();
};

// Panel and committee APIs
// createPanel creates a new elected or appointed committee panel.
// This payload supports both dynamic member lists and legacy president/treasurer/vice fields.
export const createPanel = async ({ panelName, presidentCnic, nhcId, members,Category, treasurerCnic, viceCnic, complaintId, description, isCommittee, nominationId }) => {
  const payload = { panelName, presidentCnic, nhcId };
  // dynamic members list takes precedence; legacy fields kept for backwards compatibility
  if (members) payload.members = members;
  if (treasurerCnic) payload.treasurerCnic = treasurerCnic;
  if (viceCnic) payload.viceCnic = viceCnic;
  if (typeof complaintId !== 'undefined' && complaintId !== null && complaintId !== '') payload.complaintId = complaintId;
  if (description) payload.description = description;
  if (isCommittee) payload.isCommittee = true;
  if (nominationId) payload.nominationId = nominationId;
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

// acceptPanelInvite lets a member confirm their invitation to join the panel.
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

// declinePanelInvite rejects a panel invitation for the given member.
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

// updatePanelSettings updates panel configuration options (e.g., cascadeDeleteOnWithdraw).
export const updatePanelSettings = async (panelId, settings) => {
  const response = await fetch(`${API_URL}/panels/${panelId}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update panel settings');
  }
  return response.json();
};

// getPanels loads panel records with optional filters for NHC, member CNIC, nomination period, or committee only.
export const getPanels = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.nhcId) params.append('nhcId', filters.nhcId);
  if (filters.cnic) params.append('cnic', filters.cnic);
  if (filters.nominationId) params.append('nominationId', filters.nominationId);
  if (filters.committeeOnly) params.append('committeeOnly', 'true');
  const response = await fetch(`${API_URL}/panels?${params.toString()}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch panels');
  }
  return response.json();
};

// checkNHCHasPanel is a helper that returns true when at least one panel exists for an NHC.
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
  // Fetch the member list for a committee panel.
  const response = await fetch(`${API_URL}/panels/${panelId}/members`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch panel members');
  }
  return response.json();
};

// Meeting and committee scheduling APIs
// scheduleCommitteeMeeting sends meeting details for a specific panel.
export const scheduleCommitteeMeeting = async ({ panelId, complaintId, meetingDate, meetingTime, reason, scheduledByCnic }) => {
  const url = `${API_URL}/panels/${panelId}/schedule-meeting`;
  console.log('🔵 API request URL:', url);
  console.log('🔵 API request payload:', { panelId, complaintId, meetingDate, meetingTime, reason, scheduledByCnic });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ complaintId, meetingDate, meetingTime, reason, scheduledByCnic }),
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

// assignComplaintToPanel attaches a complaint to a specific panel for review.
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

// Candidate support APIs
// supportCandidate records a public endorsement for a candidate.
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

// withdrawSupport removes the user's endorsement for a candidate.
export const withdrawSupport = async (candidateId, supporterCnic) => {
  const response = await fetch(`${API_URL}/candidates/${candidateId}/support`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supporterCnic })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to withdraw support');
  }
  return response.json();
};

// getCandidateEligibilityResults returns candidate eligibility state for the NHC.
// This can be used during nomination and candidate validation flows.
export const getCandidateEligibilityResults = async (nhcId) => {
  const response = await fetch(`${API_URL}/candidates/eligibility/results?nhcId=${nhcId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch eligibility results');
  }
  return response.json();
};

// getCandidatesSummary returns aggregated candidate counts and summary metrics.
export const getCandidatesSummary = async (nhcId) => {
  const response = await fetch(`${API_URL}/candidates/summary?nhcId=${nhcId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch candidates summary');
  }
  return response.json();
};

// getSupportHistory returns the history of candidate support actions in the NHC.
export const getSupportHistory = async (nhcId) => {
  const response = await fetch(`${API_URL}/support-history?nhcId=${nhcId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch support history');
  }
  return response.json();
};

// getCandidateSupporters returns the list of users who have supported a candidate.
export const getCandidateSupporters = async (candidateId) => {
  const response = await fetch(`${API_URL}/support-history/candidate/${candidateId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch supporter list');
  }
  return response.json();
};

// getSupportStats returns aggregated support counts and popularity statistics.
export const getSupportStats = async (nhcId) => {
  const response = await fetch(`${API_URL}/support-stats?nhcId=${nhcId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch support statistics');
  }
  return response.json();
};

// Voting APIs
// castElectionVote submits a vote for a candidate in an election.
// The backend validates voter eligibility and updates vote counts.
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

// getElectionVoteHistory returns the vote records for a completed election.
export const getElectionVoteHistory = async (electionId) => {
  const response = await fetch(`${API_URL}/election-vote-history?electionId=${electionId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch election vote history');
  }
  return response.json();
};

// getCandidateElectionVotes fetches total votes for one candidate.
export const getCandidateElectionVotes = async (candidateId) => {
  const response = await fetch(`${API_URL}/election-votes/candidate/${candidateId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch candidate election votes');
  }
  return response.json();
};

// getElectionStats returns either NHC-wide statistics or specific election metrics.
// The helper supports both object and scalar parameters for compatibility.
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

// getPastElectionResults fetches historical winners and vote totals for a past election.
export const getPastElectionResults = async (nhcId) => {
  const url = `${API_URL}/election-results/${nhcId}`;
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No past election results found');
  }
  return response.json();
};

// File upload APIs
// uploadProfilePicture uploads a profile image file using FormData.
// This endpoint handles binary file transfer rather than JSON payloads.
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

// Complaint APIs
// submitComplaint sends a complaint form and attached files to the backend.
// The caller must build FormData with text fields and any attachments.
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

// getAllComplaints retrieves complaints across all NHCs for admin review.
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

export const getComplaintById = async (Category) => {
  const response = await fetch(`${API_URL}/complaint/${Category}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch complaint details');
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
// createSuggestion sends a new suggestion to the backend for review and tracking.
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

// getSuggestionsByNHC fetches suggestions submitted within one council.
export const getSuggestionsByNHC = async (nhcCode) => {
  const response = await fetch(`${API_URL}/suggestions-by-nhc/${nhcCode}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch suggestions');
  }
  return response.json();
};

// getSuggestionsByUser loads the suggestions submitted by a specific user.
export const getSuggestionsByUser = async (userCnic) => {
  const response = await fetch(`${API_URL}/suggestions/${userCnic}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch your suggestions');
  }
  return response.json();
};

// updateSuggestionStatus is used by admins to mark a suggestion as approved, rejected, or in-review.
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
// This returns the user's role within a council, such as member, president, treasurer, or committee member.
export const getUserRoleInNHC = async (cnic, nhcCode) => {
  const response = await fetch(`${API_URL}/user-role?cnic=${encodeURIComponent(cnic)}&nhcCode=${encodeURIComponent(nhcCode)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch user role for this NHC');
  }
  return response.json();
};

// Budget Management APIs
// getBudgetRequests loads complaints filtered into budget requests for one NHC.
// It reads complaint records and then filters by budget fields.
export const getBudgetRequests = async (nhcCode) => {
  const response = await fetch(`${API_URL}/complaints-by-nhc/${encodeURIComponent(nhcCode)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch budget requests');
  }
  const allComplaints = await response.json();
  return (allComplaints || []).filter((c) => {
    // Budget requests are stored as complaints with budget information.
    const hasBudget =
      String(c.HasBudget || '').toLowerCase() === '1' ||
      c.HasBudget === true ||
      String(c.HasBudget).toLowerCase() === 'true';
    const isBudgetDecision = String(c.MeetingDecision || '').toLowerCase().trim() === 'budget';
    return hasBudget && isBudgetDecision;
  });
};

// Budget statistics APIs
// getBudgetStats returns summary metrics for budget usage within an NHC.
export const getBudgetStats = async (nhcCode) => {
  const response = await fetch(`${API_URL}/budget-stats/${encodeURIComponent(nhcCode)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch budget statistics');
  }
  return response.json();
};

//getBudgetAvailable returns the remaining budget amount available for spending.
export const getBudgetAvailable = async (nhcCode) => {
const response = await fetch(`${API_URL}/budget-available/${encodeURIComponent(nhcCode)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch available budget');
  }
  return response.json();
};

// getBudgetHistory returns historical budget requests and allocation history for a user within the NHC.
export const getBudgetHistory = async (nhcCode, cnic) => {
  const response = await fetch(`${API_URL}/budget-history/${encodeURIComponent(nhcCode)}?cnic=${encodeURIComponent(cnic)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch budget history');
  }
  return response.json();
};

// setBudgetAvailable updates the total available budget for the NHC.
// This is typically performed by treasurer or admin roles.
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

// allocateBudget records a budget allocation against a complaint.
// The complaint becomes a budget request that can then be approved or rejected.
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

// releaseBudget returns or cancels an earlier allocation for a complaint.
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
  // rejectBudget records a treasurer decision to reject a budget allocation.
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

// approveBudgetRequest records the president's approval for a budget request.
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

// rejectBudgetRequest records the president's rejection of a budget request.
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

// requestBudgetChanges asks the president to request changes before budget approval.
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

// setActivePanelAsWinner updates the NHC to use the winning panel as the active leadership team.
export const setActivePanelAsWinner = async (nhcId, panelId) => {
  const response = await fetch(`${API_URL}/nhc/${nhcId}/active-panel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ panelId })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to set active panel');
  }
  return response.json();
};

// GET ACTIVE PANEL MEMBERS: returns current leadership of an NHC
// This endpoint is typically used after elections to show the officially active team.
export const getActivePanelMembers = async (nhcId) => {
  const response = await fetch(`${API_URL}/nhc/${nhcId}/active-panel-members`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch active panel members');
  }
  return response.json();
};
