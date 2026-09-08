/**
 * useVerificationWorkspace.js
 * --------------------
 * Purpose:
 *   React hook for retrieving and hydrating the 12-step application verification payload
 *   for a given customer ID in the Back Office workspace.
 *
 * Capabilities:
 *   - Fetches from `/ApplicationFullDetails/:agentCustomerId`.
 *   - Fetches uploaded documents from `/AgentCustomerDocument/bycustomer/:agentCustomerId`.
 *   - Provides graceful fallback to `/AgentAddCustomer/:agentCustomerId` if full details is not yet created.
 *   - Normalizes raw application tables through verificationMapper.
 *   - Provides reactive loading, error, verificationData, and refetch states.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import backOfficeService from '../api/backOfficeService';
import { mapApplicationFullDetails } from '../mappers/verificationMapper';

export function useVerificationWorkspace(agentCustomerId) {
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(Boolean(agentCustomerId));
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);

  const fetchApplication = useCallback(async () => {
    if (!agentCustomerId) {
      setVerificationData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let rawPayload = null;
      let extraDocs = [];

      // 1. Primary: Fetch full aggregated 12-step application details
      try {
        rawPayload = await backOfficeService.getApplicationFullDetails(agentCustomerId);
      } catch (fullErr) {
        console.warn(
          `[useVerificationWorkspace] FullDetails 404/error for ${agentCustomerId}, falling back to Customer master:`,
          fullErr?.message
        );
      }

      // 2. Fetch Customer Documents if available
      try {
        const docRes = await backOfficeService.getCustomerDocuments(agentCustomerId);
        if (docRes) {
          extraDocs = Array.isArray(docRes) ? docRes : (docRes?.data || docRes?.value || [docRes]);
        }
      } catch {
        // Document fetch is non-blocking
      }

      // 3. Fallback: If full details was 404 or empty, retrieve base customer intake record
      if (!rawPayload) {
        const customerRecord = await backOfficeService.getCustomerById(agentCustomerId);
        if (customerRecord) {
          const cust = Array.isArray(customerRecord) ? customerRecord[0] : customerRecord;
          rawPayload = { customer: cust };
        }
      }

      if (rawPayload && isMountedRef.current) {
        const mapped = mapApplicationFullDetails(rawPayload, extraDocs);
        setVerificationData(mapped);
      } else if (isMountedRef.current) {
        setError(`No application records found for Customer ID: ${agentCustomerId}`);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load customer verification data';
        setError(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [agentCustomerId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchApplication();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchApplication]);

  return {
    verificationData,
    loading,
    error,
    refetch: fetchApplication,
  };
}

export default useVerificationWorkspace;
