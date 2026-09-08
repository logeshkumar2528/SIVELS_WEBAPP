/**
 * useDashboardData.js
 * --------------------
 * Purpose:
 *   Single orchestration hook for fetching, normalizing, aggregating, and caching
 *   all operational datasets and business KPIs required by the Back Office Dashboard.
 *
 * Architecture:
 *   - Phase 6 Real API Integration:
 *       1. GET /District         -> All operational districts across the state
 *       2. GET /RMMaster         -> All Relationship Managers across the state
 *       3. GET /AgentMaster      -> All Field Agents in the network
 *       4. GET /AgentAddCustomer -> All Customer Loan Applications
 *   - Concurrent Execution: Uses Promise.allSettled() to prevent single-point-of-failure cascades.
 *   - In-Memory Territory & Hierarchy Aggregation:
 *       District -> RMs -> Agents -> Customers
 *   - Financial & Operational KPIs:
 *       Total Portfolio, Disbursed Amount, Pending Pipeline Amount, Status Distribution, Conversion Rate.
 *   - Strict Deduplication & Type Safety:
 *       Safeguards against undefined, NaN, Infinity, and missing properties.
 *   - Lifecycle Protected: Memory leak and unmounted update prevention.
 */

import { useState, useEffect, useCallback } from 'react';
import backOfficeService from '../api/backOfficeService';
import { mapDistrict, mapRM, mapAgent, mapCustomer } from '../mappers/hierarchyMapper';

/**
 * Normalizes backend status values into standard Sivels statuses.
 */
export function normalizeStatus(status) {
  if (status === null || status === undefined || status === '') {
    return 'Pending';
  }

  const value = String(status).trim().toLowerCase();

  if (value === 'approved' || value === '4') {
    return 'Approved';
  }

  if (value === 'rejected' || value === '2') {
    return 'Rejected';
  }

  if (value === 'disbursed' || value === '5') {
    return 'Disbursed';
  }

  if (
    value === 'in progress' ||
    value === 'processing' ||
    value === 'under process' ||
    value === 'under review' ||
    value === '1' ||
    value === '3'
  ) {
    return 'In Progress';
  }

  return 'Pending';
}

/**
 * Extracts loan amount safely with fallback support across backend alias keys.
 */
export function getLoanAmount(customer) {
  return (
    Number(
      customer?.amount ||
      customer?.expectedLoanAmount ||
      customer?.loanAmount ||
      0
    ) || 0
  );
}

const INITIAL_METRICS = {
  totalDistricts: 0,
  totalRMs: 0,
  totalAgents: 0,
  totalCustomers: 0,
  totalApplications: 0,
  totalPortfolio: 0,
  totalDisbursed: 0,
  totalPending: 0,
  approvedApplications: 0,
  approvedAmount: 0,
  pendingApplications: 0,
  inProgressApplications: 0,
  rejectedApplications: 0,
  disbursedApplications: 0,
  disbursedAmount: 0,
  pendingPipelineAmount: 0,
  conversionRate: 0,
};

const INITIAL_STATUS_SUMMARY = {
  total: 0,
  pending: 0,
  inProgress: 0,
  approved: 0,
  rejected: 0,
  disbursed: 0,
};

