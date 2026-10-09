/**
 * useCreditReturnItems.js
 * --------------------
 * Loads every ApplicationCreditReturnItem (all return cycles, with event history) for one
 * application. Used by the verification workspace to show red markers and section panels.
 */

import { useState, useEffect, useCallback } from 'react';
import backOfficeService from '../api/backOfficeService';
import { mapCreditReturnItem } from '../mappers/creditReturnMapper';

export function useCreditReturnItems(customerId, { enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled || !customerId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await backOfficeService.getCreditReturnItems(customerId);
      setItems(list.map(mapCreditReturnItem).filter(Boolean));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load Credit Manager returns.');
    } finally {
      setLoading(false);
    }
  }, [customerId, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, error, reload };
}

export default useCreditReturnItems;
