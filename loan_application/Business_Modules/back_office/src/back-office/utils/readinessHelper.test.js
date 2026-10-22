import { describe, expect, it } from 'vitest';
import { EMPTY_READINESS, describeFailedChecks, summarizeReadiness } from './readinessHelper';

const check = (code, passed, extra = {}) => ({ code, label: code, passed, detail: passed ? null : `${code} failed`, ...extra });

const allPassed = () => [
  check('STATUS', true),
  check('LEGAL_OPINION', true),
  check('TECHNICAL_VALUATION', true),
  check('CIBIL_REPORT', true),
  check('ELIGIBILITY', true),
  check('RECOMMENDATION', true),
  check('DOCUMENT_REJECTIONS', true, { count: 0 }),
  check('CREDIT_RETURN_ITEMS', true, { count: 0 }),
];

describe('summarizeReadiness', () => {
  it('treats a missing response as not ready', () => {
    expect(summarizeReadiness(null)).toEqual(EMPTY_READINESS);
    expect(summarizeReadiness({ isReady: true, checks: [] }).isReady).toBe(false);
    expect(EMPTY_READINESS).not.toHaveProperty('hasRecommendation');
  });

  it('maps a ready application', () => {
    const result = summarizeReadiness({ isReady: true, checks: allPassed() });
    expect(result).toMatchObject({
      isReady: true,
      isVerificationReady: true,
      hasLegal: true,
      hasTechnical: true,
      hasCibil: true,
      hasEligibility: true,
      unresolvedRejectionsCount: 0,
      openCreditReturnCount: 0,
      failedChecks: [],
    });
    expect(result).not.toHaveProperty('hasRecommendation');
  });

  it('reports failed checks and open counts', () => {
    const checks = allPassed().map((c) =>
      c.code === 'LEGAL_OPINION' ? check('LEGAL_OPINION', false)
        : c.code === 'DOCUMENT_REJECTIONS' ? check('DOCUMENT_REJECTIONS', false, { count: 3 })
          : c
    );
    const result = summarizeReadiness({ isReady: false, checks });
    expect(result.isReady).toBe(false);
    expect(result.isVerificationReady).toBe(false);
    expect(result.hasLegal).toBe(false);
    expect(result.unresolvedRejectionsCount).toBe(3);
    expect(describeFailedChecks(result.failedChecks)).toEqual(['LEGAL_OPINION failed', 'DOCUMENT_REJECTIONS failed']);
  });

  it('keeps verification ready when only Credit Manager return items are open', () => {
    const checks = allPassed().map((c) =>
      c.code === 'CREDIT_RETURN_ITEMS' ? check('CREDIT_RETURN_ITEMS', false, { count: 2 }) : c
    );
    const result = summarizeReadiness({ isReady: false, checks });
    expect(result.isReady).toBe(false);
    expect(result.isVerificationReady).toBe(true);
    expect(result.openCreditReturnCount).toBe(2);
  });
});
