import { afterEach, describe, expect, it } from 'vitest';
import { canViewStep, getApplicableCreditSections } from './CustomerVerification';

const ELIGIBILITY_STEPS = [15, 16, 19, 22];

function signInWith(permissions) {
  localStorage.setItem('sivels_currentUser', JSON.stringify({ role: 'CreditManager', roleCode: 'CREDIT_MANAGER', permissions }));
}

const ids = (sections) => sections.map((s) => s.id);

describe('step permissions', () => {
  afterEach(() => localStorage.clear());

  it('hides eligibility steps and drops them from the review checklist without ELIGIBILITY.VIEW', () => {
    signInWith(['CREDIT.VIEW', 'CREDIT.APPROVE', 'DOCUMENTS.VIEW', 'VERIFICATION.VIEW', 'DEVIATION.VIEW']);

    ELIGIBILITY_STEPS.forEach((id) => expect(canViewStep(id)).toBe(false));
    expect(canViewStep(1)).toBe(true);
    expect(canViewStep(14)).toBe(true);

    const sections = ids(getApplicableCreditSections(false));
    ELIGIBILITY_STEPS.forEach((id) => expect(sections).not.toContain(id));
    expect(sections).toContain(14);
    expect(sections).toContain(21);
  });

  it('keeps every section for a role holding all permissions, minus secured FI for unsecured loans', () => {
    signInWith(['DOCUMENTS.VIEW', 'VERIFICATION.VIEW', 'ELIGIBILITY.VIEW', 'DEVIATION.VIEW']);

    const secured = ids(getApplicableCreditSections(false));
    ELIGIBILITY_STEPS.forEach((id) => expect(secured).toContain(id));
    expect(secured).toEqual(expect.arrayContaining([8, 9, 10]));
    expect(ids(getApplicableCreditSections(true))).not.toEqual(expect.arrayContaining([8]));
  });

  it('shows everything for sessions from before permissions existed', () => {
    localStorage.setItem('sivels_currentUser', JSON.stringify({ role: 'CreditManager', roleCode: 'CREDIT_MANAGER' }));

    ELIGIBILITY_STEPS.forEach((id) => expect(canViewStep(id)).toBe(true));
  });
});
