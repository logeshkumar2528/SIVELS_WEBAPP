/**
 * useCustomerQueue.js
 * --------------------
 * Purpose:
 *   React hook for fetching and managing the Back Office global customer applications queue.
 *
 * Capabilities:
 *   - Auto-fetches all customer loan applications on mount.
 *   - Normalizes raw API records through hierarchyMapper.
 *   - Resolves application ownership (Agent vs Direct RM).
 *   - Loads Credit Manager submission readiness from the server (one readiness call per application).
 *   - Provides safe loading, error, and refetch states.
 *   - Guarantees memory-safe execution via unmount guard.
 */

import { useState, useEffect, useCallback } from 'react';
import backOfficeService from '../api/backOfficeService';
import { getValue, mapAgent, mapCustomer, mapDistrict, mapRM } from '../mappers/hierarchyMapper';
import { resolveApplicationOwnership } from '../utils/ownershipHelper';
import { summarizeReadiness } from '../utils/readinessHelper';
import { extractWorkflowStatus } from '../../../../../Core/src/utils/applicationWorkflowStatus';

const BACK_OFFICE_QUEUE_CODES = new Set([
  'BO_VERIFICATION_PENDING',
  'BO_VERIFICATION_IN_PROGRESS',
  'RETURNED_TO_BO_CORRECTION_PENDING',
]);

const unwrapList = (response) => {
  if (Array.isArray(response)) return response;
  return response?.value || response?.data || response?.result || [];
};

const enrichCustomers = async (rawCustomers, rawRms, rawAgents, rawProductDetails = []) => {
  const rms = rawRms.map(mapRM).filter(Boolean);
  const agents = rawAgents.map(mapAgent).filter(Boolean);
  const rmById = new Map(rms.map((rm) => [String(rm.rmId || rm.id), rm]));
  const agentById = new Map(agents.map((agent) => [String(agent.agentId || agent.id), agent]));

  const productDetailsList = unwrapList(rawProductDetails);
  const prodByCustomerId = new Map();
  productDetailsList.forEach((p) => {
    if (p && p.agentCustomerId) {
      prodByCustomerId.set(String(p.agentCustomerId), p);
    }
  });

  const normalizedCustomers = rawCustomers
    .map((rawCustomer) => ({
      customer: mapCustomer(rawCustomer),
      workflowStatus: extractWorkflowStatus(rawCustomer),
    }))
    .filter(({ customer }) => Boolean(customer))
    .map((customer) => {
      const ownership = resolveApplicationOwnership(customer.customer, agentById, rmById);
      const custId = String(customer.customer.agentCustomerId || customer.customer.id);
      const prod = prodByCustomerId.get(custId);
      const appProdId =
        prod?.applicationProductDetailsId ||
        customer.customer.applicationProductDetailsId ||
        null;
      const loanProductId =
        customer.customer.loanProductId ??
        getValue(prod, 'loanProductId', 'LoanProductId');
      const loanProductName =
        customer.customer.loanProductName ||
        getValue(prod, 'loanProductName', 'LoanProductName', 'productName', 'ProductName') ||
        '';

      return {
        ...customer.customer,
        workflowStatus: customer.workflowStatus,
        workflowStatusCode: customer.workflowStatus.workflowStatusCode,
        workflowStatusName: customer.workflowStatus.workflowStatusName,
        applicationProductDetailsId: appProdId,
        loanProductId,
        loanProductName,
        agentId: ownership.agentId,
        agentName: ownership.agentName,
        rmId: ownership.rmId,
        rmName: ownership.rmName,
        sourceType: ownership.sourceType,
        isDirectRm: ownership.isDirectRm,
        isAgentCreated: ownership.isAgentCreated,
      };
    });

  const baseCustomers = normalizedCustomers.filter((customer) => (
    customer.workflowStatusCode
      ? BACK_OFFICE_QUEUE_CODES.has(customer.workflowStatusCode)
      : Number(customer.workflowStatus?.legacyStatus ?? customer.status) >= 2
  ));

  // Step 15 readiness is evaluated by the server: one call per HO application, in parallel.
  const readinessResults = await Promise.allSettled(
    baseCustomers.map((customer) =>
      customer.applicationProductDetailsId
        ? backOfficeService.getApplicationReadiness(customer.agentCustomerId || customer.id)
        : Promise.resolve(null)
    )
  );

  const customers = baseCustomers.map((customer, idx) => {
    const readiness = summarizeReadiness(
      readinessResults[idx]?.status === 'fulfilled' ? readinessResults[idx].value : null
    );

    return {
      ...customer,
      isUnderwritingReady: readiness.isReady,
      isCreditReady: readiness.isReady,
      isVerificationReady: readiness.isVerificationReady,
      readinessFailedChecks: readiness.failedChecks,
      hasLegalOpinion: readiness.hasLegal,
      hasTechnicalValuation: readiness.hasTechnical,
      hasCibilReport: readiness.hasCibil,
    };
  });

  return { allCustomers: normalizedCustomers, customers };
};

