/**
 * useReviewSections.js
 * --------------------
 * Per-section review state for the Credit Manager workspace, stored on the server
 * (api/ApplicationReviewSection) so it survives reloads and is shared between reviewers.
 *
 * - approved section ids, plus flags (step-level rejects) that are sent together with
 *   "Return to Back Office". A section with a flag counts as rejected.
 * - Every change updates the screen first and is then saved with one PUT per changed section.
 *   A failed save shows the server's message and reloads the saved state.
 * - The server closes the round when a decision is recorded; call reload() afterwards.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CREDIT_REVIEW_SECTIONS,
  getApplicableCreditSections,
  resolveReviewSectionId,
} from '../../../back_office/src/back-office/pages/CustomerVerification/CustomerVerification';
import {
  buildCreditReturnItemFromStep,
  getReturnItemStep,
} from '../../../back_office/src/back-office/config/creditReturnFields';
import creditManagerService from '../api/creditManagerService';
import { getCreditManagerId } from '../auth/authStorage';
import { getErrorMessage } from '../components/CreditDecisionModal';

const SECTION_IDS = new Set(CREDIT_REVIEW_SECTIONS.map((s) => s.id));
const SECTION_ORDER = new Map(CREDIT_REVIEW_SECTIONS.map((s, index) => [s.id, index]));

/** sessionStorage keys used before review state moved to the server. */
const legacyStorageKeys = (customerId) => [
  `cm-pending-flags:${customerId}`,
  `cm-approved-sections:${customerId}`,
];

const isSameFlag = (a, b) =>
  a.sectionCode === b.sectionCode &&
  a.fieldKey === b.fieldKey &&
  String(a.fieldLabel || '').toLowerCase() === String(b.fieldLabel || '').toLowerCase();

/** Flags raised from the decision modal have no stepId; place them on the section their field belongs to. */
function sectionIdOf(flag) {
  const own = Number(flag?.stepId);
  if (SECTION_IDS.has(own)) return own;
  const derived = resolveReviewSectionId(Number(getReturnItemStep(flag)?.stepId));
  return SECTION_IDS.has(derived) ? derived : CREDIT_REVIEW_SECTIONS[0].id;
}

const toFlag = (flag) => ({
  sectionCode: flag.sectionCode,
  sectionName: flag.sectionName,
  fieldKey: flag.fieldKey,
  fieldLabel: flag.fieldLabel,
  issue: flag.issue,
  stepId: sectionIdOf(flag),
});

const sameFlags = (a, b) => JSON.stringify(a.map(toFlag)) === JSON.stringify(b.map(toFlag));

function flatten(sections) {
  return Object.entries(sections)
    .sort(([a], [b]) => (SECTION_ORDER.get(Number(a)) ?? 99) - (SECTION_ORDER.get(Number(b)) ?? 99))
    .flatMap(([, section]) => section.flags);
}

function clearLegacyStorage(customerId) {
  try {
    legacyStorageKeys(customerId).forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // sessionStorage unavailable (private mode); nothing to clean up.
  }
}