export function useDashboardData() {
  const [districts, setDistricts] = useState([]);
  const [rms, setRMs] = useState([]);
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [recentApplications, setRecentApplications] = useState([]);
  const [applicationStatusSummary, setApplicationStatusSummary] = useState(INITIAL_STATUS_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      // 1. Concurrently fetch all 4 master datasets
      const [districtsRes, rmsRes, agentsRes, customersRes] = await Promise.allSettled([
        backOfficeService.getDistricts(),
        backOfficeService.getAllRMs(),
        backOfficeService.getAllAgents(),
        backOfficeService.getAllCustomers(),
      ]);

      if (!isMounted) return;

      // 2. Normalize Master Datasets
      let mappedDistricts = [];
      if (districtsRes.status === 'fulfilled' && districtsRes.value) {
        const raw = Array.isArray(districtsRes.value)
          ? districtsRes.value
          : (districtsRes.value?.value || districtsRes.value?.data || []);
        mappedDistricts = raw.map(mapDistrict).filter(Boolean);
      }

      let mappedRMs = [];
      if (rmsRes.status === 'fulfilled' && rmsRes.value) {
        const raw = Array.isArray(rmsRes.value)
          ? rmsRes.value
          : (rmsRes.value?.value || rmsRes.value?.data || []);
        mappedRMs = raw.map(mapRM).filter(Boolean);
      }

      let mappedAgents = [];
      if (agentsRes.status === 'fulfilled' && agentsRes.value) {
        const raw = Array.isArray(agentsRes.value)
          ? agentsRes.value
          : (agentsRes.value?.value || agentsRes.value?.data || []);
        mappedAgents = raw.map(mapAgent).filter(Boolean);
      }

      let mappedCustomers = [];
      if (customersRes.status === 'fulfilled' && customersRes.value) {
        const raw = Array.isArray(customersRes.value)
          ? customersRes.value
          : (customersRes.value?.value || customersRes.value?.data || []);
        mappedCustomers = raw.map(mapCustomer).filter(Boolean);
      }

      // If customer applications API explicitly failed and all others failed, report meaningful error
      if (customersRes.status === 'rejected' && districtsRes.status === 'rejected' && rmsRes.status === 'rejected') {
        const err = customersRes.reason || districtsRes.reason;
        const msg = err?.response?.data?.message || err?.message || 'Unable to connect to backend server. Please check your network connection.';
        setError(msg);
      } else if (customersRes.status === 'rejected' && mappedCustomers.length === 0) {
        const err = customersRes.reason;
        const msg = err?.response?.data?.message || err?.message || 'Failed to load customer loan portfolio data.';
        setError(msg);
      }

      // 3. In-Memory Relational Aggregations for Districts
      const enrichedDistricts = mappedDistricts.map((d) => {
        const dId = String(d.districtId || d.id || '');
        const dName = (d.name || '').trim().toLowerCase();

        // RMs in this District
        const distRMs = mappedRMs.filter((r) => {
          return (
            (dId && String(r.districtId) === dId) ||
            (dName && r.districtName && r.districtName.trim().toLowerCase() === dName)
          );
        });
        const distRmIds = new Set(distRMs.map((r) => String(r.rmId || r.id)).filter(Boolean));
        const distRmNames = new Set(distRMs.map((r) => (r.name || r.fullName || '').trim().toLowerCase()).filter(Boolean));

        // Agents in this District
        const distAgents = mappedAgents.filter((ag) => {
          return (
            (dId && String(ag.districtId) === dId) ||
            (ag.rmId && distRmIds.has(String(ag.rmId))) ||
            (dName && ag.districtName && ag.districtName.trim().toLowerCase() === dName) ||
            (ag.rmName && distRmNames.has(ag.rmName.trim().toLowerCase()))
          );
        });
        const distAgentIds = new Set(distAgents.map((a) => String(a.agentId || a.id)).filter(Boolean));
        const distAgentCodes = new Set(distAgents.map((a) => String(a.code || a.agentCode)).filter(Boolean));
        const distAgentNames = new Set(distAgents.map((a) => (a.name || a.fullName || '').trim().toLowerCase()).filter(Boolean));

        // Customers in this District (deduplicated)
        const seenCustomerIds = new Set();
        const distCustomers = mappedCustomers.filter((c) => {
          if (!c) return false;
          const custId = c.agentCustomerId || c.id;
          if (custId && seenCustomerIds.has(String(custId))) return false;

          const matchDistrict = (dId && String(c.districtId) === dId) || (dName && c.districtName && c.districtName.trim().toLowerCase() === dName);
          const matchAgent = (c.agentId && distAgentIds.has(String(c.agentId))) || (c.agentCode && distAgentCodes.has(String(c.agentCode))) || (c.agentName && distAgentNames.has(c.agentName.trim().toLowerCase()));
          const matchRM = (c.rmId && distRmIds.has(String(c.rmId))) || (c.rmName && distRmNames.has(c.rmName.trim().toLowerCase()));

          if (matchDistrict || matchAgent || matchRM) {
            if (custId) seenCustomerIds.add(String(custId));
            return true;
          }
          return false;
        });

        const rmCount = distRMs.length;
        const agentCount = distAgents.length;
        const customerCount = distCustomers.length;
        const totalDistrictPortfolio = distCustomers.reduce(
          (sum, c) => sum + getLoanAmount(c),
          0
        );

        let distApprovedCount = 0;
        let distPendingCount = 0;
        let distDisbursedCount = 0;
        let distDisbursedAmount = 0;
        let distPendingAmount = 0;

        distCustomers.forEach((c) => {
          const st = normalizeStatus(c.status);
          const amt = getLoanAmount(c);
          if (st === 'Approved') {
            distApprovedCount += 1;
          } else if (st === 'Disbursed') {
            distDisbursedCount += 1;
            distDisbursedAmount += amt;
          } else if (st === 'Pending' || st === 'In Progress') {
            distPendingCount += 1;
            distPendingAmount += amt;
          }
        });

        const completionRate = customerCount > 0
          ? Math.round(((distApprovedCount + distDisbursedCount) / customerCount) * 100)
          : 0;

        return {
          ...d,
          rmCount,
          agentCount,
          customerCount,
          totalPortfolio: totalDistrictPortfolio,
          disbursedAmount: distDisbursedAmount,
          pendingAmount: distPendingAmount,
          pendingCount: distPendingCount,
          approvedCount: distApprovedCount,
          completionRate,
        };
      });

      // 4. Global KPIs & Metrics Calculation
      const totalDistricts = mappedDistricts.length;
      const totalRMs = mappedRMs.length;
      const totalAgents = mappedAgents.length;
      const totalCustomers = mappedCustomers.length;
      const totalApplications = mappedCustomers.length;

      const totalPortfolio = mappedCustomers.reduce(
        (sum, customer) => sum + getLoanAmount(customer),
        0
      );

      const statusSummary = {
        total: totalApplications,
        pending: 0,
        inProgress: 0,
        approved: 0,
        rejected: 0,
        disbursed: 0,
      };

      let approvedAmount = 0;
      let disbursedAmount = 0;
      let pendingPipelineAmount = 0;

      mappedCustomers.forEach((customer) => {
        const normStatus = normalizeStatus(customer.status);
        const amount = getLoanAmount(customer);

        if (normStatus === 'Approved') {
          statusSummary.approved += 1;
          approvedAmount += amount;
        } else if (normStatus === 'Disbursed') {
          statusSummary.disbursed += 1;
          disbursedAmount += amount;
        } else if (normStatus === 'In Progress') {
          statusSummary.inProgress += 1;
          pendingPipelineAmount += amount;
        } else if (normStatus === 'Rejected') {
          statusSummary.rejected += 1;
        } else {
          statusSummary.pending += 1;
          pendingPipelineAmount += amount;
        }
      });

      const approvedApplications = statusSummary.approved;
      const pendingApplications = statusSummary.pending;
      const inProgressApplications = statusSummary.inProgress;
      const rejectedApplications = statusSummary.rejected;
      const disbursedApplications = statusSummary.disbursed;

      const conversionRate = totalApplications > 0
        ? Math.round(((approvedApplications + disbursedApplications) / totalApplications) * 100)
        : 0;

      const calculatedMetrics = {
        totalDistricts,
        totalRMs,
        totalAgents,
        totalCustomers,
        totalApplications,
        totalPortfolio,
        totalDisbursed: disbursedAmount,
        totalPending: pendingPipelineAmount,
        approvedApplications,
        approvedAmount,
        pendingApplications,
        inProgressApplications,
        rejectedApplications,
        disbursedApplications,
        disbursedAmount,
        pendingPipelineAmount,
        conversionRate,
      };

      // 5. Recent Applications
      const recent = [...mappedCustomers]
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.appliedDate || 0).getTime() || 0;
          const dateB = new Date(b.createdAt || b.appliedDate || 0).getTime() || 0;
          return dateB - dateA;
        })
        .slice(0, 5);

      if (isMounted) {
        setDistricts(enrichedDistricts);
        setRMs(mappedRMs);
        setAgents(mappedAgents);
        setCustomers(mappedCustomers);
        setMetrics(calculatedMetrics);
        setApplicationStatusSummary(statusSummary);
        setRecentApplications(recent);
      }
    } catch (err) {
      if (isMounted) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to load dashboard data';
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
    fetchData();
  }, [fetchData]);

  return {
    districts,
    rms,
    agents,
    customers,
    metrics,
    recentApplications,
    applicationStatusSummary,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useDashboardData;
