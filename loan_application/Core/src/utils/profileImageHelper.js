/**
 * profileImageHelper.js
 * --------------------
 * Centralised utility for resolving backend profile image URLs
 * across all Sivels Finance roles (BackOffice, RM, Agent, AMS).
 *
 * Backend Endpoints:
 *   - BackOffice : GET /api/BackOfficeMaster/{backOfficeId}/profile-image
 *   - RM         : GET /api/RMMaster/{rmId}/profile-image
 *   - Agent      : GET /api/AgentMaster/{agentId}/profile-image
 *   - AMS        : GET /api/AMSMaster/{amsId}/profile-image
 */

const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'https://fusiontecsoftware.com/sivels/api'
).replace(/\/+$/, '');

/**
 * Normalized role to Master API route mapping
 */
const ROLE_ENDPOINT_MAP = {
  // BackOffice mappings
  backoffice: 'BackOfficeMaster',
  back_office: 'BackOfficeMaster',
  'back office': 'BackOfficeMaster',
  operations: 'BackOfficeMaster',
  'operations team': 'BackOfficeMaster',
  backofficemaster: 'BackOfficeMaster',

  // RM mappings
  rm: 'RMMaster',
  relationshipmanager: 'RMMaster',
  'relationship manager': 'RMMaster',
  relationship_manager: 'RMMaster',
  rmmaster: 'RMMaster',

  // Agent mappings
  agent: 'AgentMaster',
  fieldagent: 'AgentMaster',
  'field agent': 'AgentMaster',
  field_agent: 'AgentMaster',
  agentmaster: 'AgentMaster',

  // AMS mappings
  ams: 'AMSMaster',
  areamanager: 'AMSMaster',
  'area manager': 'AMSMaster',
  area_manager: 'AMSMaster',
  areaspecialist: 'AMSMaster',
  'area specialist': 'AMSMaster',
  amsmaster: 'AMSMaster',
};

/**
 * Checks if an entity ID is valid (non-empty, non-zero, not NaN).
 *
 * @param {string|number} id
 * @returns {boolean}
 */
export function isValidId(id) {
  if (id === undefined || id === null) return false;
  const str = String(id).trim();
  if (!str || str === '0' || str === 'NaN' || str === 'undefined' || str === 'null') {
    return false;
  }
  return true;
}

/**
 * Generates the full profile image URL for a given role and ID.
 *
 * @param {string} role - Entity role ('BackOffice', 'RM', 'Agent', 'AMS', etc.)
 * @param {string|number} id - Entity master ID (e.g. backOfficeId, rmId, agentId, amsId)
 * @returns {string|null} - Absolute image URL or null if role/id is invalid
 */
export function getProfileImageUrl(role, id) {
  if (!role || !isValidId(id)) {
    return null;
  }

  const normalizedRole = String(role).trim().toLowerCase();
  const endpoint = ROLE_ENDPOINT_MAP[normalizedRole];

  if (!endpoint) {
    return null;
  }

  const cleanId = encodeURIComponent(String(id).trim());
  return `${API_BASE_URL}/${endpoint}/${cleanId}/profile-image`;
}

/**
 * Extracts initials from a user's full name.
 * Default fallback: 'U'
 *
 * @param {string} name - User's full name
 * @param {string} fallback - Default fallback if name is empty
 * @returns {string} - Up to 2 uppercase initial letters
 */
export function getInitials(name, fallback = 'U') {
  const clean = String(name || '').trim();
  if (!clean) return fallback;

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0][0].toUpperCase();
  }
  return fallback;
}

export default {
  getProfileImageUrl,
  getInitials,
  isValidId,
};