export function useReviewSections(customerId, isUnsecured = false) {
  // sectionId -> { isApproved, flags }
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sectionsRef = useRef(sections);
  const saveQueue = useRef(Promise.resolve());

  const commit = useCallback((next) => {
    sectionsRef.current = next;
    setSections(next);
  }, []);

  const reload = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await creditManagerService.getReviewSections(customerId);
      const next = {};
      (Array.isArray(data?.sections) ? data.sections : []).forEach((s) => {
        const sectionId = Number(s.sectionId);
        if (!SECTION_IDS.has(sectionId)) return;
        next[sectionId] = {
          isApproved: Boolean(s.isApproved),
          flags: (Array.isArray(s.flags) ? s.flags : []).map((f) => toFlag({ ...f, stepId: sectionId })),
        };
      });
      commit(next);
      setError('');
    } catch (err) {
      if (err?.response?.status === 404) {
        commit({});
      } else {
        setError(getErrorMessage(err, 'Unable to load the section review.'));
      }
    } finally {
      setLoading(false);
    }
  }, [customerId, commit]);

  useEffect(() => {
    clearLegacyStorage(customerId);
    commit({});
    reload();
  }, [customerId, commit, reload]);

  /** changes: { [sectionId]: { isApproved, flags } } — applied on screen first, then saved in order. */
  const save = useCallback(
    (changes) => {
      const entries = Object.entries(changes);
      if (!entries.length || !customerId) return;
      const next = { ...sectionsRef.current };
      entries.forEach(([sectionId, section]) => {
        if (section.isApproved || section.flags.length) next[sectionId] = section;
        else delete next[sectionId];
      });
      commit(next);

      const creditManagerId = Number(getCreditManagerId()) || null;
      saveQueue.current = saveQueue.current.then(async () => {
        const results = await Promise.allSettled(
          entries.map(([sectionId, section]) =>
            creditManagerService.saveReviewSection(customerId, sectionId, {
              isApproved: Boolean(section.isApproved) && section.flags.length === 0,
              flags: section.flags.map(toFlag),
              reviewedByUserId: creditManagerId,
              reviewedByRole: 'CreditManager',
            })
          )
        );
        const failed = results.find((r) => r.status === 'rejected');
        if (failed) {
          setError(getErrorMessage(failed.reason, 'Unable to save the section review. Please try again.'));
          await reload();
        } else {
          setError('');
        }
      });
    },
    [customerId, commit, reload]
  );

  const flags = useMemo(() => flatten(sections), [sections]);

  /** Replaces the whole flag list (used by the pending-flags card and the return modal). */
  const setFlags = useCallback(
    (nextFlags) => {
      const current = sectionsRef.current;
      const value = typeof nextFlags === 'function' ? nextFlags(flatten(current)) : nextFlags;
      const grouped = {};
      (Array.isArray(value) ? value : []).forEach((flag) => {
        const item = toFlag(flag);
        (grouped[item.stepId] ||= []).push(item);
      });

      const changes = {};
      new Set([...Object.keys(current), ...Object.keys(grouped)].map(Number)).forEach((sectionId) => {
        const before = current[sectionId]?.flags || [];
        const after = grouped[sectionId] || [];
        if (sameFlags(before, after)) return;
        changes[sectionId] = {
          isApproved: after.length === 0 && Boolean(current[sectionId]?.isApproved),
          flags: after,
        };
      });
      save(changes);
    },
    [save]
  );

  const addFlag = useCallback(
    (step) => {
      const sectionId = resolveReviewSectionId(step.stepNum);
      const item = toFlag({ ...buildCreditReturnItemFromStep(step), stepId: sectionId });
      if (!item.issue) return;
      const before = sectionsRef.current[sectionId]?.flags || [];
      save({ [sectionId]: { isApproved: false, flags: [...before.filter((f) => !isSameFlag(f, item)), item] } });
    },
    [save]
  );

  const getStatus = useCallback(
    (sectionId) => {
      const section = sections[sectionId];
      if (section?.flags.length) return 'FLAGGED';
      if (section?.isApproved) return 'APPROVED';
      return null;
    },
    [sections]
  );

  const approve = useCallback(
    (sectionId) => {
      const section = sectionsRef.current[sectionId];
      if (section?.isApproved || section?.flags.length) return;
      save({ [sectionId]: { isApproved: true, flags: [] } });
    },
    [save]
  );

  const unapprove = useCallback(
    (sectionId) => {
      const section = sectionsRef.current[sectionId];
      if (!section?.isApproved) return;
      save({ [sectionId]: { isApproved: false, flags: section.flags } });
    },
    [save]
  );

  const clearSectionFlags = useCallback(
    (sectionId) => {
      const section = sectionsRef.current[sectionId];
      if (!section?.flags.length) return;
      save({ [sectionId]: { isApproved: false, flags: [] } });
    },
    [save]
  );

  const applicableSections = useMemo(
    () => getApplicableCreditSections(Boolean(isUnsecured)),
    [isUnsecured]
  );

  const approvedCount = applicableSections.filter((s) => getStatus(s.id) === 'APPROVED').length;

  return {
    flags,
    setFlags,
    addFlag,
    getStatus,
    approve,
    unapprove,
    clearSectionFlags,
    reload,
    applicableSections,
    approvedCount,
    totalSections: applicableSections.length,
    loading,
    error,
  };
}

export default useReviewSections;
