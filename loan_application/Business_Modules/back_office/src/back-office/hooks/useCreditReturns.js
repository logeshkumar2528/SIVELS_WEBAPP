/**
 * useCreditReturns.js
 * --------------------
 * Purpose:
 *   Identify applications the Credit Manager returned to the Back Office for correction.
 *
 * Rule:
 *   An application is "Returned by Credit Manager" when it is back at status 2 (Logged to HO)
 *   and its latest ApplicationCreditDecision is `ReturnedToBackOffice`. Once the Back Office
 *   re-sends it (status 3) it leaves this list automatically.
 *
 * Input:
 *   customers — the enriched list from useCustomerQueue (avoids a second customer fetch).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import backOfficeService from '../api/backOfficeService';
import { getValue } from '../mappers/hierarchyMapper';
import { mapCreditReturnItem, itemsForDecision } from '../mappers/creditReturnMapper';

export const RETURNED_TO_BACK_OFFICE = 'ReturnedToBackOffice';
const LOGGED_TO_HO_STATUS = 2;

const unwrapList = (response) => {
  if (Array.isArray(response)) return response;
  return response?.value || response?.data || response?.result || [];
};

function mapDecision(raw) {
  if (!raw) return null;
  return {
    id: getValue(raw, 'applicationCreditDecisionId', 'ApplicationCreditDecisionId', 'id', 'Id'),
    decision: getValue(raw, 'decision', 'Decision') || '',
    creditManagerId: getValue(raw, 'creditManagerId', 'CreditManagerId'),
    remarks: getValue(raw, 'remarks', 'Remarks') || '',
    decidedAt: getValue(raw, 'decidedAt', 'DecidedAt', 'createdAt', 'CreatedAt'),
  };
}

export function useCreditReturns(customers = []) {
  const [decisionsById, setDecisionsById] = useState({});
  const [itemsById, setItemsById] = useState({});
  const [creditManagerNames, setCreditManagerNames] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const candidateIds = useMemo(
    () =>
      customers
        .filter((c) => Number(c.status) === LOGGED_TO_HO_STATUS)
        .map((c) => String(c.agentCustomerId || c.id))
        .filter(Boolean),
    [customers]
  );
  const candidateKey = candidateIds.join(',');

  const load = useCallback(async (isActive = () => true) => {
    const ids = candidateKey ? candidateKey.split(',') : [];
    if (ids.length === 0) {
      setDecisionsById({});
      setItemsById({});
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [decisionResults, cmResult] = await Promise.all([
        Promise.allSettled(ids.map((id) => backOfficeService.getLatestCreditDecision(id))),
        backOfficeService.getCreditManagers().catch(() => []),
      ]);

      const next = {};
      let failures = 0;
      decisionResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const decision = mapDecision(result.value);
          if (decision) next[ids[idx]] = decision;
        } else {
          failures += 1;
        }
      });

      const names = {};
      unwrapList(cmResult).forEach((cm) => {
        const id = getValue(cm, 'creditManagerId', 'CreditManagerId', 'id', 'Id');
        if (id != null) names[String(id)] = getValue(cm, 'fullName', 'FullName', 'name', 'Name') || '';
      });

      const returnedIds = Object.keys(next).filter((id) => next[id].decision === RETURNED_TO_BACK_OFFICE);
      const itemResults = await Promise.allSettled(
        returnedIds.map((id) => backOfficeService.getCreditReturnItems(id))
      );
      const items = {};
      itemResults.forEach((result, idx) => {
        const id = returnedIds[idx];
        const all = result.status === 'fulfilled' ? result.value.map(mapCreditReturnItem).filter(Boolean) : [];
        items[id] = itemsForDecision(all, next[id].id);
      });

      if (isActive()) {
        setDecisionsById(next);
        setItemsById(items);
        setCreditManagerNames(names);
        if (failures > 0 && failures === ids.length) {
          setError('Unable to load Credit Manager decisions.');
        }
      }
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [candidateKey]);

  useEffect(() => {
    let active = true;
    load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const returnedApplications = useMemo(
    () =>
      customers
        .filter((c) => Number(c.status) === LOGGED_TO_HO_STATUS)
        .map((c) => {
          const key = String(c.agentCustomerId || c.id);
          const decision = decisionsById[key];
          if (!decision || decision.decision !== RETURNED_TO_BACK_OFFICE) return null;
          const returnItems = itemsById[key] || [];
          return {
            ...c,
            returnItems,
            openReturnItems: returnItems.filter((item) => !item.isResolved),
            returnRemarks: decision.remarks,
            returnedAt: decision.decidedAt,
            returnedByName:
              creditManagerNames[String(decision.creditManagerId)] ||
              (decision.creditManagerId != null ? `Credit Manager #${decision.creditManagerId}` : 'Credit Manager'),
          };
        })
        .filter(Boolean),
    [customers, decisionsById, itemsById, creditManagerNames]
  );

  return {
    returnedApplications,
    loading,
    error,
    refetch: () => load(),
  };
}

export default useCreditReturns;
