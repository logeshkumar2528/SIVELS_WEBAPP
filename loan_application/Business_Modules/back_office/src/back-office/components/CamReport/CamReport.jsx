/**
 * CamReport — Credit Approval Memorandum (CAM)
 *
 * Read-only, A4 paginated memorandum assembled from the application's back-office data
 * (application form, PD assessment, eligibility, banking, RTR, asset base, health checks,
 * deviations and workflow history). Values that are not captured anywhere yet are left blank.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import axiosInstance from '../../../../../../Core/src/api/axiosInstance';
import backOfficeService, { unwrapResponse } from '../../api/backOfficeService';
import { buildNormalIncomeSummary } from '../../utils/normalIncomeSheetParser';
import LogoImage from '../../../../../../Core/src/assets/branding/SivelsFinanceLogo.jpg';
import './CamReport.css';

const BRAND_NAME = 'Sivels Finance';

const toList = (res) => {
  if (Array.isArray(res)) return res;
  const inner = res?.value ?? res?.data ?? res?.items ?? res?.assets;
  return Array.isArray(inner) ? inner : [];
};

const settledValue = (result) => (result?.status === 'fulfilled' ? result.value : null);

const getMaster = async (path) => unwrapResponse(await axiosInstance.get(path));

const firstRecord = (v) => (Array.isArray(v) ? v[0] : v) || null;

const nameById = (list, idKey, nameKey, id) => {
  if (id == null || id === '') return null;
  const row = (list || []).find((item) => String(item?.[idKey]) === String(id));
  return row ? row[nameKey] : null;
};

const isBlank = (v) =>
  v == null ||
  (typeof v === 'string' && ['', 'not available', 'n/a', '—'].includes(v.trim().toLowerCase()));

const pick = (obj, keys) => {
  if (!obj) return null;
  for (const key of keys) {
    if (!isBlank(obj[key])) return obj[key];
  }
  return null;
};

const dash = (v) => (isBlank(v) ? '' : v);

const toNumber = (v) => {
  if (isBlank(v)) return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const fmtINR = (v) => {
  const n = toNumber(v);
  return n == null ? '' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtNum = (v, digits = 2) => {
  const n = toNumber(v);
  return n == null ? '' : n.toFixed(digits);
};

const fmtPercent = (v) => {
  const n = toNumber(v);
  return n == null ? '' : `${n.toFixed(2)}%`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtDate = (v) => {
  if (isBlank(v)) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

const fmtDateTime = (v) => {
  if (isBlank(v)) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((p) => String(p).padStart(2, '0')).join(':');
  return `${fmtDate(v)} ${time}`;
};

const humanize = (v) =>
  isBlank(v) ? '' : String(v).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').trim();

const ageFromDob = (dob) => {
  if (isBlank(dob)) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return age > 0 ? age : null;
};

const ASSESSMENT_PROGRAMS = {
  1: 'Assessed Income Program',
  2: 'ABB Program',
  3: 'RTR Program',
  4: 'Normal Income Program',
};

const RISK_ROWS = [
  'Management Risk',
  'Demand Risk / Business Continuity Risk',
  'Security Enforceability Risk (Primary & Collateral)',
  'Regulatory Risk',
  'Funds Diversion Risk',
];

const CREDIT_RATING_ROWS = [
  ['School Vintage', '5%'],
  ['No of Students', '8%'],
  ['Trend in Student Growth', '4%'],
  ['Type of school', '10%'],
  ['Overall Fees', '8%'],
  ['Trend in Fees', '5%'],
  ['CIBIL Score - Max', '6%'],
  ['CIBIL Score - Min', '4%'],
  ['RTR – Max', '6%'],
  ['RTR – Min', '4%'],
  ['Fees from Owned : Rented', '8%'],
  ['Loan to Fees Ratio', '12%'],
  ['ABB:EMI', '4%'],
  ['FOIR', '12%'],
  ['Banking Credits/Fees', '4%'],
];

const STUDENT_CLASSES = ['Nursary', 'LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'Books', 'Uniform', 'Transport'];

const KEY_FINANCIAL_ROWS = [
  'Total Operating Income', 'EBITDA', 'EBITDA Margin', 'Interest', 'Depreciation', 'Operating Profit',
  'Non Operating Income', 'PBT', 'PAT (Excluding Non Business Income)', 'Net Fixed Assets', 'Tangible Net Worth',
  'Adjusted Tangible Net Worth', 'Investments/Advances to Group Co etc', 'Salaries payable (as per financials)',
  'Fees receivable (as per financials)', 'Total Debt', 'Total Debt/ATNW', 'Interest Coverage Ratio',
];

const HEALTH_CHECK_FALLBACK = ['Google', 'Reference', 'FI', 'Crimecheck', 'Hunter', 'RCU', 'Dedupe', 'PAN Check', 'Aadhar Check', 'CERSAI Check'];

/* ── Layout primitives ─────────────────────────────────────────────── */

function CamPage({ number, footer, children, className = '' }) {
  return (
    <section className={`cam-page ${className}`}>
      <img className="cam-page-brand" src={LogoImage} alt={BRAND_NAME} />
      <div className="cam-page-body">{children}</div>
      <footer className="cam-page-footer">
        <span>{footer}</span>
        <span>Page {number}</span>
      </footer>
    </section>
  );
}

