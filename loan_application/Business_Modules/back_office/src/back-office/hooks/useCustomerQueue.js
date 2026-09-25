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
 *   - Evaluates full Back Office underwriting workflow completion & Credit Manager submission readiness.
 *   - Provides safe loading, error, and refetch states.
 *   - Guarantees memory-safe execution via unmount guard.
 */

import { useState, useEffect, useCallback } from 'react';
import backOfficeService from '../api/backOfficeService';
import { mapAgent, mapCustomer, mapDistrict, mapRM } from '../mappers/hierarchyMapper';
import { resolveApplicationOwnership } from '../utils/ownershipHelper';
import { isApplicationUnderwritingReady } from '../utils/readinessHelper';

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

  const baseCustomers = rawCustomers
    .map(mapCustomer)
    .filter(Boolean)
    .filter((customer) => Number(customer.status) >= 2)
    .map((customer) => {
      const ownership = resolveApplicationOwnership(customer, agentById, rmById);
      const custId = String(customer.agentCustomerId || customer.id);
      const prod = prodByCustomerId.get(custId);
      const appProdId =
        prod?.applicationProductDetailsId ||
        customer.applicationProductDetailsId ||
        null;

      return {
        ...customer,
        applicationProductDetailsId: appProdId,
        agentId: ownership.agentId,
        agentName: ownership.agentName,
        rmId: ownership.rmId,
        rmName: ownership.rmName,
        sourceType: ownership.sourceType,
        isDirectRm: ownership.isDirectRm,
        isAgentCreated: ownership.isAgentCreated,
      };
    });

  // Evaluate full Back Office verification workflow for each HO application in parallel
  const verificationResults = await Promise.allSettled(
    baseCustomers.map(async (customer) => {
      if (!customer.applicationProductDetailsId) {
        return {
          isReady: false,
          stepVerifications: [],
          applicationDocuments: [],
          assessments: [],
          rejections: [],
        };
      }

      try {
        const [
          stepVerifsRes,
          appDocsRes,
          assessmentsRes,
          rejectionsRes,
        ] = await Promise.allSettled([
          backOfficeService.getStepVerificationsByApplication(
            customer.applicationProductDetailsId
          ),
          backOfficeService.getApplicationDocuments(
            customer.applicationProductDetailsId
          ),
          backOfficeService.getAssessmentsByApplication(
            customer.applicationProductDetailsId
          ),
          backOfficeService.getDocumentRejectionsByApplication(
            customer.applicationProductDetailsId
          ),
        ]);

        const stepVerifs =
          stepVerifsRes.status === 'fulfilled'
            ? unwrapList(stepVerifsRes.value)
            : [];
        const appDocs =
          appDocsRes.status === 'fulfilled'
            ? unwrapList(appDocsRes.value)
            : [];
        const assessments =
          assessmentsRes.status === 'fulfilled'
            ? unwrapList(assessmentsRes.value)
            : [];
        const rejections =
          rejectionsRes.status === 'fulfilled'
            ? unwrapList(rejectionsRes.value)
            : [];

        const isReady = isApplicationUnderwritingReady({
          customer,
          stepVerifications: stepVerifs,
          applicationDocuments: appDocs,
          assessments,
          rejections,
        });

        return {
          isReady,
          stepVerifications: stepVerifs,
          applicationDocuments: appDocs,
          assessments,
          rejections,
        };
      } catch {
        return {
          isReady: false,
          stepVerifications: [],
          applicationDocuments: [],
          assessments: [],
          rejections: [],
        };
      }
    })
  );

  return baseCustomers.map((customer, idx) => {
    const verif =
      verificationResults[idx]?.status === 'fulfilled'
        ? verificationResults[idx].value
        : {
            isReady: false,
            stepVerifications: [],
            applicationDocuments: [],
            assessments: [],
            rejections: [],
          };

    return {
      ...customer,
      isUnderwritingReady: Boolean(verif.isReady),
      isCreditReady: Boolean(verif.isReady),
      stepVerificationsCount: Array.isArray(verif.stepVerifications)
        ? verif.stepVerifications.filter((s) => s?.isVerified).length
        : 0,
      hasLegalOpinion: Array.isArray(verif.applicationDocuments)
        ? verif.applicationDocuments.some(
            (d) =>
              d &&
              d.isActive !== false &&
              String(d.documentType || '').toUpperCase() === 'LEGAL_OPINION'
          )
        : false,
      hasTechnicalValuation: Array.isArray(verif.applicationDocuments)
        ? verif.applicationDocuments.some(
            (d) =>
              d &&
              d.isActive !== false &&
              String(d.documentType || '').toUpperCase() === 'TECHNICAL_VALUATION'
          )
        : false,
      hasCibilReport: Array.isArray(verif.applicationDocuments)
        ? verif.applicationDocuments.some(
            (d) =>
              d &&
              d.isActive !== false &&
              (String(d.documentType || '').toUpperCase() === 'CIBIL_REPORT' ||
                String(d.documentType || '').toUpperCase() === 'MANUAL_CIBIL_PAN')
          )
        : false,
    };
  });
};

export function useCustomerQueue() {
  const [customers, setCustomers] = useState([]);
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

      const mapped = await enrichCustomers(
        unwrapList(customerResult.value),
        rawRms,
        rawAgents,
        prodResult.status === 'fulfilled' ? unwrapList(prodResult.value) : []
      );

      if (isMounted) {
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

        const mapped = await enrichCustomers(
          unwrapList(customerResult.value),
          rawRms,
          rawAgents,
          prodResult.status === 'fulfilled' ? unwrapList(prodResult.value) : []
        );

        if (active) {
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
    rmsCount,
    agentsCount,
    districtsCount,
    loading,
    error,
    refetch: fetchCustomers,
  };
}

export default useCustomerQueue;
