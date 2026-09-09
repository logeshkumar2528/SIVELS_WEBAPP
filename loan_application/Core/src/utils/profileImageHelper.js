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
export function getProfileImageUrl(role, id, timestamp = null) {
  if (!role || !isValidId(id)) {
    return null;
  }

  const normalizedRole = String(role).trim().toLowerCase();
  const endpoint = ROLE_ENDPOINT_MAP[normalizedRole];

  if (!endpoint) {
    return null;
  }

  const cleanId = encodeURIComponent(String(id).trim());
  const baseUrl = `${API_BASE_URL}/${endpoint}/${cleanId}/profile-image`;
  return timestamp ? `${baseUrl}?v=${timestamp}` : baseUrl;
}

/**
 * Resolves the role-specific profile image update endpoint and HTTP method (PUT).
 *
 * Endpoints:
 * - Agent: PUT /api/AgentMaster/{agentId}/profile-image
 * - BackOffice: PUT /api/BackOfficeMaster/{backOfficeId}/profile-image
 * - RM: PUT /api/RMMaster/replace-profile-image/{rmId}
 * - AMS: PUT /api/AMSMaster/profile-image/{amsId}
 *
 * @param {string} role - Entity role ('Agent', 'BackOffice', 'RM', 'AMS')
 * @param {string|number} id - Entity primary ID
 * @returns {string|null} - Full update URL
 */
export function getProfileImageUpdateUrl(role, id) {
  if (!role || !isValidId(id)) return null;
  const normalizedRole = String(role).trim().toLowerCase();
  const cleanId = encodeURIComponent(String(id).trim());

  if (
    normalizedRole === 'agent' ||
    normalizedRole === 'fieldagent' ||
    normalizedRole === 'agentmaster' ||
    normalizedRole === 'field agent' ||
    normalizedRole === 'field_agent'
  ) {
    return `${API_BASE_URL}/AgentMaster/${cleanId}/profile-image`;
  }
  if (
    normalizedRole === 'backoffice' ||
    normalizedRole === 'back_office' ||
    normalizedRole === 'back office' ||
    normalizedRole === 'backofficemaster' ||
    normalizedRole === 'operations' ||
    normalizedRole === 'operations team'
  ) {
    return `${API_BASE_URL}/BackOfficeMaster/${cleanId}/profile-image`;
  }
  if (
    normalizedRole === 'rm' ||
    normalizedRole === 'relationshipmanager' ||
    normalizedRole === 'rmmaster' ||
    normalizedRole === 'relationship manager' ||
    normalizedRole === 'relationship_manager'
  ) {
    return `${API_BASE_URL}/RMMaster/replace-profile-image/${cleanId}`;
  }
  if (
    normalizedRole === 'ams' ||
    normalizedRole === 'areamanager' ||
    normalizedRole === 'amsmaster' ||
    normalizedRole === 'area manager' ||
    normalizedRole === 'area_manager' ||
    normalizedRole === 'areaspecialist' ||
    normalizedRole === 'area specialist'
  ) {
    return `${API_BASE_URL}/AMSMaster/profile-image/${cleanId}`;
  }
  return null;
}

/**
 * Uploads and replaces the profile image for a specific role and ID.
 * Uses role-specific PUT endpoint with multipart/form-data ('file' field).
 *
 * @param {string} role - Entity role ('Agent', 'BackOffice', 'RM', 'AMS')
 * @param {string|number} id - Entity primary ID
 * @param {File} file - Image file object
 * @returns {Promise<any>}
 */
export async function updateProfileImage(role, id, file) {
  const url = getProfileImageUpdateUrl(role, id);
  if (!url) {
    throw new Error(`Invalid role or ID for profile image update: ${role}, ${id}`);
  }

  if (!file) {
    throw new Error('No image file selected.');
  }

  // Validate MIME type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type?.toLowerCase())) {
    throw new Error('Only JPEG, PNG, or WebP images are supported.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Profile image update failed (${response.status}): ${errorText || response.statusText}`);
  }

  const timestamp = Date.now();
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('profile-image-updated', {
          detail: { role, id, timestamp },
        })
      );
    } catch {
      // ignore
    }
  }

  try {
    const data = await response.json();
    return { ...data, timestamp };
  } catch {
    return { success: true, timestamp };
  }
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

/**
 * Resolves any backend file path, relative URL, or absolute URL into a valid public URL.
 *
 * @param {string} value - Document path, relative URL, or full URL
 * @returns {string} - Resolved URL
 */
