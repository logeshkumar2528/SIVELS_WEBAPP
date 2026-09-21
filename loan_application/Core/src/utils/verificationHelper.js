/**
 * verificationHelper.js
 * ---------------------
 * Central utility for dynamic VerificationMaster resolution.
 * 
 * Rules:
 * - Never hardcode VerificationId.
 * - Dynamic resolution matching verificationName / verificationCode from active master records.
 */

/**
 * Dynamically resolves numeric verificationId from VerificationMaster active records.
 * @param {Array} masterList - List of records from GET /api/VerificationMaster
 * @param {string} targetCodeOrName - Desired status ('Verified', 'Pending', 'VER', 'PEN', etc.)
 * @returns {number|null} Valid numeric verificationId or null if unresolved
 */
export function resolveVerificationIdByCodeOrName(masterList = [], targetCodeOrName = '') {
  if (!Array.isArray(masterList) || !targetCodeOrName) return null;
  const normalizedTarget = String(targetCodeOrName).trim().toLowerCase();
  const normalizedUpper = String(targetCodeOrName).trim().toUpperCase();

  const matched = masterList.find((item) => {
    if (!item) return false;
    if (item.isActive === false || item.raw?.isActive === false) return false;

    const name = String(
      item.verificationName ||
      item.label ||
      item.name ||
      item.raw?.verificationName ||
      ''
    ).trim().toLowerCase();

    const code = String(
      item.verificationCode ||
      item.code ||
      item.raw?.verificationCode ||
      ''
    ).trim().toUpperCase();

    // Direct exact name or uppercase code match
    if (name === normalizedTarget || code === normalizedUpper) return true;

    // Semantic matching for standard states
    if (normalizedTarget === 'verified' || normalizedTarget === 'ver') {
      return name === 'verified' || code === 'VER' || name.includes('verified');
    }
    if (normalizedTarget === 'pending' || normalizedTarget === 'pen' || normalizedTarget === 'unverified') {
      return name === 'pending' || code === 'PEN' || name.includes('pending');
    }
    if (normalizedTarget === 'rejected' || normalizedTarget === 'rej') {
      return name === 'rejected' || code === 'REJ' || name.includes('rejected');
    }

    return false;
  });

  if (!matched) return null;
  const idVal =
    matched.verificationId ??
    matched.VerificationId ??
    matched.value ??
    matched.id ??
    matched.Id ??
    matched.raw?.verificationId;

  const num = Number(idVal);
  return isNaN(num) || num <= 0 ? null : num;
}