export function useCustomerQueue() {
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [rmsCount, setRmsCount] = useState(0);
  const [agentsCount, setAgentsCount] = useState(0);
  const [districtsCount, setDistrictsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomers = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      const [customerResult, rmResult, agentResult, prodResult, districtResult] = await Promise.allSettled([
        backOfficeService.getAllCustomers(),
        backOfficeService.getAllRMs(),
        backOfficeService.getAllAgents(),
        backOfficeService.getApplicationProductDetails(),
        backOfficeService.getDistricts(),
      ]);

      if (customerResult.status === 'rejected') throw customerResult.reason;

      const rawRms = rmResult.status === 'fulfilled' ? unwrapList(rmResult.value) : [];
      const rawAgents = agentResult.status === 'fulfilled' ? unwrapList(agentResult.value) : [];
      const rawDistricts = districtResult.status === 'fulfilled' ? unwrapList(districtResult.value) : [];
      const mappedRms = rawRms.map(mapRM).filter(Boolean);
      const mappedAgents = rawAgents.map(mapAgent).filter(Boolean);
      const mappedDistricts = rawDistricts.map(mapDistrict).filter(Boolean);

      const { allCustomers: mappedAllCustomers, customers: mapped } = await enrichCustomers(
        unwrapList(customerResult.value),
        rawRms,
        rawAgents,
        prodResult.status === 'fulfilled' ? unwrapList(prodResult.value) : []
      );

      if (isMounted) {
        setAllCustomers(mappedAllCustomers);
        setCustomers(mapped);
        setRmsCount(mappedRms.length);
        setAgentsCount(mappedAgents.length);
        setDistrictsCount(mappedDistricts.length);
      }
    } catch (err) {
      if (isMounted) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to fetch customer applications';
        setError(msg);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [customerResult, rmResult, agentResult, prodResult, districtResult] = await Promise.allSettled([
          backOfficeService.getAllCustomers(),
          backOfficeService.getAllRMs(),
          backOfficeService.getAllAgents(),
          backOfficeService.getApplicationProductDetails(),
          backOfficeService.getDistricts(),
        ]);

        if (customerResult.status === 'rejected') throw customerResult.reason;

        const rawRms = rmResult.status === 'fulfilled' ? unwrapList(rmResult.value) : [];
        const rawAgents = agentResult.status === 'fulfilled' ? unwrapList(agentResult.value) : [];
        const rawDistricts = districtResult.status === 'fulfilled' ? unwrapList(districtResult.value) : [];
        const mappedRms = rawRms.map(mapRM).filter(Boolean);
        const mappedAgents = rawAgents.map(mapAgent).filter(Boolean);
        const mappedDistricts = rawDistricts.map(mapDistrict).filter(Boolean);

        const { allCustomers: mappedAllCustomers, customers: mapped } = await enrichCustomers(
          unwrapList(customerResult.value),
          rawRms,
          rawAgents,
          prodResult.status === 'fulfilled' ? unwrapList(prodResult.value) : []
        );

        if (active) {
          setAllCustomers(mappedAllCustomers);
          setCustomers(mapped);
          setRmsCount(mappedRms.length);
          setAgentsCount(mappedAgents.length);
          setDistrictsCount(mappedDistricts.length);
        }
      } catch (err) {
        if (active) {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Failed to fetch customer applications';
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return {
    customers,
    allCustomers,
    rmsCount,
    agentsCount,
    districtsCount,
    loading,
    error,
    refetch: fetchCustomers,
  };
}

export default useCustomerQueue;