function KvTable({ rows }) {
  return (
    <table className="cam-table cam-kv">
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>
            {row.length === 2 ? (
              <>
                <th>{row[0]}</th>
                <td colSpan={3}>{dash(row[1])}</td>
              </>
            ) : (
              <>
                <th>{row[0]}</th>
                <td>{dash(row[1])}</td>
                <th>{row[2]}</th>
                <td>{dash(row[3])}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GridTable({ headers, rows, emptyRows = 1, footerRow = null }) {
  const body = rows.length > 0 ? rows : Array.from({ length: emptyRows }, () => headers.map(() => ''));
  return (
    <table className="cam-table cam-grid">
      <thead>
        <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {body.map((row, idx) => (
          <tr key={idx}>{row.map((cell, cIdx) => <td key={cIdx}>{dash(cell)}</td>)}</tr>
        ))}
        {footerRow && (
          <tr className="cam-total-row">{footerRow.map((cell, cIdx) => <td key={cIdx}>{dash(cell)}</td>)}</tr>
        )}
      </tbody>
    </table>
  );
}

function SectionTitle({ children }) {
  return <h3 className="cam-section-title">{children}</h3>;
}

function TextBlock({ value }) {
  return <div className="cam-text-block">{dash(value)}</div>;
}

/* ── Main component ────────────────────────────────────────────────── */

export default function CamReport({
  verificationData,
  coApplicants = [],
  applicationProductDetailsId,
  agentCustomerId,
  healthChecks = {},
  fallbackRecommendation = null,
}) {
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  useEffect(() => {
    const appProdId = Number(applicationProductDetailsId);
    if (!appProdId || appProdId <= 0) return undefined;
    let isMounted = true;

    const custId = Number(agentCustomerId) > 0 ? Number(agentCustomerId) : null;
    const coSequences = coApplicants.map((co) => co.sequence).filter((seq) => Number(seq) > 0);
    const rawResponse = verificationData?.raw || {};
    const rmId =
      rawResponse.rmId ??
      firstRecord(rawResponse.customer)?.rmId ??
      firstRecord(rawResponse.productDetails)?.product?.rmId ??
      verificationData?.rmId;

    async function load() {
      setLoading(true);
      const [extraResults, masterResults] = await Promise.all([
        Promise.allSettled([
          custId ? backOfficeService.getEligibilityNormalIncome(appProdId, custId) : Promise.resolve(null),
          backOfficeService.getNormalIncomeBySeq(appProdId, 0),
          custId ? backOfficeService.getLatestCreditDecision(custId) : Promise.resolve(null),
          backOfficeService.getCreditManagers(),
          backOfficeService.getStepVerificationsByApplication(appProdId),
          backOfficeService.getApplicationDocuments(appProdId),
          Promise.all(coSequences.map((seq) => backOfficeService.getOtherIncomeBySeq(appProdId, seq).catch(() => []))),
        ]),
        Promise.allSettled([
          getMaster('/SourcingChannelMaster'),
          getMaster('/City'),
          getMaster('/State'),
          getMaster('/LoanTransactionTypeMaster'),
          getMaster('/RelationshipMaster'),
          getMaster('/company/companyloansetting'),
          rmId ? backOfficeService.getRMById(rmId) : Promise.resolve(null),
          getMaster('/BackOfficeMaster'),
        ]),
      ]);
      const [sourcingChannels, cities, states, transactionTypes, relationships, loanSettings, rm, backOfficeUsers] =
        masterResults.map(settledValue);

      const firstAddress = firstRecord(rawResponse.addressDetails || rawResponse.AddressDetails) || {};
      const city = toList(cities).find(
        (c) => String(c.cityId) === String(firstAddress.cityId ?? firstAddress.CityId)
      );
      const districtId = verificationData?.districtId ?? city?.districtId ?? firstRecord(rm)?.districtId;
      const district = districtId
        ? await backOfficeService.getDistrictById(districtId).catch(() => null)
        : null;
      const results = await Promise.allSettled([
        backOfficeService.getApplicationAssets(appProdId),
        backOfficeService.getPropertyMaster(),
        backOfficeService.getMortgageStatusMaster(),
        backOfficeService.getLoanObligations(appProdId, 0),
        backOfficeService.getLoanObligationsSummary(appProdId, 0),
        backOfficeService.getRtrLoanStatusMaster(),
        backOfficeService.getBankingAnalysis(appProdId),
        backOfficeService.getDeviationMasters(),
        backOfficeService.getApplicationDeviationDecisions(appProdId),
        backOfficeService.getPdAssessmentByApplication(appProdId),
        backOfficeService.getAssessmentsByApplication(appProdId),
        backOfficeService.getHealthCheckTypes(),
        agentCustomerId ? backOfficeService.getApplicationWorkflowHistory(agentCustomerId) : Promise.resolve([]),
      ]);
      if (!isMounted) return;

      const [
        assets, propertyMaster, mortgageMaster, obligations, obligationSummary, rtrStatuses,
        banking, deviationMasters, deviationDecisions, pdAssessment, assessments, healthCheckTypes, history,
      ] = results.map(settledValue);
      const [
        normalIncome, normalIncomeYears, creditDecision, creditManagers, stepVerifications,
        applicationDocuments, coOtherIncome,
      ] = extraResults.map(settledValue);

      let normalIncomeSummary = { ...(normalIncome?.summary || {}) };
      if (Array.isArray(normalIncome?.values) && normalIncome.values.length > 0) {
        try {
          const parsed = buildNormalIncomeSummary(normalIncome.values) || {};
          Object.entries(parsed).forEach(([key, value]) => {
            if (isBlank(normalIncomeSummary[key]) && !isBlank(value) && !Number.isNaN(value)) {
              normalIncomeSummary[key] = value;
            }
          });
        } catch (err) {
          console.warn('[CamReport] Could not parse normal income grid:', err);
        }
      }

      setData({
        sourcingChannels: toList(sourcingChannels),
        city: city || null,
        states: toList(states),
        transactionTypes: toList(transactionTypes),
        relationships: toList(relationships),
        loanSetting: firstRecord(toList(loanSettings).filter((s) => s && s.isActive !== false)),
        rm: firstRecord(rm),
        backOfficeUsers: toList(backOfficeUsers),
        normalIncomeSummary,
        normalIncomeYears: toList(normalIncomeYears),
        creditDecision: Array.isArray(creditDecision) ? creditDecision[0] : creditDecision,
        creditManagers: toList(creditManagers),
        stepVerifications: toList(stepVerifications),
        applicationDocuments: toList(applicationDocuments),
        district: Array.isArray(district) ? district[0] : district,
        coOtherIncome: (coOtherIncome || []).flatMap((res) => toList(res)),
        assets: toList(assets),
        propertyMaster: toList(propertyMaster),
        mortgageMaster: toList(mortgageMaster),
        obligations: toList(obligations),
        obligationSummary: obligationSummary || null,
        rtrStatuses: toList(rtrStatuses),
        banking: banking || null,
        deviationMasters: toList(deviationMasters),
        deviationDecisions: toList(deviationDecisions),
        pdAssessment: Array.isArray(pdAssessment) ? pdAssessment[0] : pdAssessment,
        assessments: toList(assessments),
        healthCheckTypes: toList(healthCheckTypes).filter((t) => t.isActive !== false),
        history: toList(history),
      });
      setLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [applicationProductDetailsId, agentCustomerId, verificationData?.districtId, coApplicants.length]);

  /* ── Derived values ──────────────────────────────────────────────── */

  const app = verificationData?.applicationDetails || {};
  const address = verificationData?.addressDetails?.currentAddress || {};
  const raw = verificationData?.raw || {};
  const employmentRaw = Array.isArray(raw.employmentIncome || raw.EmploymentIncome)
    ? (raw.employmentIncome || raw.EmploymentIncome)
    : [];
  const collateralRaw = Array.isArray(verificationData?.collateral?.raw) ? verificationData.collateral.raw : [];
  const applicantEmp = employmentRaw[0] || verificationData?.employmentIncome?.raw || {};

  const creditDecision = data.creditDecision || null;
  const decisionStatus = pick(creditDecision, ['decision', 'Decision']);
  const isApproved = String(decisionStatus || '').toLowerCase() === 'approved';
  const sanctioned = (keys) => (isApproved ? toNumber(pick(creditDecision, keys)) : null);
  const sanctionedAmount = sanctioned(['sanctionedLoanAmount', 'SanctionedLoanAmount']);
  const sanctionedROI = sanctioned(['sanctionedROI', 'SanctionedROI', 'sanctionedRoi']);
  const sanctionedTenure = sanctioned(['sanctionedTenureMonths', 'SanctionedTenureMonths']);

  const applicantName = dash(verificationData?.customerName);
  const institutionName = pick(applicantEmp, ['employerBusinessName', 'EmployerBusinessName', 'companyName']);
  const productWrapper = firstRecord(raw.productDetails || raw.productDetailsList || raw.ProductDetails) || {};
  const productRecord = productWrapper.product || productWrapper;
  const rawCustomer = firstRecord(raw.customer) || {};
  const rawAddress = firstRecord(raw.addressDetails || raw.AddressDetails) || {};

  const loanAmount = sanctionedAmount ?? toNumber(data.obligationSummary?.proposedLoanAmount) ?? toNumber(productRecord.loanAmount) ?? toNumber(app.loanAmount);
  const branch =
    pick(rawCustomer, ['branch', 'Branch']) ??
    pick(data.rm, ['branch', 'Branch']) ??
    pick(app, ['sourcingBranch']);
  const zone = pick(data.district, ['zone', 'Zone', 'zoneName', 'ZoneName']);
  const sourcingBy =
    pick(raw, ['rmName', 'RmName']) ??
    pick(productRecord, ['rmName', 'RmName']) ??
    pick(data.rm, ['fullName', 'FullName']) ??
    verificationData?.rmName;
  const agentName = pick(raw, ['agentName', 'AgentName']) ?? verificationData?.agentName;
  const channelName =
    nameById(data.sourcingChannels, 'sourcingChannelId', 'sourcingChannelName', productRecord.sourcingChannelId) ??
    pick(productWrapper, ['sourcingChannelName', 'SourcingChannelName']);
  const sourcingChannel = [channelName, isBlank(agentName) ? null : agentName].filter(Boolean).join(' - ') || null;
  const distanceFromBranch = pick(productRecord, ['distanceFromBranch', 'DistanceFromBranch']) ?? app.distanceFromBranch;
  const cityName = pick(data.city, ['cityName']) ?? (address.city !== address.district ? address.city : null);
  const stateName =
    nameById(data.states, 'stateId', 'stateName', rawAddress.stateId ?? data.city?.stateId) ?? address.state;
  const transactionType =
    nameById(data.transactionTypes, 'loanTransactionTypeId', 'transactionTypeName', productRecord.loanTransactionTypeId) ??
    app.transactionType;
  const loanPurpose =
    pick(productWrapper, ['loanPurposeName', 'LoanPurposeName']) ??
    pick(app.raw, ['loanPurposeName', 'LoanPurposeName']) ??
    pick(rawCustomer, ['loanPurposeName', 'LoanPurposeName']);
  const loanSetting = data.loanSetting || {};
  const processingFeePct = toNumber(loanSetting.defaultProcessingFee);
  const insurancePct = toNumber(loanSetting.defaultInsurancePercentage);
  const product = dash(pick(productWrapper, ['loanProductName', 'LoanProductName']) ?? app.loanProduct);
  const location = [cityName, stateName].filter((v) => !isBlank(v)).join(', ').toUpperCase();

  const footer = `Name of Applicant: ${applicantName} // INR ${loanAmount ?? ''} // Branch- ${dash(branch)} // ${product}`;

  const recommendation = useMemo(() => {
    const r = data.pdAssessment;
    if (r && (r.pdAssessmentId || r.PdAssessmentId || r.id)) {
      const rawConditions = r.sanctionConditions || r.SanctionConditions || [];
      return {
        pdVisitDate: r.dateOfPdVisit ?? r.DateOfPdVisit,
        pdAddress: r.pdAddress ?? r.PdAddress,
        endUseCategory: r.endUseCategorization ?? r.EndUseCategorization,
        personalDiscussionSiteVisit: r.personalDiscussionSiteVisit ?? r.PersonalDiscussionSiteVisit,
        endUse: r.endUse ?? r.EndUse,
        disbursementTransaction: r.disbursementTransaction ?? r.DisbursementTransaction,
        applicantProfile: r.applicantProfile ?? r.ApplicantProfile,
        coApplicantProfile: r.coApplicantProfile ?? r.CoApplicantProfile,
        bureauReport: r.bureauReport ?? r.BureauReport,
        proposedCollateral: r.proposedCollateral ?? r.ProposedCollateral,
        legalAndTechnical: r.legalTechnicalReview ?? r.LegalTechnicalReview,
        strengths: r.strengths ?? r.Strengths,
        concerns: r.concerns ?? r.Concerns,
        recommendation: r.recommendation ?? r.Recommendation,
        finalRemarks: r.finalRemarks ?? r.FinalRemarks,
        pdDoneById: r.modifiedBy ?? r.createdBy ?? r.CreatedBy,
        otherSanctionConditions: (Array.isArray(rawConditions) ? rawConditions : [])
          .map((c) => (typeof c === 'string' ? c : c?.conditionText ?? c?.ConditionText ?? ''))
          .filter(Boolean),
      };
    }
    const f = fallbackRecommendation || {};
    return { ...f, otherSanctionConditions: (f.otherSanctionConditions || []).filter(Boolean) };
  }, [data.pdAssessment, fallbackRecommendation]);

  const pdDoneBy = nameById(data.backOfficeUsers, 'backOfficeId', 'fullName', recommendation.pdDoneById);

  const assessment = useMemo(() => {
    const list = (data.assessments || []).filter(
      (a) => a && a.isActive !== false && Number(a.applicantSequence || 0) === 0
    );
    if (list.length === 0) return null;
    const current = list.filter((a) => a.isCurrent !== false);
    const pool = current.length > 0 ? current : list;
    return [...pool].sort((a, b) => {
      const aHas = Number(a.maximumEligibleLoanAmount || 0) > 0 ? 1 : 0;
      const bHas = Number(b.maximumEligibleLoanAmount || 0) > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return new Date(b.calculatedAt || 0) - new Date(a.calculatedAt || 0);
    })[0];
  }, [data.assessments]);

  const proposedROI = sanctionedROI ?? pick(data.obligationSummary, ['proposedROI']) ?? pick(assessment, ['proposedROI']) ?? toNumber(app.interestRate);
  const proposedTenure = sanctionedTenure ?? pick(data.obligationSummary, ['proposedTenureMonths']) ?? pick(assessment, ['proposedTenureMonths']) ?? toNumber(app.loanTenure);
  const proposedEMI = pick(data.obligationSummary, ['proposedEMI']) ?? pick(assessment, ['proposedEMI']);

  const niSummary = data.normalIncomeSummary || {};
  const firstValue = (...values) => values.find((v) => !isBlank(v) && !Number.isNaN(v)) ?? null;
  const eligibility = {
    totalIncome: firstValue(assessment?.totalConsideredIncome, niSummary.totalIncomeAnnual),
    foirAmount: firstValue(assessment?.eligibleEMI, niSummary.eligibleMonthlyIncome),
    existingEmi: firstValue(assessment?.existingEMI, niSummary.existingMonthlyObligations),
    netServiceable: firstValue(assessment?.netServiceableIncome, niSummary.netServiceableIncome),
    emiFactor: firstValue(assessment?.emiFactor, niSummary.emiFactor),
    eligibilityLacs: firstValue(assessment?.maximumEligibleLoanAmount, niSummary.loanEligibilityLacs),
    actualFoir: (() => {
      const ratio = toNumber(assessment?.actualFOIR);
      if (ratio != null) return ratio <= 1 ? ratio * 100 : ratio;
      return firstValue(niSummary.actualFoirPercent);
    })(),
  };

  const coOtherIncome = (data.coOtherIncome || []).filter((r) => r && r.isActive !== false);
  const coOtherIncomeTotal = coOtherIncome.length > 0
    ? coOtherIncome.reduce((sum, r) => {
      const amount = toNumber(r.incomeAmount ?? r.annualIncomeAmount) || 0;
      const pct = toNumber(r.considerationPercentage);
      return sum + (amount * (pct == null ? 100 : pct)) / 100;
    }, 0)
    : null;

  const financialYears = useMemo(() => {
    const rows = (data.normalIncomeYears || [])
      .filter((r) => r && r.isActive !== false && !isBlank(r.financialYear))
      .sort((a, b) => String(a.financialYear).localeCompare(String(b.financialYear)))
      .slice(-2);
    return rows;
  }, [data.normalIncomeYears]);
  const fyLabel = (idx) => financialYears[idx]?.financialYear || (idx === 0 ? 'Previous FY' : 'Latest FY');
  const fyValue = (idx, recordKey, summaryKey) =>
    firstValue(financialYears[idx]?.[recordKey], niSummary[`${summaryKey}Fy${idx + 1}`]);
  const financialRowValues = {
    Depreciation: [fmtINR(fyValue(0, 'depreciation', 'depreciation')), fmtINR(fyValue(1, 'depreciation', 'depreciation'))],
    'PAT (Excluding Non Business Income)': [fmtINR(fyValue(0, 'pat', 'pat')), fmtINR(fyValue(1, 'pat', 'pat'))],
  };

  const latestDocument = (type) =>
    (data.applicationDocuments || [])
      .filter((d) => d && d.isActive !== false && String(d.documentType || '').trim().toUpperCase() === type)
      .sort((a, b) => new Date(b.uploadedAt || b.createdAt || 0) - new Date(a.uploadedAt || a.createdAt || 0))[0] || null;
  const documentSummary = (doc) =>
    doc ? [doc.documentStatus, doc.remarks].filter((v) => !isBlank(v)).join(' - ') : null;
  const legalStatus = documentSummary(latestDocument('LEGAL_OPINION'));
  const technicalStatus = documentSummary(latestDocument('TECHNICAL_VALUATION'));

  const creditManagerName = useMemo(() => {
    const id = pick(creditDecision, ['creditManagerId', 'CreditManagerId']);
    if (id == null) return null;
    const manager = (data.creditManagers || []).find(
      (m) => String(m.creditManagerId ?? m.CreditManagerId ?? m.id ?? m.Id) === String(id)
    );
    return pick(manager, ['fullName', 'FullName', 'name', 'Name']) || `Credit Manager #${id}`;
  }, [creditDecision, data.creditManagers]);
  const approvingAuthority = creditDecision
    ? [creditManagerName, decisionStatus ? humanize(decisionStatus) : null].filter(Boolean).join(' - ') +
      (pick(creditDecision, ['decidedAt', 'DecidedAt', 'createdAt']) ? ` (${fmtDate(pick(creditDecision, ['decidedAt', 'DecidedAt', 'createdAt']))})` : '')
    : null;
  const decisionRemarks = pick(creditDecision, ['remarks', 'Remarks']);
  const decisionConditions = (() => {
    const rawConditions = pick(creditDecision, ['conditions', 'Conditions']);
    if (Array.isArray(rawConditions)) {
      return rawConditions
        .map((c) => (typeof c === 'string' ? c : c?.conditionText ?? c?.ConditionText ?? ''))
        .filter((c) => !isBlank(c));
    }
    return isBlank(rawConditions) ? [] : String(rawConditions).split(/\r?\n/).map((c) => c.trim()).filter(Boolean);
  })();

  const coApplicantRows = coApplicants.map((co) => {
    const pers = co.personalRecord || {};
    const emp = employmentRaw.find((e) => Number(e?.applicantSequence ?? e?.ApplicantSequence) === co.sequence) || {};
    return {
      name: co.name,
      age: pick(pers, ['age', 'Age']) ?? ageFromDob(pick(pers, ['dateOfBirth', 'DateOfBirth'])),
      relationship:
        pick(pers, ['relationshipWithApplicantName', 'relationshipName', 'RelationshipName', 'relationWithApplicant', 'relationship']) ??
        nameById(data.relationships, 'relationshipId', 'relationshipName', pers.relationshipId ?? pers.RelationshipId),
      designation: pick(emp, ['designationNatureOfBusiness', 'DesignationNatureOfBusiness', 'designation']),
    };
  });

  const securityRows = collateralRaw.map((c) => {
    const value = toNumber(pick(c, ['estimatedValue', 'EstimatedValue', 'finalValue']));
    const ltv = value && loanAmount ? Math.round((loanAmount / value) * 100) : null;
    return [
      pick(c, ['ownerName', 'OwnerName', 'propertyOwnerName', 'ownershipTypeName']),
      pick(c, ['propertyName', 'PropertyName', 'propertyType']),
      pick(c, ['locationAddress', 'LocationAddress']),
      fmtINR(value),
      ltv,
      pick(c, ['legalStatus', 'LegalStatus']) ?? legalStatus,
    ];
  });
  const collateralTotal = collateralRaw.reduce(
    (sum, c) => sum + (toNumber(pick(c, ['estimatedValue', 'EstimatedValue'])) || 0),
    0
  );

  const propertyNameMap = useMemo(
    () => new Map((data.propertyMaster || []).map((p) => [Number(p.propertyId ?? p.id), p.propertyName || p.name || p.propertyCode])),
    [data.propertyMaster]
  );
  const mortgageNameMap = useMemo(
    () => new Map((data.mortgageMaster || []).map((m) => [Number(m.mortgageStatusId ?? m.id), m.mortgageStatusName || m.name || m.mortgageStatusCode])),
    [data.mortgageMaster]
  );
  const activeAssets = (data.assets || []).filter((a) => a && a.isActive !== false);
  const assetRows = activeAssets.map((a, idx) => [
    idx + 1,
    a.propertyName || propertyNameMap.get(Number(a.propertyId)),
    a.propertyOwner,
    a.mortgageStatusName || mortgageNameMap.get(Number(a.mortgageStatusId)),
    toNumber(a.marketValue) != null ? `Rs. ${toNumber(a.marketValue).toLocaleString('en-IN')}` : '',
  ]);
  const assetTotal = activeAssets.reduce((sum, a) => sum + (toNumber(a.marketValue) || 0), 0);

  const rtrStatusMap = useMemo(
    () => new Map((data.rtrStatuses || []).map((s) => [Number(s.rtrLoanStatusId), s.statusName])),
    [data.rtrStatuses]
  );
  const obligations = (data.obligations || []).filter((o) => o && o.isActive !== false);
  const obligationRows = obligations.map((o) => [
    o.borrowerName,
    o.lenderName,
    o.product,
    o.statusName || rtrStatusMap.get(Number(o.rtrLoanStatusId)),
    fmtINR(o.loanAmount),
    fmtINR(o.emiAmount),
    fmtINR(o.currentPOS),
    fmtNum(o.tenureMonths),
    fmtNum(o.paidTenureMonths),
    o.bounceCount ?? 0,
    o.isFoirApplicable === true || o.isFoirApplicable === 'Yes' ? 'Yes' : (o.isFoirApplicable === false || o.isFoirApplicable === 'No' ? 'No' : ''),
  ]);
  const sumOf = (key) => obligations.reduce((sum, o) => sum + (toNumber(o[key]) || 0), 0);
  const rtrBucketMap = new Map((data.rtrStatuses || []).map((s) => [Number(s.rtrLoanStatusId), String(s.summaryBucket || '').toUpperCase()]));
  const liveObligations = obligations.filter((o) => rtrBucketMap.get(Number(o.rtrLoanStatusId)) === 'LIVE');
  const existingExposure = liveObligations.length > 0
    ? liveObligations.reduce((sum, o) => sum + (toNumber(o.currentPOS) || 0), 0)
    : null;
  const totalExposure = existingExposure != null || loanAmount != null
    ? (existingExposure || 0) + (loanAmount || 0)
    : null;
  const rtrComments = [...new Set(obligations.map((o) => o.rtrComments).filter((c) => !isBlank(c)))];

  const bankingBanks = Array.isArray(data.banking?.banks) ? data.banking.banks : [];
  const bankingTotal = data.banking?.total || null;
  const bankingRow = (b) => [
    b.bankName,
    b.accountType,
    fmtINR(b.annualisedBusinessCredit),
    fmtINR(b.abb),
    fmtNum(b.iwBouncePercent),
    fmtNum(b.owBouncePercent),
    fmtNum(b.abbToEMI),
    b.remarks,
  ];

  const deviationRows = useMemo(() => {
    const masters = new Map((data.deviationMasters || []).map((m) => [String(m.deviationId ?? m.DeviationId ?? m.id), m]));
    return (data.deviationDecisions || [])
      .filter((d) => String(d.decision ?? d.Decision ?? '').toLowerCase() === 'yes')
      .map((d) => {
        const m = masters.get(String(d.deviationId ?? d.DeviationId)) || {};
        return [
          pick(m, ['programSection', 'ProgramSection', 'program', 'section']),
          pick(m, ['deviationDescription', 'DeviationDescription', 'description']),
          pick(m, ['approvingAuthority', 'ApprovingAuthority']),
          pick(m, ['deviationNorms', 'DeviationNorms']) ?? pick(d, ['remarks', 'Remarks']),
        ];
      });
  }, [data.deviationMasters, data.deviationDecisions]);

  const healthCheckRows = useMemo(() => {
    const verifs = (data.stepVerifications || []).filter((v) => v && v.isActive !== false);
    const verifsFor = (codes, primaryOnly) =>
      verifs.filter(
        (v) =>
          codes.includes(String(v.stepCode || '').trim().toUpperCase()) &&
          (!primaryOnly || Number(v.applicantSequence || 0) === 0)
      );
    const fromVerifications = (name) => {
      const key = String(name || '').trim().toUpperCase();
      let rows = [];
      if (key === 'FI' || key.includes('FIELD INVESTIGATION')) rows = verifsFor(['PROPERTY_FI', 'OFFICE_FI', 'RESIDENCE_FI'], false);
      else if (key.startsWith('PAN')) rows = verifsFor(['PAN'], true);
      else if (key.includes('AADHA')) rows = verifsFor(['AADHAAR'], true);
      if (rows.length === 0) return null;
      const dates = rows
        .map((v) => v.verifiedAt || v.modifiedAt || v.modifiedDate || v.createdAt || v.createdDate)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a));
      const findings = rows
        .map((v) => {
          const label = rows.length > 1 ? `${humanize(String(v.stepCode).replace(/_/g, ' '))}: ` : '';
          return isBlank(v.remarks) ? null : `${label}${v.remarks}`;
        })
        .filter(Boolean)
        .join('; ');
      return {
        status: rows.every((v) => Boolean(v.isVerified)) ? 'Yes' : 'Pending',
        dateOfCheck: dates[0],
        findings,
      };
    };
    const rowFor = (name, sessionEntry = {}) => {
      const hasSession =
        !isBlank(sessionEntry.dateOfCheck) ||
        !isBlank(sessionEntry.findings) ||
        (!isBlank(sessionEntry.status) && sessionEntry.status !== 'Pending');
      const entry = hasSession ? sessionEntry : (fromVerifications(name) || sessionEntry);
      return [name, entry.status, isBlank(entry.dateOfCheck) ? '' : fmtDate(entry.dateOfCheck), entry.findings];
    };
    const types = data.healthCheckTypes || [];
    if (types.length === 0) return HEALTH_CHECK_FALLBACK.map((name) => rowFor(name));
    return types.map((t) => rowFor(t.checkName, healthChecks?.[t.healthCheckTypeId] || {}));
  }, [data.healthCheckTypes, data.stepVerifications, healthChecks]);

  const historyRows = (data.history || []).map((h, idx) => [
    idx + 1,
    h.performedByName || h.PerformedByName || (h.performedByUserId ? `User ${h.performedByUserId}` : ''),
    h.performedByRole || h.PerformedByRole,
    humanize(h.actionType || h.ActionType),
    h.remarks || h.Remarks,
    fmtDateTime(h.createdDate || h.CreatedDate || h.createdAt || h.CreatedAt),
  ]);

  const sanctionConditions = [...(recommendation.otherSanctionConditions || []), ...decisionConditions];

  /* ── Export ──────────────────────────────────────────────────────── */

  const handlePrint = useCallback(() => {
    const root = reportRef.current;
    if (!root) return;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');
    doc.open();
    doc.write(`<!doctype html><html><head><title>CAM</title>${styles}</head><body style="margin:0;background:#fff">${root.outerHTML}</body></html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 500);
    }, 400);
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    const root = reportRef.current;
    if (!root) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const pages = Array.from(root.querySelectorAll('.cam-page'));
      let pdf = null;
      for (const page of pages) {
        const canvas = await html2canvas(page, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
        const width = 210;
        const height = Math.max(297, (canvas.height * width) / canvas.width);
        const imgHeight = (canvas.height * width) / canvas.width;
        if (!pdf) {
          pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [width, height], compress: true });
        } else {
          pdf.addPage([width, height], 'portrait');
        }
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, width, imgHeight, undefined, 'FAST');
      }
      const ref = verificationData?.appId || verificationData?.customerCode || agentCustomerId || 'Application';
      pdf?.save(`CAM_${ref}.pdf`);
    } catch (err) {
      console.error('[CamReport] Failed to generate PDF:', err);
      setExportError('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [verificationData, agentCustomerId]);

  /* ── Render ──────────────────────────────────────────────────────── */

  let pageNo = 0;
  const nextPage = () => {
    pageNo += 1;
    return pageNo;
  };

  return (
    <div className="cam-report">
      <div className="cam-toolbar">
        <span className="cam-toolbar-status">{loading ? 'Loading CAM data…' : 'Credit Approval Memorandum'}</span>
        <div className="cam-toolbar-actions">
          {exportError && <span className="cam-toolbar-error">{exportError}</span>}
          <button type="button" className="cam-btn" onClick={handlePrint} disabled={loading}>Print</button>
          <button type="button" className="cam-btn cam-btn-primary" onClick={handleDownloadPdf} disabled={loading || isExporting}>
            {isExporting ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="cam-print-root" ref={reportRef}>
        {/* Cover */}
        <section className="cam-page cam-cover">
          <img className="cam-cover-brand" src={LogoImage} alt={BRAND_NAME} />
          <div className="cam-cover-body">
            <h1>Credit Approval Memorandum</h1>
            <h2>{product}</h2>
            <table className="cam-table cam-kv cam-cover-table">
              <tbody>
                <tr><th>Applicant Name</th><td>{applicantName}</td></tr>
                <tr><th>School Name</th><td>{dash(institutionName)}</td></tr>
                <tr><th>School Location</th><td>{dash(location)}</td></tr>
                <tr><th>Branch</th><td>{dash(branch)}</td></tr>
                <tr><th>Zone</th><td>{dash(zone)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="cam-cover-note">This document is for Company&apos;s internal processes</p>
        </section>

        {/* Sourcing and key loan terms */}
        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>Sourcing and Key Loan Terms:</SectionTitle>
          <KvTable
            rows={[
              ['Application ID', verificationData?.appId || verificationData?.customerCode, 'Proposal Date', fmtDate(verificationData?.appliedDate)],
              ['Branch', branch],
              ['Case Location', cityName, 'Distance from Branch', distanceFromBranch != null ? `${distanceFromBranch} KM` : null],
              ['Sourcing By', sourcingBy, 'Sourcing Channel', sourcingChannel],
              ['Applicant (School Name)', `${applicantName}${institutionName ? ` (${institutionName})` : ''}`],
            ]}
          />
          <h4 className="cam-sub-title">Co – Applicant / Guarantor (Individual)</h4>
          <GridTable
            headers={['Cust Name', 'Age', 'Relationship', 'Designation', 'Cibil']}
            rows={coApplicantRows.map((r) => [r.name, r.age, r.relationship, r.designation, ''])}
          />
          <h4 className="cam-sub-title">Co-Applicant / Guarantor (Non Individual)</h4>
          <GridTable headers={['Name', 'Constitution', 'Relationship', 'Cibil']} rows={[]} />
          <KvTable
            rows={[
              ['Program Type', ASSESSMENT_PROGRAMS[Number(assessment?.assessmentMethodId)], 'Loan Type (Term Loan)', transactionType],
              ['Loan Amount / Exposure', loanAmount != null ? `Rs. ${fmtINR(loanAmount)}` : null, 'Existing Group Exposure', existingExposure != null ? fmtINR(existingExposure) : null],
              ['Total Group Exposure', totalExposure != null ? `Rs. ${fmtINR(totalExposure)}` : null],
              ['Tenor (including Moratorium) - Term Loan', proposedTenure != null ? `${proposedTenure} Months` : null],
              ['Proposed ROI - Term Loan', proposedROI != null ? `${fmtNum(proposedROI)}%` : null],
              ['Processing Fees - Term Loan', processingFeePct != null ? `${fmtNum(processingFeePct)} % + GST` : null],
              ['Insurance GI', insurancePct != null ? fmtNum(insurancePct) : null, 'Insurance LI', null],
              ['Repayment Structure', proposedEMI != null ? `Equated Monthly Instalments of Rs. ${fmtNum(proposedEMI)}/-` : null],
              ['Pre-payment Charges', null],
              ['Property Value', collateralTotal > 0 ? `Rs. ${collateralTotal.toLocaleString('en-IN')}` : null, 'Business Segment', null],
              ['STP Score', null, 'Risk Grading', null],
            ]}
          />
        </CamPage>

        {/* Security details */}
        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>Security Details</SectionTitle>
          <GridTable
            headers={['Property Owner', 'Property Type', 'Property Address', 'Final Value', 'Final LTV', 'Legal Status']}
            rows={securityRows}
          />
          <KvTable rows={[['Additional Security', null]]} />
          <h4 className="cam-sub-title">FOIR</h4>
          <KvTable
            rows={[
              ['Year', 'Current Year'],
              ['FOIR (%)', eligibility.actualFoir != null ? fmtPercent(eligibility.actualFoir) : null],
              ['Loan to Fee Ratio', null],
            ]}
          />
          <SectionTitle>For Assessed Income Product - Trust or Society Details</SectionTitle>
          <KvTable
            rows={[
              ['Trust / Society Name:', applicantName],
              ['Applicant Constitution:', pick(applicantEmp, ['businessConstitutionName', 'BusinessConstitutionName'])],
              ['Registration No:', null, 'Registration Date:', null],
              ['Borrowing Clause:', null],
              ['Registration under sec 12A/12AA:', null],
            ]}
          />
          <h4 className="cam-sub-title">List Of Trustees Members</h4>
          <GridTable
            headers={['Sr No.', 'Name', 'Designation', 'Relationship', 'Taken on loan (Y/N)', 'Any other source of Income', 'Key Managerial Person']}
            rows={coApplicantRows.map((r, idx) => [idx + 1, r.name, r.designation, r.relationship, 'Y', '', ''])}
          />
        </CamPage>

        {/* Profiles, PD, end use, bureau, collateral */}
        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>2. Applicant Profile</SectionTitle>
          <TextBlock value={recommendation.applicantProfile} />
          <SectionTitle>3. Co-Applicant Profile</SectionTitle>
          <TextBlock value={recommendation.coApplicantProfile} />
          <SectionTitle>1. Personal Discussion (PD)/ Site Visit (SV)</SectionTitle>
          <TextBlock value={recommendation.personalDiscussionSiteVisit} />
          <h4 className="cam-sub-title">PD Sheet &amp; Fee Assesment</h4>
          <KvTable
            rows={[
              ['Date of PD Visit', fmtDate(recommendation.pdVisitDate), 'PD Done By', pdDoneBy],
              ['Address where PD conducted', recommendation.pdAddress],
              ['End Use Categorization', recommendation.endUseCategory],
            ]}
          />
          <SectionTitle>4. End Use</SectionTitle>
          <TextBlock
            value={[
              recommendation.endUse,
              loanPurpose ? `Loan Purpose: ${loanPurpose}` : null,
            ].filter((v) => !isBlank(v)).join('\n')}
          />
          <SectionTitle>5. Disbursement Tranche</SectionTitle>
          <TextBlock value={recommendation.disbursementTransaction} />
          <SectionTitle>6. About Bureau Report of App &amp; Co-applicant</SectionTitle>
          <TextBlock value={recommendation.bureauReport} />
          <SectionTitle>7. About Proposed Collateral (including Legal &amp; Technical)</SectionTitle>
          <TextBlock
            value={[
              recommendation.proposedCollateral,
              isBlank(recommendation.legalAndTechnical) ? null : `Legal & Technical Review: ${recommendation.legalAndTechnical}`,
              legalStatus ? `Legal Report: ${legalStatus}` : null,
              technicalStatus ? `Technical Report: ${technicalStatus}` : null,
            ].filter((v) => !isBlank(v)).join('\n')}
          />
        </CamPage>

        {/* Student fee details & demographics */}
        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>8. Student Fee Details</SectionTitle>
          <GridTable
            headers={['Society Name', 'School Name', '2024-25 Students', '2024-25 Annual Fees', '2025-26 Students', '2025-26 Annual Fees', '2026-27 Students', '2026-27 Annual Fees']}
            rows={[[applicantName, institutionName, '', '', '', '', '', '']]}
            footerRow={['Total', '', '', '', '', '', '', '']}
          />
          <SectionTitle>School / College demographics: {dash(institutionName)}</SectionTitle>
          <KvTable
            rows={[
              ['Name of the School', institutionName],
              ['School Website link if any', null],
              ['Google Map Location', null],
              ['Year of commencement of school operations with Vintage (yrs)', null],
              ['Affiliation & Year of Affiliation', null],
              ['Courses/up to which Grade', null],
              ['RTE Students & Fees if any', null],
              ['Teaching Non-Teaching Staff Numbers & Average Salary p.m', null],
              ['Buses if owned/ vehicles on contract', null],
              ['Hostel Facility, if any', null],
              ['Other fees charged if any (Annual Fees)', null],
              ['Facilities/Amenities offered by School', null],
              ['School Building – Owned/Rented/Leased', null],
              ['Building structure with Number of Classrooms', null],
              ['Area constructed in sq.ft', null],
            ]}
          />
          <h4 className="cam-sub-title">Student Nos &amp; fees for last 3 years</h4>
          <GridTable
            headers={['Particulars', '2024-25', '2025-26', '2026-27']}
            rows={[['Student Nos', '', '', ''], ['Total Fees', '', '', ''], ['Total Fees Collected', '', '', '']]}
          />
        </CamPage>

        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>Last 3 Years Student Data</SectionTitle>
          <KvTable rows={[['Trust /Society Name', applicantName], ['School Name', institutionName]]} />
          <GridTable
            headers={['Class', '24-25 Students', '24-25 Annual Fees', '24-25 Total fee receivable', '25-26 Students', '25-26 Annual Fees', '25-26 Total fee receivable', '26-27 Students', '26-27 Annual Fees', '26-27 Total fee receivable']}
            rows={STUDENT_CLASSES.map((c) => [c, '', '', '', '', '', '', '', '', ''])}
            footerRow={['Total', '', '', '', '', '', '', '', '', '']}
          />
        </CamPage>

        {/* Financials, UDISE, eligibility */}
        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>Consolidated Key Financial Parameters and Ratios</SectionTitle>
          <GridTable
            headers={['Key Financial Parameters (In Rs Lac)', fyLabel(0), fyLabel(1)]}
            rows={KEY_FINANCIAL_ROWS.map((r) => [r, ...(financialRowValues[r] || ['', ''])])}
          />
          <SectionTitle>UDISE Details</SectionTitle>
          <KvTable
            rows={[
              ['Trust / Society Name:', applicantName],
              ['UDISE Code:', null, 'School Name:', institutionName],
              ['Total Number of Teachers:', null, 'Academic Date:', null],
              ['Comments:', null],
            ]}
          />
          <GridTable headers={['Sr No.', 'Class', 'Number of Students']} rows={[]} footerRow={['', 'Total Number of Students', '']} />
          <SectionTitle>Occupancy Details - College</SectionTitle>
          <TextBlock value={null} />
        </CamPage>

        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>Eligibility Calculations</SectionTitle>
          <h4 className="cam-sub-title">Eligibility Calculation - For Assessed Income:</h4>
          <GridTable
            headers={['Eligibility Calculation', 'Amt In Rs.']}
            rows={[
              ['Annual Fee Receivable as per Student Data Sheet', ''],
              ['Annual Tuition fee considered', ''],
              ['Add: Annual Charges', ''],
              ['Add: Admission Fee', ''],
              ['Add: Hostel Fees', ''],
              ['Add: Transport Income', ''],
              ['Total Assessed Annual Income (B + C + D + E + F)', fmtINR(eligibility.totalIncome)],
              ['Hair Cut (G* Haircut %)', ''],
              ['Total Eligible Annual Income', fmtINR(eligibility.totalIncome)],
              ['Other Income of Co-Applicant (Per Month)', fmtINR(coOtherIncomeTotal)],
              ['EBIDTA to be considered (I/12*EBIDTA Margin)', ''],
              ['FOIR (J* FOIR %)', fmtINR(eligibility.foirAmount)],
              ['Existing Monthly Loan Obligations', fmtINR(eligibility.existingEmi)],
              ['Net Serviceable Income (K-L)', fmtINR(eligibility.netServiceable)],
              ['EMI Factor @IRR/Tenor', fmtNum(eligibility.emiFactor)],
              ['Loan Eligibility (in lacs) (M/N)', fmtNum(eligibility.eligibilityLacs)],
              ['Proposed Loan Amount', fmtINR(assessment?.requestedLoanAmount ?? loanAmount)],
              ['Actual FOIR', fmtPercent(eligibility.actualFoir)],
            ]}
          />
          <SectionTitle>Assesed Fee &amp; Expenditure</SectionTitle>
          <GridTable
            headers={['Particulars', 'Amount']}
            rows={[
              ['Current Year Fees As Calculated Above', ''],
              ['Add: Admission Fees', ''],
              ['Add: Bus Fees', ''],
              ['Add: Books & Stationary', ''],
              ['Add: Uniform', ''],
              ['Add: Mess Fees', ''],
              ['Add: Sports & Extra Curricular Fees', ''],
              ['Add: Others', ''],
              ['Total', ''],
              ['Expenses* - Salary', ''],
              ['Rent', ''],
              ['Electricity', ''],
              ['Other Administrative', ''],
              ['Surplus', ''],
              ['Actual EBITDA Margin (Surplus/Total)', ''],
            ]}
          />
        </CamPage>

        {/* Banking & policy parameters */}
        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>Banking Conduct</SectionTitle>
          <GridTable
            headers={['Bank Name', 'Type of Account', 'Annual Credit Summation', 'ABB', 'IW Returns', 'OW Returns', 'ABB/ EMI', 'Remarks']}
            rows={bankingBanks.map(bankingRow)}
            footerRow={bankingTotal ? ['Total', '', fmtINR(bankingTotal.annualisedBusinessCredit), fmtINR(bankingTotal.abb), fmtNum(bankingTotal.iwBouncePercent), fmtNum(bankingTotal.owBouncePercent), fmtNum(bankingTotal.abbToEMI), ''] : null}
          />
          <h4 className="cam-sub-title">Assesed Fee &amp; Expenditure</h4>
          <GridTable
            headers={['Details', '%', 'Rational']}
            rows={[
              ['Haircut %', '', ''],
              ['EBIDTA Margin', '', ''],
              ['Other Income as a % of Assessed Income', '', ''],
              ['FOIR %', fmtNum(assessment?.foirPercentApplied), ''],
              ['Interest Rate %', fmtNum(proposedROI), ''],
              ['Proposed Loan Tenure (Months)', dash(proposedTenure), ''],
            ]}
          />
          <h4 className="cam-sub-title">Assesed Fee &amp; Expenditure</h4>
          <GridTable
            headers={['Details', 'Amount', 'EBITDA %', 'EBITDA Amount']}
            rows={[
              ['Revenue from College', '', '', ''],
              ['Revenue from School (Owned)', '', '', ''],
              ['Revenue from School (Rented)', '', '', ''],
            ]}
            footerRow={['Total', '', '', '']}
          />
          <KvTable rows={[['Average EBITDA', null]]} />
        </CamPage>

        {/* Repayment details */}
        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>Repayment Details (EMI / Non EMI based Loans)</SectionTitle>
          <GridTable
            headers={['Name of Borrower', 'Bank / Fi Name', 'Product', 'Status (Live / Closed)', 'Loan Amount (In Rs.)', 'EMI', 'POS', 'Tenor (In months)', 'Paid Tenor', 'No of bounce in Last 12 months', 'Obligate (Y/N)']}
            rows={obligationRows}
            footerRow={obligations.length > 0 ? ['Total', '', '', '', fmtINR(sumOf('loanAmount')), fmtINR(sumOf('emiAmount')), fmtINR(sumOf('currentPOS')), '', '', '', ''] : null}
          />
          <h4 className="cam-sub-title">Comments:-</h4>
          <TextBlock value={rtrComments.join(',\n')} />
        </CamPage>

        {/* Asset base & health checks */}
        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>Asset Base</SectionTitle>
          <GridTable
            headers={['Sr. No', 'Type', 'Owner', 'Mortgaged', 'Valuation']}
            rows={assetRows}
            footerRow={activeAssets.length > 0 ? ['Total', '', '', '', `Rs. ${assetTotal.toLocaleString('en-IN')}`] : null}
          />
          <SectionTitle>Comments on Other Health Checks</SectionTitle>
          <GridTable headers={['Particulars', 'Yes/No', 'Date of check', 'Findings/Status']} rows={healthCheckRows} />
        </CamPage>

        {/* Way out, risk, credit rating */}
        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>Way Out Analysis</SectionTitle>
          <KvTable
            rows={[
              ['Cash Flow Generated from Business / Fee Receivable in the latest financial year', null],
              ['Distress Sale Value of the property', null],
            ]}
          />
          <SectionTitle>Risk</SectionTitle>
          <GridTable
            headers={['Sr. No.', 'Nature of Risk', 'Level', 'Description of Risk & Potential Mitigation']}
            rows={RISK_ROWS.map((r, idx) => [idx + 1, r, '', ''])}
            footerRow={['', 'Overall Risk', '', '']}
          />
          <SectionTitle>Credit Rating Score</SectionTitle>
          <KvTable rows={[['Risk Grading', null]]} />
          <GridTable
            headers={['Sr. No.', 'Particulars', 'Weightage', 'Score']}
            rows={CREDIT_RATING_ROWS.map(([name, weight], idx) => [idx + 1, name, weight, ''])}
            footerRow={['', 'TOTAL', '100%', '']}
          />
        </CamPage>

        {/* Sanction conditions, strengths, deviations */}
        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>Sanction Conditions</SectionTitle>
          <GridTable headers={['Case', 'Sanction Condition']} rows={sanctionConditions.map((c, idx) => [idx + 1, c])} />
          <SectionTitle>Key Strength and Concerns</SectionTitle>
          <h4 className="cam-sub-title">Key Strength</h4>
          <TextBlock value={recommendation.strengths} />
          <h4 className="cam-sub-title">Key Concerns</h4>
          <TextBlock value={recommendation.concerns} />
          <SectionTitle>Deviations</SectionTitle>
          <GridTable headers={['Nature of Deviation', 'Deviation Description', 'Level', 'Rational']} rows={deviationRows} />
        </CamPage>

        {/* Recommendation & application chain */}
        <CamPage number={nextPage()} footer={footer}>
          <SectionTitle>Recommendation &amp; Approval</SectionTitle>
          <p className="cam-paragraph">
            On the basis of overall credit appraisal and detailed analysis, the case is recommended for approval of INR{' '}
            {loanAmount != null ? fmtINR(loanAmount) : ''}
          </p>
          {!isBlank(recommendation.recommendation) && <TextBlock value={recommendation.recommendation} />}
          {!isBlank(recommendation.finalRemarks) && <TextBlock value={recommendation.finalRemarks} />}
          <KvTable rows={[['Approving Authority:', approvingAuthority]]} />
          {!isBlank(decisionRemarks) && <TextBlock value={decisionRemarks} />}
          <SectionTitle>Application Chain</SectionTitle>
          <GridTable headers={['Sr. No', 'Name', 'Level', 'Action', 'Comments', 'Date']} rows={historyRows} />
        </CamPage>
      </div>
    </div>
  );
}