export function buildFileUrl(value) {
  if (!value) return '';

  const clean = String(value).trim();
  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:') ||
    clean.startsWith('data:')
  ) {
    return clean;
  }

  const staticBase = API_BASE_URL.replace(/\/api$/i, '');

  if (clean.startsWith('/api') || clean.startsWith('api/')) {
    const norm = clean.replace(/^\/?api\//i, '');
    return `${API_BASE_URL}/${norm}`;
  }

  const normalizedPath = clean.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${staticBase}/${normalizedPath}`;
}

/**
 * Builds the RM document download/view endpoint URL using the stored database path.
 *
 * @param {string} storedPath - e.g. "RMAadhar/ab22415c-6323-4ee5-8680-666c472cf2ca.png"
 * @returns {string|null} - URL e.g. "https://fusiontecsoftware.com/sivels/api/RMMaster/download?path=RMAadhar%2Fab22415c-6323-4ee5-8680-666c472cf2ca.png"
 */
export function getRmDocumentDownloadUrl(storedPath) {
  if (!storedPath) return null;
  const clean = String(storedPath).trim();
  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:') ||
    clean.startsWith('data:')
  ) {
    return clean;
  }
  return `${API_BASE_URL}/RMMaster/download?path=${encodeURIComponent(clean)}`;
}

/**
 * Generates the full document URL for a given role, entityId, documentType (Aadhaar or PAN), and storedPath.
 *
 * Rules:
 * 1. RM: Uses /api/RMMaster/download?path={encodedStoredPath} from storedPath
 * 2. AMS: /api/AMSMaster/{amsId}/aadhar or /api/AMSMaster/{amsId}/pan
 * 3. BackOffice: /api/BackOfficeMaster/{backOfficeId}/aadhar or /api/BackOfficeMaster/{backOfficeId}/pan
 * 4. Agent: /api/AgentMaster/{agentId}/aadhaar or /api/AgentMaster/{agentId}/pan
 *
 * @param {string} role - Entity role ('RM', 'AMS', 'BackOffice', 'Agent')
 * @param {string|number} entityId - Entity master ID
 * @param {string} documentType - 'Aadhaar Card' / 'aadhar' / 'pan' / 'PAN Card'
 * @param {string} storedPath - Stored file path from DB (e.g. "RMAadhar/abc.png")
 * @returns {string|null} - Resolved URL
 */
export function getDocumentUrl(role, entityId, documentType = '', storedPath = '') {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const normalizedDocType = String(documentType || '').trim().toLowerCase();
  const cleanId = isValidId(entityId) ? encodeURIComponent(String(entityId).trim()) : '';

  const isAadhaar =
    normalizedDocType.includes('aadhaar') ||
    normalizedDocType.includes('aadhar');
  const isPan = normalizedDocType.includes('pan');

  // 1. RM: Use storedPath via /api/RMMaster/download?path={storedPath}
  const isRm =
    normalizedRole === 'rm' ||
    normalizedRole === 'rmmaster' ||
    normalizedRole === 'relationshipmanager' ||
    normalizedRole === 'relationship manager' ||
    normalizedRole === 'relationship_manager';

  if (isRm) {
    const raw = storedPath || (typeof role === 'string' && (role.includes('/') || role.includes('\\')) ? role : '');
    if (raw) {
      return getRmDocumentDownloadUrl(raw);
    }
    return null;
  }

  // 2. AMS: /api/AMSMaster/{amsId}/aadhar and /api/AMSMaster/{amsId}/pan
  const isAms =
    normalizedRole === 'ams' ||
    normalizedRole === 'amsmaster' ||
    normalizedRole === 'areamanager' ||
    normalizedRole === 'area manager' ||
    normalizedRole === 'area_manager' ||
    normalizedRole === 'areaspecialist' ||
    normalizedRole === 'area specialist';

  if (isAms && cleanId) {
    if (isAadhaar) return `${API_BASE_URL}/AMSMaster/${cleanId}/aadhar`;
    if (isPan) return `${API_BASE_URL}/AMSMaster/${cleanId}/pan`;
  }

  // 3. BackOffice: /api/BackOfficeMaster/{backOfficeId}/aadhar and /api/BackOfficeMaster/{backOfficeId}/pan
  const isBackOffice =
    normalizedRole === 'backoffice' ||
    normalizedRole === 'back_office' ||
    normalizedRole === 'back office' ||
    normalizedRole === 'backofficemaster' ||
    normalizedRole === 'operations' ||
    normalizedRole === 'operations team';

  if (isBackOffice && cleanId) {
    if (isAadhaar) return `${API_BASE_URL}/BackOfficeMaster/${cleanId}/aadhar`;
    if (isPan) return `${API_BASE_URL}/BackOfficeMaster/${cleanId}/pan`;
  }

  // 4. Agent: /api/AgentMaster/{agentId}/aadhaar and /api/AgentMaster/{agentId}/pan
  const isAgent =
    normalizedRole === 'agent' ||
    normalizedRole === 'agentmaster' ||
    normalizedRole === 'fieldagent' ||
    normalizedRole === 'field agent' ||
    normalizedRole === 'field_agent';

  if (isAgent && cleanId) {
    if (isAadhaar) return `${API_BASE_URL}/AgentMaster/${cleanId}/aadhaar`;
    if (isPan) return `${API_BASE_URL}/AgentMaster/${cleanId}/pan`;
  }

  if (storedPath) {
    return buildFileUrl(storedPath);
  }

  return null;
}

export default {
  getProfileImageUrl,
  getProfileImageUpdateUrl,
  updateProfileImage,
  buildFileUrl,
  getRmDocumentDownloadUrl,
  getDocumentUrl,
  getInitials,
  isValidId,
};
