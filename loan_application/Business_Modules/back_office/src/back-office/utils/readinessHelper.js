/**
 * readinessHelper.js
 * --------------------
 * Step 15 "Underwriting & Verification Readiness" is evaluated by the server
 * (GET /ApplicationWorkflow/{agentCustomerId}/readiness), and send-to-credit-manager
 * enforces the same checks. This file only turns that response into the flags the
 * Back Office screens display, so the screens and the server cannot disagree.
 *
 * Server check codes:
 *   STATUS, LEGAL_OPINION, TECHNICAL_VALUATION, CIBIL_REPORT, ELIGIBILITY,
 *   RECOMMENDATION, DOCUMENT_REJECTIONS, CREDIT_RETURN_ITEMS
 */

const CREDIT_RETURN_ITEMS = 'CREDIT_RETURN_ITEMS';

export const EMPTY_READINESS = Object.freeze({
  isReady: false,
  isVerificationReady: false,
  hasLegal: false,
  hasTechnical: false,
  hasCibil: false,
  hasEligibility: false,
  hasRecommendation: false,
  unresolvedRejectionsCount: 0,
  openCreditReturnCount: 0,
  failedChecks: [],
});

/**
 * @param {{ isReady?: boolean, checks?: Array<{ code: string, label: string, passed: boolean, detail?: string, count?: number }> } | null} result
 */
export function summarizeReadiness(result) {
  const checks = Array.isArray(result?.checks) ? result.checks : [];
  if (!result || checks.length === 0) return { ...EMPTY_READINESS };

  const byCode = new Map(checks.map((c) => [String(c?.code || '').toUpperCase(), c]));
  const passed = (code) => Boolean(byCode.get(code)?.passed);
  const count = (code) => {
    const check = byCode.get(code);
    if (!check || check.passed) return 0;
    return Number(check.count) > 0 ? Number(check.count) : 1;
  };

  const failedChecks = checks.filter((c) => c && !c.passed);

  return {
    isReady: Boolean(result.isReady),
    // Every check except open Credit Manager return items, which the Returned by Credit screen resolves in place.
    isVerificationReady: failedChecks.every((c) => String(c.code || '').toUpperCase() === CREDIT_RETURN_ITEMS),
    hasLegal: passed('LEGAL_OPINION'),
    hasTechnical: passed('TECHNICAL_VALUATION'),
    hasCibil: passed('CIBIL_REPORT'),
    hasEligibility: passed('ELIGIBILITY'),
    hasRecommendation: passed('RECOMMENDATION'),
    unresolvedRejectionsCount: count('DOCUMENT_REJECTIONS'),
    openCreditReturnCount: count(CREDIT_RETURN_ITEMS),
    failedChecks,
  };
}

/** One line per failed check, for warnings and error messages. */
export function describeFailedChecks(failedChecks) {
  return (Array.isArray(failedChecks) ? failedChecks : [])
    .map((c) => c?.detail || c?.label)
    .filter(Boolean);
}

export default summarizeReadiness;
