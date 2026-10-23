/**
 * RecommendationSheet — LAP Credit Approval Memorandum (Recommendation Sheet)
 *
 * Read-only, A4 paginated sheet that follows the LAP CAM template page for page,
 * assembled from the application's back-office data (application form, PD sheet,
 * eligibility, RTR, banking, health checks, asset base, deviations and credit decision).
 * Values that are not captured anywhere yet are left blank.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import backOfficeService from '../../api/backOfficeService';
import {
  BRAND_NAME,
  LogoImage,
  toList,
  settledValue,
  getMaster,
  firstRecord,
  nameById,
  isBlank,
  pick,
  dash,
  toNumber,
  fmtINR,
  fmtNum,
  fmtDate,
  usePrintAndPdf,
} from '../CamReport/camShared';
import './RecommendationSheet.css';

const PREPAYMENT_CHARGES = [
  'Foreclosure not allowed in the first 24 months of loan disbursement. (Applicable charges in case of closure are at the discretion of company not beyond 6% of the POS)',
  '4% of the POS: Foreclosure after 24 months till 48 months.',
  '2% of the POS: Foreclosure after 48 months',
  'Pre-payment not allowed in the first 12 months of loan disbursement.',
  'Prepayment Up to 25% of the POS per year - Nil',
  'Prepayment beyond 25% of the POS after the expiry of 12 months but before the expiry of 24 months: 4%',
  'Prepayment beyond 25% of the POS after the expiry of 24 months but before the expiry of 48 months: 2%',
];

const HEALTH_CHECK_FALLBACK = ['Google', 'Reference', 'FI', 'Crimecheck', 'Hunter', 'RCU', 'Dedupe', 'PAN Check', 'Aadhar Check', 'CERSAI Check'];

const ageFromDob = (dob) => {
  if (isBlank(dob)) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return age > 0 ? age : null;
};

const humanize = (v) =>
  isBlank(v) ? '' : String(v).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').trim();

const fmtAmount = (v) => {
  const n = toNumber(v);
  return n == null ? '' : n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const fmtLacs = (v) => {
  const n = toNumber(v);
  return n == null ? '' : `Rs. ${(n / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} lacs`;
};

const fmtCrores = (v) => {
  const n = toNumber(v);
  return n == null ? '' : `Rs. ${(n / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Crs`;
};

const fmtCoverDate = (d) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

const NIL = 'NIL';
const nil = (v) => (isBlank(v) ? NIL : v);

/** Lines of text, dropping blanks; preserves line breaks typed into the source fields. */
function Lines({ values }) {
  const lines = values.filter((v) => !isBlank(v));
  if (lines.length === 0) return NIL;
  return <div className="rs-lines">{lines.join('\n')}</div>;
}

function SheetPage({ children, cover = false }) {
  return (
    <section className={`cam-page rs-page${cover ? ' rs-cover' : ''}`}>
      {!cover && (
        <div className="rs-page-header">
          <img src={LogoImage} alt={BRAND_NAME} className="rs-header-logo" />
        </div>
      )}
      <div className="rs-page-body">{children}</div>
    </section>
  );
}

/** Table rows with NIL in missing cells; a table with no rows shows a single NIL row. */
function TableRows({ headers, rows }) {
  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={headers.length} className="rs-nil-row">{NIL}</td>
      </tr>
    );
  }
  return rows.map((row, idx) => (
    <tr key={idx}>{row.map((cell, cIdx) => <td key={cIdx}>{nil(cell)}</td>)}</tr>
  ));
}

function InnerTable({ headers, rows, className = '' }) {
  return (
    <table className={`rs-inner-table ${className}`}>
      <thead>
        <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        <TableRows headers={headers} rows={rows} />
      </tbody>
    </table>
  );
}

function GridTable({ headers, rows, footerRow = null, className = '' }) {
  return (
    <table className={`rs-table rs-grid ${className}`}>
      <thead>
        <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        <TableRows headers={headers} rows={rows} />
        {footerRow && (
          <tr className="rs-total-row">{footerRow.map((cell, cIdx) => <td key={cIdx}>{dash(cell)}</td>)}</tr>
        )}
      </tbody>
    </table>
  );
}

function SubHeading({ children }) {
  return <h4 className="rs-sub-heading">{children}</h4>;
}

/* ── Main component ────────────────────────────────────────────────── */

export default function RecommendationSheet({
  verificationData,
  coApplicants = [],
  applicationProductDetailsId,
  agentCustomerId,
  healthChecks = {},
  unsavedPdSheet = null,
}) {
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({});
  const exportRef = verificationData?.appId || verificationData?.customerCode || agentCustomerId || 'Application';
  const { handlePrint, handleDownloadPdf, isExporting, exportError } = usePrintAndPdf(reportRef, {
    title: 'Recommendation Sheet',
    fileName: `Recommendation_Sheet_${exportRef}.pdf`,
  });

  /*
   * html2canvas measures the text baseline with a hidden <img> on the live document;
   * the global `img { display: block }` reset skews it and every line is drawn low.
   */
  const handleDownload = async () => {
    const metricsFix = document.createElement('style');
    metricsFix.textContent =
      'body > div[style*="visibility: hidden"][style*="white-space: nowrap"] > img { display: inline !important; }';
    document.head.appendChild(metricsFix);
    try {
      await handleDownloadPdf();
    } finally {
      metricsFix.remove();
    }
  };

  useEffect(() => {
    const appProdId = Number(applicationProductDetailsId);
    if (!appProdId || appProdId <= 0) return undefined;
    let isMounted = true;

    const custId = Number(agentCustomerId) > 0 ? Number(agentCustomerId) : null;
    const rawResponse = verificationData?.raw || {};
    const rmId =
      rawResponse.rmId ??
      firstRecord(rawResponse.customer)?.rmId ??
      firstRecord(rawResponse.productDetails)?.product?.rmId ??
      verificationData?.rmId;

    async function load() {
      setLoading(true);
      const masterResults = await Promise.allSettled([
        getMaster('/SourcingChannelMaster'),
        getMaster('/City'),
        getMaster('/State'),
        getMaster('/RelationshipMaster'),
        getMaster('/company/companyloansetting'),
        getMaster('/BackOfficeMaster'),
        rmId ? backOfficeService.getRMById(rmId) : Promise.resolve(null),
      ]);
      const [sourcingChannels, cities, states, relationships, loanSettings, backOfficeUsers, rm] =
        masterResults.map(settledValue);

      const firstAddress = firstRecord(rawResponse.addressDetails || rawResponse.AddressDetails) || {};
      const city = toList(cities).find(
        (c) => String(c.cityId) === String(firstAddress.cityId ?? firstAddress.CityId)
      );
      const districtId = verificationData?.districtId ?? city?.districtId ?? firstRecord(rm)?.districtId;

      const results = await Promise.allSettled([
        districtId ? backOfficeService.getDistrictById(districtId) : Promise.resolve(null),
        backOfficeService.getPdAssessmentByApplication(appProdId),
        backOfficeService.getAssessmentsByApplication(appProdId),
        custId ? backOfficeService.getEligibilityNormalIncome(appProdId, custId) : Promise.resolve(null),
        backOfficeService.getLoanObligations(appProdId, 0),
        backOfficeService.getLoanObligationsSummary(appProdId, 0),
        backOfficeService.getRtrLoanStatusMaster(),
        backOfficeService.getBankingAnalysis(appProdId),
        backOfficeService.getStepVerificationsByApplication(appProdId),
        backOfficeService.getHealthCheckTypes(),
        backOfficeService.getApplicationAssets(appProdId),
        backOfficeService.getPropertyMaster(),
        backOfficeService.getMortgageStatusMaster(),
        backOfficeService.getDeviationMasters(),
        backOfficeService.getApplicationDeviationDecisions(appProdId),
        custId ? backOfficeService.getLatestCreditDecision(custId) : Promise.resolve(null),
        backOfficeService.getCreditManagers(),
      ]);
      if (!isMounted) return;

      const [
        district, pdAssessment, assessments, normalIncome, obligations, obligationSummary, rtrStatuses,
        banking, stepVerifications, healthCheckTypes, assets, propertyMaster, mortgageMaster,
        deviationMasters, deviationDecisions, creditDecision, creditManagers,
      ] = results.map(settledValue);

      setData({
        sourcingChannels: toList(sourcingChannels),
        city: city || null,
        states: toList(states),
        relationships: toList(relationships),
        loanSetting: firstRecord(toList(loanSettings).filter((s) => s && s.isActive !== false)),
        backOfficeUsers: toList(backOfficeUsers),
        rm: firstRecord(rm),
        district: firstRecord(district),
        pdAssessment: firstRecord(pdAssessment),
        assessments: toList(assessments),
        normalIncomeSummary: normalIncome?.summary || {},
        obligations: toList(obligations),
        obligationSummary: obligationSummary || null,
        rtrStatuses: toList(rtrStatuses),
        banking: banking || null,
        stepVerifications: toList(stepVerifications),
        healthCheckTypes: toList(healthCheckTypes).filter((t) => t.isActive !== false),
        assets: toList(assets),
        propertyMaster: toList(propertyMaster),
        mortgageMaster: toList(mortgageMaster),
        deviationMasters: toList(deviationMasters),
        deviationDecisions: toList(deviationDecisions),
        creditDecision: firstRecord(creditDecision),
        creditManagers: toList(creditManagers),
      });
      setLoading(false);
    }

    load().catch((err) => {
      console.error('[RecommendationSheet] Failed to load data:', err);
      if (isMounted) setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [applicationProductDetailsId, agentCustomerId, verificationData?.districtId]);

  /* ── Application & sourcing ──────────────────────────────────────── */

  const app = verificationData?.applicationDetails || {};
  const personal = verificationData?.personalInformation || {};
  const address = verificationData?.addressDetails?.currentAddress || {};
  const raw = verificationData?.raw || {};
  const productWrapper = firstRecord(raw.productDetails || raw.productDetailsList || raw.ProductDetails) || {};
  const productRecord = productWrapper.product || productWrapper;
  const rawCustomer = firstRecord(raw.customer) || {};
  const rawAddress = firstRecord(raw.addressDetails || raw.AddressDetails) || {};
  const collateralRaw = Array.isArray(verificationData?.collateral?.raw) ? verificationData.collateral.raw : [];

  const creditDecision = data.creditDecision || null;
  const isApproved = String(pick(creditDecision, ['decision', 'Decision']) || '').toLowerCase() === 'approved';
  const sanctioned = (keys) => (isApproved ? toNumber(pick(creditDecision, keys)) : null);

  const applicantName = dash(verificationData?.customerName);
  const product = dash(pick(productWrapper, ['loanProductName', 'LoanProductName']) ?? app.loanProduct);
  const transactionType = pick(productWrapper, ['loanTransactionTypeName', 'LoanTransactionTypeName']) ?? app.transactionType;
  const loanAmount =
    sanctioned(['sanctionedLoanAmount', 'SanctionedLoanAmount']) ??
    toNumber(data.obligationSummary?.proposedLoanAmount) ??
    toNumber(productRecord.loanAmount) ??
    toNumber(app.loanAmount);

  const branch =
    pick(rawCustomer, ['branch', 'Branch']) ??
    pick(data.rm, ['branch', 'Branch']) ??
    pick(app, ['sourcingBranch']);
  const zone = pick(data.district, ['zone', 'Zone', 'zoneName', 'ZoneName']);
  const cityName = pick(data.city, ['cityName']) ?? address.city;
  const stateName =
    nameById(data.states, 'stateId', 'stateName', rawAddress.stateId ?? data.city?.stateId) ?? address.state;
  const location = [cityName, stateName].filter((v) => !isBlank(v)).join(', ');
  const distanceFromBranch = pick(productRecord, ['distanceFromBranch', 'DistanceFromBranch']) ?? app.distanceFromBranch;
  const branchAndDistance = [
    branch,
    distanceFromBranch != null ? `${distanceFromBranch} Kms from Branch` : null,
  ].filter((v) => !isBlank(v)).join(' - ');

  const sourcingBy =
    pick(raw, ['rmName', 'RmName']) ??
    pick(productRecord, ['rmName', 'RmName']) ??
    pick(data.rm, ['fullName', 'FullName']) ??
    pick(verificationData, ['rmName']);
  const agentName = pick(raw, ['agentName', 'AgentName']) ?? pick(verificationData, ['agentName']);
  const channelName =
    nameById(data.sourcingChannels, 'sourcingChannelId', 'sourcingChannelName', productRecord.sourcingChannelId) ??
    pick(productWrapper, ['sourcingChannelName', 'SourcingChannelName']);
  const sourcingChannel = [channelName, agentName].filter((v) => !isBlank(v)).join(' - ');

  /* ── PD sheet ────────────────────────────────────────────────────── */

  const pd = useMemo(() => {
    const r = data.pdAssessment;
    if (r && (r.pdAssessmentId || r.PdAssessmentId || r.id)) {
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
        legalAndTechnical: r.legalTechnicalReview ?? r.LegalTechnicalReview ?? r.legalAndTechnical,
        strengths: r.strengths ?? r.Strengths,
        concerns: r.concerns ?? r.Concerns,
        recommendation: r.recommendation ?? r.Recommendation,
        pdDoneById: r.modifiedBy ?? r.createdBy ?? r.CreatedBy,
      };
    }
    return unsavedPdSheet || {};
  }, [data.pdAssessment, unsavedPdSheet]);
  const pdDoneBy = nameById(data.backOfficeUsers, 'backOfficeId', 'fullName', pd.pdDoneById);

  const pdConditions = useMemo(() => {
    const r = data.pdAssessment;
    const rawSaved = r?.sanctionConditions ?? r?.SanctionConditions;
    const savedList = toList(rawSaved)
      .filter((c) => c && c.isActive !== false && c.IsActive !== false)
      .map((c) => (typeof c === 'string' ? c : c?.conditionText ?? c?.ConditionText ?? ''))
      .map((c) => (c == null ? '' : String(c).trim()))
      .filter((c) => !isBlank(c));

    if (savedList.length > 0) return savedList;

    return toList(unsavedPdSheet?.otherSanctionConditions)
      .map((c) => (typeof c === 'string' ? c : c?.conditionText ?? c?.ConditionText ?? ''))
      .map((c) => (c == null ? '' : String(c).trim()))
      .filter((c) => !isBlank(c));
  }, [data.pdAssessment, unsavedPdSheet]);

  /* ── Eligibility ─────────────────────────────────────────────────── */

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

  const niSummary = data.normalIncomeSummary || {};
  const firstValue = (...values) => values.find((v) => !isBlank(v) && !Number.isNaN(v)) ?? null;
  const proposedROI =
    sanctioned(['sanctionedROI', 'SanctionedROI', 'sanctionedRoi']) ??
    pick(data.obligationSummary, ['proposedROI']) ??
    pick(assessment, ['proposedROI']) ??
    toNumber(app.interestRate);
  const proposedTenure =
    sanctioned(['sanctionedTenureMonths', 'SanctionedTenureMonths']) ??
    pick(data.obligationSummary, ['proposedTenureMonths']) ??
    pick(assessment, ['proposedTenureMonths']) ??
    toNumber(app.loanTenure);
  const proposedEMI = pick(data.obligationSummary, ['proposedEMI']) ?? pick(assessment, ['proposedEMI']);
  const actualFoir = (() => {
    const ratio = toNumber(assessment?.actualFOIR);
    if (ratio != null) return ratio <= 1 ? ratio * 100 : ratio;
    return toNumber(niSummary.actualFoirPercent);
  })();
  const eligibilityRows = [
    ['A', 'Net Monthly Income as per memorandum of monthly income and expenditure statement', fmtINR(firstValue(assessment?.totalConsideredIncome, niSummary.totalIncomeMonthly))],
    ['B', 'Total Eligible Monthly Income ((B-C)* FOIR%)/12', fmtINR(firstValue(assessment?.eligibleEMI, niSummary.eligibleMonthlyIncome))],
    ['C', 'Existing Monthly Loan Obligations', fmtINR(firstValue(assessment?.existingEMI, niSummary.existingMonthlyObligations))],
    ['D', 'Net Serviceable Income (B-C)', fmtINR(firstValue(assessment?.netServiceableIncome, niSummary.netServiceableIncome))],
    ['E', 'EMI Factor @IRR/Tenor', fmtINR(firstValue(assessment?.emiFactor, niSummary.emiFactor))],
    ['F', 'Loan Eligibility (E/F)', fmtNum(firstValue(assessment?.maximumEligibleLoanAmount, niSummary.loanEligibilityLacs))],
    ['G', 'Proposed Loan Amount (in lacs)', loanAmount != null ? fmtNum(loanAmount / 100000) : ''],
    ['H', 'Actual FOIR', actualFoir != null ? `${Math.round(actualFoir)}%` : ''],
  ];

  /* ── Applicants ──────────────────────────────────────────────────── */

  const applicantAge = toNumber(personal.age) ?? ageFromDob(personal.dob);
  const coApplicantRows = coApplicants.map((co) => {
    const pers = co.personalRecord || {};
    return [
      co.name,
      pick(pers, ['age', 'Age']) ?? ageFromDob(pick(pers, ['dateOfBirth', 'DateOfBirth'])),
      pick(pers, ['relationshipWithApplicantName', 'relationshipName', 'RelationshipName', 'relationWithApplicant', 'relationship']) ??
        nameById(data.relationships, 'relationshipId', 'relationshipName', pers.relationshipId ?? pers.RelationshipId),
      '',
    ];
  });

  /* ── Exposure, security, insurance ───────────────────────────────── */

  const rtrBucketMap = new Map((data.rtrStatuses || []).map((s) => [Number(s.rtrLoanStatusId), String(s.summaryBucket || '').toUpperCase()]));
  const rtrStatusMap = new Map((data.rtrStatuses || []).map((s) => [Number(s.rtrLoanStatusId), s.statusName]));
  const obligations = (data.obligations || []).filter((o) => o && o.isActive !== false);
  const liveObligations = obligations.filter((o) => rtrBucketMap.get(Number(o.rtrLoanStatusId)) === 'LIVE');
  const existingExposure = liveObligations.length > 0
    ? liveObligations.reduce((sum, o) => sum + (toNumber(o.currentPOS) || 0), 0)
    : null;
  const totalExposure = existingExposure != null || loanAmount != null
    ? (existingExposure || 0) + (loanAmount || 0)
    : null;

  const securityRows = collateralRaw.map((c) => {
    const valuation1 = toNumber(pick(c, ['estimatedValue', 'EstimatedValue', 'finalValue', 'FinalValue']));
    const valuation2 = toNumber(pick(c, ['valuation2', 'Valuation2', 'secondValuation', 'SecondValuation']));
    const lower = [valuation1, valuation2].filter((v) => v != null && v > 0);
    const lowerValue = lower.length > 0 ? Math.min(...lower) : null;
    const ltv = lowerValue && loanAmount ? (loanAmount / lowerValue) * 100 : null;
    return {
      cells: [
        pick(c, ['locationAddress', 'LocationAddress']),
        pick(c, ['ownerName', 'OwnerName', 'propertyOwnerName', 'PropertyOwnerName', 'ownershipTypeName', 'OwnershipTypeName']),
        pick(c, ['propertyName', 'PropertyName', 'propertyType', 'PropertyType']),
        fmtAmount(valuation1),
        fmtAmount(valuation2),
        ltv != null ? `${ltv.toFixed(2)}%` : '',
      ],
      type: pick(c, ['propertyName', 'PropertyName', 'propertyType', 'PropertyType']),
      lowerValue,
    };
  });
  const totalLowerValue = securityRows.reduce((sum, r) => sum + (r.lowerValue || 0), 0);
  const overallLtv = totalLowerValue > 0 && loanAmount ? `${((loanAmount / totalLowerValue) * 100).toFixed(2)}%` : '';
  const propertyType = [...new Set(securityRows.map((r) => r.type).filter((v) => !isBlank(v)))].join(', ');

  const loanSetting = data.loanSetting || {};
  const processingFeePct = toNumber(loanSetting.defaultProcessingFee);
  const insurancePct = toNumber(loanSetting.defaultInsurancePercentage);
  const insuranceText = [
    insurancePct != null ? `GI - ${fmtNum(insurancePct)}%` : 'GI - As per policy',
    'LI - As per policy',
  ];

  /* ── RTR, banking, health checks, assets, deviations ─────────────── */

  const obligationRows = obligations.map((o) => [
    o.borrowerName,
    o.lenderName,
    o.product,
    o.statusName || rtrStatusMap.get(Number(o.rtrLoanStatusId)),
    fmtAmount(o.loanAmount),
    fmtAmount(o.emiAmount),
    fmtAmount(o.currentPOS),
    o.tenureMonths,
    o.isFoirApplicable === true || o.isFoirApplicable === 'Yes' ? 'Yes' : (o.isFoirApplicable === false || o.isFoirApplicable === 'No' ? 'No' : ''),
  ]);
  const rtrComments = [...new Set(obligations.map((o) => o.rtrComments).filter((c) => !isBlank(c)))];

  const bankingBanks = Array.isArray(data.banking?.banks) ? data.banking.banks : [];
  const bankingTotal = data.banking?.total || null;
  const bankingRows = bankingBanks.map((b, idx) => [
    idx + 1,
    b.bankName,
    b.accountType,
    fmtINR(b.annualisedBusinessCredit),
    fmtINR(b.abb),
    b.iwBouncePercent != null ? `${fmtNum(b.iwBouncePercent)}%` : '',
    b.owBouncePercent != null ? `${fmtNum(b.owBouncePercent)}%` : '',
    fmtNum(b.abbToEMI),
  ]);
  const bankingNotes = [
    pick(data.banking, ['remarks', 'Remarks', 'comments', 'Comments']),
    ...bankingBanks.map((b) => (isBlank(b.remarks) ? null : `${b.bankName ? `${b.bankName}: ` : ''}${b.remarks}`)),
  ].filter((v) => !isBlank(v));

  const healthCheckRows = useMemo(() => {
    const rowFor = (name, entry = null) => {
      if (!entry) {
        return [name, '', '', ''];
      }
      const rawStatus = entry.status ?? entry.checkStatus ?? entry.CheckStatus;
      const rawDate = entry.dateOfCheck ?? entry.DateOfCheck;
      const rawFindings = entry.findings ?? entry.Findings;
      const recordId =
        entry.applicationHealthCheckDetailsId ??
        entry.ApplicationHealthCheckDetailsId ??
        entry.id;

      if (!rawStatus && !recordId) {
        return [name, '', '', ''];
      }

      const status = isBlank(rawStatus) ? '' : String(rawStatus).trim();
      const date = isBlank(rawDate) ? '' : fmtDate(rawDate);
      const findings = isBlank(rawFindings) ? '' : String(rawFindings).trim();

      return [name, status, date, findings];
    };

    const types = data.healthCheckTypes || [];
    if (types.length === 0) return HEALTH_CHECK_FALLBACK.map((name) => rowFor(name, null));
    return types.map((t) => rowFor(t.checkName, healthChecks?.[t.healthCheckTypeId] || null));
  }, [data.healthCheckTypes, healthChecks]);

  const propertyNameMap = new Map(
    (data.propertyMaster || []).map((p) => [Number(p.propertyId ?? p.id), p.propertyName || p.name || p.propertyCode])
  );
  const mortgageNameMap = new Map(
    (data.mortgageMaster || []).map((m) => [Number(m.mortgageStatusId ?? m.id), m.mortgageStatusName || m.name || m.mortgageStatusCode])
  );
  const activeAssets = (data.assets || []).filter((a) => a && a.isActive !== false);
  const assetRows = activeAssets.map((a, idx) => [
    idx + 1,
    a.propertyName || propertyNameMap.get(Number(a.propertyId)),
    a.propertyAddress,
    a.propertyOwner,
    fmtAmount(a.marketValue),
    a.mortgageStatusName || mortgageNameMap.get(Number(a.mortgageStatusId)),
    a.mortgagedToWhom,
  ]);
  const assetTotal = activeAssets.reduce((sum, a) => sum + (toNumber(a.marketValue) || 0), 0);

  const deviationRows = useMemo(() => {
    const masters = new Map((data.deviationMasters || []).map((m) => [String(m.deviationId ?? m.DeviationId ?? m.id), m]));
    return (data.deviationDecisions || [])
      .filter((d) => String(d.decision ?? d.Decision ?? '').toLowerCase() === 'yes')
      .map((d) => {
        const m = masters.get(String(d.deviationId ?? d.DeviationId)) || {};
        const remarks = pick(d, ['remarks', 'Remarks']);
        const mitigate = remarks && remarks !== 'Decision updated' ? remarks : pick(m, ['deviationNorms', 'DeviationNorms']);
        return [
          pick(m, ['programSection', 'ProgramSection', 'program', 'section']),
          pick(m, ['deviationDescription', 'DeviationDescription', 'description']),
          pick(m, ['approvingAuthority', 'ApprovingAuthority']),
          mitigate,
        ];
      });
  }, [data.deviationMasters, data.deviationDecisions]);

  /* ── Sign-off ────────────────────────────────────────────────────── */

  const creditManagerName = (() => {
    const id = pick(creditDecision, ['creditManagerId', 'CreditManagerId']);
    if (id == null) return null;
    const manager = (data.creditManagers || []).find(
      (m) => String(m.creditManagerId ?? m.CreditManagerId ?? m.id ?? m.Id) === String(id)
    );
    return pick(manager, ['fullName', 'FullName', 'name', 'Name']);
  })();
  const withRole = (name, role) => (isBlank(name) ? role : `${name} – ${role}`);
  const signOffGroups = [
    ['Proposed by', [withRole(sourcingBy, 'Relationship Manager'), withRole(pdDoneBy, 'PD Officer')]],
    ['Recommended by', [withRole(creditManagerName, 'Credit Manager'), 'Credit Head']],
    ['Risk Reviewed by', ['Head Risk', 'Chief Risk Officer']],
    ['Approved by (Any 2 of above)', ['Chief Business Officer', 'Chief Operating Officer', 'Managing Director & CEO']],
  ];

  const recommendationText = `On the basis of overall Credit Appraisal & detailed analysis, case recommendation under ${product || 'the proposed product'} for amount of ${nil(fmtLacs(loanAmount))}, total exposure of ${nil(fmtCrores(totalExposure))}.`;
  const coApplicantNames = coApplicants.map((co) => co.name).filter((v) => !isBlank(v)).join(', ');
  const pdCommentSummary =
    pdDoneBy || pd.pdVisitDate
      ? `PD visit done by ${nil(pdDoneBy)}${pd.pdVisitDate ? `, met the customer ${applicantName} on ${fmtDate(pd.pdVisitDate)}` : ''}.`
      : null;

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="cam-report rs-report">
      <div className="cam-toolbar">
        <span className="cam-toolbar-status">{loading ? 'Loading recommendation sheet…' : 'Recommendation Sheet – Credit Approval Memorandum'}</span>
        <div className="cam-toolbar-actions">
          {exportError && <span className="cam-toolbar-error">{exportError}</span>}
          <button type="button" className="cam-btn" onClick={handlePrint} disabled={loading}>Print</button>
          <button type="button" className="cam-btn cam-btn-primary" onClick={handleDownload} disabled={loading || isExporting}>
            {isExporting ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="cam-print-root" ref={reportRef}>
        {/* Page 1: Cover */}
        <SheetPage cover>
          <div className="rs-cover-logo-wrap">
            <img src={LogoImage} alt={BRAND_NAME} className="rs-cover-logo" />
          </div>
          <div className="rs-cover-title">CREDIT APPROVAL MEMORANDUM</div>
          <table className="rs-table rs-cover-table">
            <tbody>
              <tr><th>Applicant Name</th><td>{nil(applicantName).toUpperCase()}</td></tr>
              <tr><th>Location</th><td>{nil(location)}</td></tr>
              <tr><th>Branch</th><td>{nil(branch)}</td></tr>
              <tr><th>Zone</th><td>{nil(zone)}</td></tr>
            </tbody>
          </table>
          <div className="rs-cover-date">{fmtCoverDate(new Date())}</div>
        </SheetPage>

        {/* Page 2: Sourcing and key loan terms */}
        <SheetPage>
          <table className="rs-table rs-kv">
            <colgroup>
              <col className="rs-col-label" />
              <col className="rs-col-value" />
              <col className="rs-col-label" />
              <col className="rs-col-value" />
            </colgroup>
            <tbody>
              <tr><td colSpan={4} className="rs-caption">Sourcing and key Loan Terms:</td></tr>
              <tr>
                <th>Application Id</th><td>{nil(verificationData?.appId || verificationData?.customerCode)}</td>
                <th>Proposal Date</th><td>{nil(fmtDate(verificationData?.appliedDate))}</td>
              </tr>
              <tr>
                <th>Case Location</th><td>{nil(location)}</td>
                <th>Branch &amp; distance from branch</th><td>{nil(branchAndDistance)}</td>
              </tr>
              <tr>
                <th>Sourcing done by</th><td>{nil(sourcingBy)}</td>
                <th>Sourcing Channel</th><td>{nil(sourcingChannel)}</td>
              </tr>
              <tr>
                <th>Applicant</th>
                <td colSpan={3}>
                  <InnerTable
                    headers={['Name', 'Age', 'Relationship', 'CIBIL Score']}
                    rows={[[applicantName, applicantAge, 'Self', '']]}
                  />
                </td>
              </tr>
              <tr>
                <th>Co applicant (Individual)</th>
                <td colSpan={3}>
                  <InnerTable headers={['Name', 'Age', 'Relationship', 'CIBIL Score']} rows={coApplicantRows} />
                </td>
              </tr>
              <tr>
                <th>Loan Type / program</th><td><Lines values={[product, transactionType]} /></td>
                <th>Segment</th><td>{nil(product)}</td>
              </tr>
              <tr>
                <th>Loan Amount</th><td>{nil(fmtLacs(loanAmount))}</td>
                <th>Existing exposure / ROI</th><td>{nil(fmtLacs(existingExposure))}</td>
              </tr>
              <tr>
                <th>Total Group Exposure</th><td>{nil(fmtLacs(totalExposure))}</td>
                <th>Tenure</th><td>{proposedTenure != null ? `${proposedTenure} months` : NIL}</td>
              </tr>
              <tr>
                <th>Proposed ROI</th><td>{proposedROI != null ? `${fmtNum(proposedROI)}%` : NIL}</td>
                <th>Processing fees</th><td>{processingFeePct != null ? `${fmtNum(processingFeePct)}%` : NIL}</td>
              </tr>
              <tr>
                <th>Insurance</th><td><Lines values={insuranceText} /></td>
                <th>EMI</th><td>{proposedEMI != null ? `Rs. ${fmtAmount(proposedEMI)}` : NIL}</td>
              </tr>
              <tr>
                <th>FOIR / DSCR</th><td>{actualFoir != null ? `${fmtNum(actualFoir)}%` : NIL}</td>
                <th>Loan to fee ratio</th><td>{NIL}</td>
              </tr>
              <tr>
                <th>Property Type</th><td>{nil(propertyType)}</td>
                <th>LTV</th><td>{nil(overallLtv)}</td>
              </tr>
              <tr>
                <th>Security Details</th>
                <td colSpan={3}>
                  <InnerTable
                    className="rs-security-table"
                    headers={['Property Address', 'Property ownership', 'Property Type', 'Valuation 1 (in Rs)', 'Valuation 2 (in Rs.)', 'LTV on lower valuation']}
                    rows={securityRows.map((r) => r.cells)}
                  />
                </td>
              </tr>
              <tr>
                <th>Pre-Payment Charges</th>
                <td colSpan={3}>
                  <Lines values={PREPAYMENT_CHARGES} />
                  <div className="rs-note-indent">Note: Pre-payment is allowed only twice a year.</div>
                </td>
              </tr>
              <tr>
                <th>PD comment</th>
                <td colSpan={3}>
                  <div className="rs-pd-comment-block" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {pdCommentSummary && <div style={{ marginBottom: '2px', lineHeight: '1.4' }}>{pdCommentSummary}</div>}
                    <div>
                      <strong>1. Address Where PD Was Conducted</strong>
                      <div style={{ paddingLeft: '12px', whiteSpace: 'pre-wrap' }}>{nil(pd.pdAddress)}</div>
                    </div>
                    <div>
                      <strong>2. Personal Discussion / Site Visit</strong>
                      <div style={{ paddingLeft: '12px', whiteSpace: 'pre-wrap' }}>{nil(pd.personalDiscussionSiteVisit)}</div>
                    </div>
                    <div>
                      <strong>3. Applicant Profile</strong>
                      <div style={{ paddingLeft: '12px', whiteSpace: 'pre-wrap' }}>{nil(pd.applicantProfile)}</div>
                    </div>
                    <div>
                      <strong>4. Co-Applicant Profile</strong>
                      <div style={{ paddingLeft: '12px', whiteSpace: 'pre-wrap' }}>{nil(pd.coApplicantProfile)}</div>
                    </div>
                    <div>
                      <strong>5. About Bureau Report of Applicant &amp; Co-Applicant</strong>
                      <div style={{ paddingLeft: '12px', whiteSpace: 'pre-wrap' }}>{nil(pd.bureauReport)}</div>
                    </div>
                    <div>
                      <strong>6. About Proposed Collateral (Including Legal and Technical)</strong>
                      <div style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                        <div>
                          <strong>a. Proposed Collateral Details</strong>
                          <div style={{ paddingLeft: '12px', whiteSpace: 'pre-wrap' }}>{nil(pd.proposedCollateral)}</div>
                        </div>
                        <div>
                          <strong>b. Legal &amp; Technical Review</strong>
                          <div style={{ paddingLeft: '12px', whiteSpace: 'pre-wrap' }}>{nil(pd.legalAndTechnical)}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <strong>7. Strengths</strong>
                      <div style={{ paddingLeft: '12px', whiteSpace: 'pre-wrap' }}>{nil(pd.strengths)}</div>
                    </div>
                    <div>
                      <strong>8. Concerns (If Any)</strong>
                      <div style={{ paddingLeft: '12px', whiteSpace: 'pre-wrap' }}>{nil(pd.concerns)}</div>
                    </div>
                    <div>
                      <strong>9. Recommendation</strong>
                      <div style={{ paddingLeft: '12px', whiteSpace: 'pre-wrap' }}>{nil(pd.recommendation)}</div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </SheetPage>

        {/* Page 3: End use, profile, eligibility, RTR */}
        <SheetPage>
          <table className="rs-table rs-kv">
            <colgroup>
              <col className="rs-col-label" />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <th>End use of Proposed loan</th>
                <td>
                  {!isBlank(pd.endUseCategory) && <strong className="rs-block">{pd.endUseCategory}</strong>}
                  {(!isBlank(pd.endUse) || isBlank(pd.endUseCategory)) && <Lines values={[pd.endUse]} />}
                </td>
              </tr>
              <tr>
                <th>Disbursement schedule</th>
                <td><Lines values={[pd.disbursementTransaction]} /></td>
              </tr>
            </tbody>
          </table>

          <SubHeading>Applicant&apos;s Profile –</SubHeading>
          <p className="rs-paragraph">
            <strong>{nil(applicantName)}</strong> {nil(pd.applicantProfile)}
          </p>
          {coApplicantNames && (
            <p className="rs-paragraph">
              <strong>{coApplicantNames}</strong> {nil(pd.coApplicantProfile)}
            </p>
          )}

          <SubHeading>Eligibility Calculation –</SubHeading>
          <table className="rs-table rs-eligibility">
            <colgroup>
              <col className="rs-col-letter" />
              <col />
              <col className="rs-col-amount" />
            </colgroup>
            <thead>
              <tr><th colSpan={3} className="rs-table-title">Eligibility Calculation as per Assessment Program</th></tr>
            </thead>
            <tbody>
              {eligibilityRows.map(([letter, label, value]) => (
                <tr key={letter} className={letter === 'F' || letter === 'H' ? 'rs-strong-row' : ''}>
                  <td>{letter}</td>
                  <td>{label}</td>
                  <td className="rs-num">{nil(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <SubHeading>RTR details –</SubHeading>
          <GridTable
            className="rs-rtr-table"
            headers={['Name of Borrower', 'Bank / Fi Name', 'Product', 'Status (Live / Closed)', 'Loan Amount (In Rs.)', 'EMI', 'POS', 'Tenor (In months)', 'FOIR (Y/N)']}
            rows={obligationRows}
          />
        </SheetPage>

        {/* Page 4: Banking, health checks, asset base */}
        <SheetPage>
          {rtrComments.length > 0 && (
            <p className="rs-paragraph"><strong>Note –</strong> {rtrComments.join(' ')}</p>
          )}

          <SubHeading>Banking Details:</SubHeading>
          <GridTable
            headers={['S.No.', 'Bank Name', 'Type of Account', 'Annualised Business Credit summation', 'ABB', '% I/w returns', '% O/w returns', 'ABB / EMI']}
            rows={bankingRows}
            footerRow={bankingTotal ? [
              '', 'Total', '',
              fmtINR(bankingTotal.annualisedBusinessCredit),
              fmtINR(bankingTotal.abb),
              bankingTotal.iwBouncePercent != null ? `${fmtNum(bankingTotal.iwBouncePercent)}%` : '',
              bankingTotal.owBouncePercent != null ? `${fmtNum(bankingTotal.owBouncePercent)}%` : '',
              fmtNum(bankingTotal.abbToEMI),
            ] : null}
          />
          {bankingNotes.length > 0 && (
            <p className="rs-paragraph"><strong className="rs-underline">Note:</strong> {bankingNotes.join(' ')}</p>
          )}

          <SubHeading>Comments on Health Checks:</SubHeading>
          <GridTable
            className="rs-health-table"
            headers={['Particulars', 'Yes/No', 'Date of check', 'Findings/Status']}
            rows={healthCheckRows}
          />

          <SubHeading>Asset Base-</SubHeading>
          <GridTable
            headers={['Sr no.', 'Type of Property', 'Property Address', 'Property Owner', 'Market value', 'Mortgaged / Debt free', 'Mortgaged to whom']}
            rows={assetRows}
            footerRow={activeAssets.length > 0 ? ['', '', '', 'Total', fmtAmount(assetTotal), '', ''] : null}
          />
        </SheetPage>

        {/* Page 5: Deviation and recommendation */}
        <SheetPage>
          {pdConditions.length > 0 && (
            <div className="rs-pd-conditions" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <SubHeading>PD Conditions:</SubHeading>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {pdConditions.map((cond, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 700, minWidth: '18px' }}>{idx + 1}.</span>
                    <span style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{cond}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SubHeading>Deviation:</SubHeading>
          <GridTable headers={['Nature of Deviation', 'Deviation Description', 'Level', 'Mitigate']} rows={deviationRows} />

          <div className="rs-recommendation">
            <SubHeading>Recommendation &amp; approval –</SubHeading>
            <p className="rs-paragraph">{recommendationText}</p>
            {!isBlank(pd.recommendation) && <Lines values={[pd.recommendation]} />}
          </div>
        </SheetPage>

        {/* Page 6: Sign-off */}
        <SheetPage>
          <table className="rs-table rs-signoff">
            <colgroup>
              <col className="rs-col-signoff" />
              <col />
            </colgroup>
            <tbody>
              {signOffGroups.map(([group, people]) => (
                <React.Fragment key={group}>
                  <tr><td colSpan={2} className="rs-signoff-group">{group}</td></tr>
                  {people.map((person) => (
                    <tr key={`${group}-${person}`}>
                      <td>{person}</td>
                      <td />
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </SheetPage>
      </div>
    </div>
  );
}
