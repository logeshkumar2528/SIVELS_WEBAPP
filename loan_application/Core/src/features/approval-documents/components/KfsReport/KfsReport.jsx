/**
 * KfsReport — Key Facts Statement (KFS)
 *
 * A4 paginated borrower disclosure following the KFS template page for page: interest rate,
 * fees, contingent charges, qualitative information, APR computation, the full repayment
 * schedule and the grievance redressal annexure, built from the sanctioned (or proposed)
 * loan terms. Values the system does not capture yet are shown as NIL.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import approvalDocumentService from '../../services/approvalDocumentService';
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
  toNumber,
  fmtINR,
  usePrintAndPdf,
} from '../../utils/documentExportHelper';
import { amountInWords, calcApr, calcEmi, calcKfsTotals, EMI_DUE_DAY, GST_RATE } from '../../utils/kfsCalc';
import './KfsReport.css';

const LENDER_NAME = 'Sivels Holdings (P) Ltd';
const LENDER_SHORT = 'Sivels';
const LENDER_ADDRESS_LINES = ['New No. 86, Old No. 1091,', 'Periyar EVR High Road,', 'Chennai - 600007.'];
const DOC_LABEL = 'Key Facts Statement';
const RATE_SHOCK = 0.25;
const RESET_PERIODICITY_MONTHS = 3;
const SCHEDULE_FIRST_PAGE_ROWS = 14;
const SCHEDULE_ROWS_PER_PAGE = 44;
const NIL = 'NIL';
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DISBURSAL_TEXT =
  'The Loan may be disbursed in 1 (one) or more installments, as set out in Schedule I (Loan Details), and in accordance with the Lender’s policy. Please refer to Clause 2.2 and Appendix – 2 (Disbursal of Loan) of the Loan Agreement for further details.';

const nil = (v) => (isBlank(v) ? NIL : v);

const ordinal = (day) => {
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return `${day}${suffix}`;
};

const toDate = (v) => {
  if (isBlank(v)) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** 27-June-2026 */
const fmtLongDate = (v) => {
  const d = toDate(v);
  return d ? `${String(d.getDate()).padStart(2, '0')}-${MONTHS_LONG[d.getMonth()]}-${d.getFullYear()}` : '';
};

/** 10 Sep 2026 */
const fmtDayMonYear = (v) => {
  const d = toDate(v);
  return d ? `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` : '';
};

/** 10th Sep 2026 */
const fmtOrdinalDate = (v) => {
  const d = toDate(v);
  return d ? `${ordinal(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` : '';
};

/** 10-Jul-26 */
const fmtScheduleDate = (v) => {
  const d = toDate(v);
  return d ? `${String(d.getDate()).padStart(2, '0')}-${MONTHS_SHORT[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}` : '';
};

const fmtRupee = (v) => {
  const n = toNumber(v);
  return n == null ? '' : `₹${Math.round(n).toLocaleString('en-IN')}/-`;
};

const fmtPct = (v) => {
  const n = toNumber(v);
  return n == null ? '' : `${Number(n.toFixed(2))}%`;
};

const monthsToClear = (principal, annualRate, emi) => {
  const r = annualRate / 12 / 100;
  const ratio = (principal * r) / emi;
  if (!(r > 0) || ratio >= 1) return null;
  return Math.ceil(-Math.log(1 - ratio) / Math.log(1 + r));
};

function KfsPage({ children }) {
  return (
    <section className="cam-page kfs-page">
      <div className="kfs-page-header">
        <img src={LogoImage} alt={BRAND_NAME} className="kfs-header-logo" />
      </div>
      <div className="kfs-page-body">{children}</div>
    </section>
  );
}

function ScheduleTable({ rows, totalRows = rows, showTotals = false }) {
  const totals = totalRows.reduce((sum, row) => ({
    interest: sum.interest + Number(row.interest || 0),
    principal: sum.principal + Number(row.principal || 0),
    emi: sum.emi + Number(row.emi || 0),
  }), { interest: 0, principal: 0, emi: 0 });
  return (
    <table className="kfs-table kfs-schedule">
      <thead>
        <tr>
          <th>Installment</th>
          <th>Date</th>
          <th>Interest</th>
          <th>Principal</th>
          <th>EMI</th>
          <th>Closing</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={6} className="kfs-center">{NIL}</td></tr>
        ) : (
          rows.map((r) => (
            <tr key={r.installment}>
              <td>{r.installment}</td>
              <td>{fmtScheduleDate(r.date)}</td>
              <td>{r.interest}</td>
              <td>{r.principal}</td>
              <td>{r.emi}</td>
              <td>{r.closing}</td>
            </tr>
          ))
        )}
      </tbody>
      {showTotals && rows.length > 0 && (
        <tfoot>
          <tr>
            <th colSpan={2}>Total</th>
            <th>{totals.interest.toLocaleString('en-IN')}</th>
            <th>{totals.principal.toLocaleString('en-IN')}</th>
            <th>{totals.emi.toLocaleString('en-IN')}</th>
            <th>—</th>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

export default function KfsReport({ verificationData, applicationProductDetailsId, agentCustomerId, creditDecision: creditDecisionProp = null }) {
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({});

  useEffect(() => {
    const appProdId = Number(applicationProductDetailsId);
    const custId = Number(agentCustomerId) > 0 ? Number(agentCustomerId) : null;
    let isMounted = true;

    async function load() {
      setLoading(true);
      const results = await Promise.allSettled([
        custId ? approvalDocumentService.getLatestCreditDecision(custId) : Promise.resolve(null),
        appProdId > 0 ? approvalDocumentService.getLoanObligationsSummary(appProdId, 0) : Promise.resolve(null),
        appProdId > 0 ? approvalDocumentService.getAssessmentsByApplication(appProdId) : Promise.resolve([]),
        getMaster('/company/companyloansetting'),
        getMaster('/company/companymaster'),
        getMaster('/company/companycontactpersonmaster'),
        getMaster('/LoanTransactionTypeMaster'),
      ]);
      if (!isMounted) return;
      const [
        creditDecision, obligationSummary, assessments, loanSettings, companies, contacts, transactionTypes,
      ] = results.map(settledValue);

      setData({
        creditDecision: firstRecord(creditDecision),
        obligationSummary: obligationSummary || null,
        assessments: toList(assessments),
        loanSetting: firstRecord(toList(loanSettings).filter((s) => s && s.isActive !== false)),
        company: firstRecord(toList(companies).filter((c) => c && c.status !== false)),
        contact: firstRecord(toList(contacts)),
        transactionTypes: toList(transactionTypes),
      });
      setLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [applicationProductDetailsId, agentCustomerId]);

  /* ── Loan terms ──────────────────────────────────────────────────── */

  const raw = verificationData?.raw || {};
  const app = verificationData?.applicationDetails || {};
  const productWrapper = firstRecord(raw.productDetails || raw.productDetailsList || raw.ProductDetails) || {};
  const productRecord = productWrapper.product || productWrapper;

  const decision = creditDecisionProp || data.creditDecision;
  const decisionStatus = String(pick(decision, ['decision', 'Decision']) || '').trim();
  const isApproved = decisionStatus.toLowerCase() === 'approved';

  const approvedAmount = isApproved ? toNumber(pick(decision, ['sanctionedLoanAmount', 'SanctionedLoanAmount'])) : null;
  const approvedRoi = isApproved ? toNumber(pick(decision, ['sanctionedROI', 'SanctionedROI', 'sanctionedRoi'])) : null;
  const approvedTenure = isApproved ? toNumber(pick(decision, ['sanctionedTenureMonths', 'SanctionedTenureMonths'])) : null;

  const isCompleteApproved =
    isApproved &&
    approvedAmount != null &&
    approvedAmount > 0 &&
    approvedTenure != null &&
    approvedTenure > 0 &&
    approvedRoi != null &&
    approvedRoi >= 0;

  const assessment = useMemo(() => {
    const list = (data.assessments || []).filter(
      (a) => a && a.isActive !== false && Number(a.applicantSequence || 0) === 0
    );
    const current = list.filter((a) => a.isCurrent !== false);
    return (current.length ? current : list)[0] || null;
  }, [data.assessments]);

  const principal = isCompleteApproved ? approvedAmount : null;
  const rate = isCompleteApproved ? approvedRoi : null;
  const tenure = isCompleteApproved ? approvedTenure : null;
  const sanctionDate = isCompleteApproved
    ? pick(decision, ['decidedAt', 'DecidedAt', 'decisionDate', 'DecisionDate', 'createdDate', 'CreatedDate', 'createdAt', 'CreatedAt'])
    : null;

  const loanSetting = data.loanSetting || {};
  const processingFeePct = toNumber(loanSetting.defaultProcessingFee);
  const documentationFeePct = toNumber(loanSetting.defaultDocumentationFee);
  const insurancePct = toNumber(loanSetting.defaultInsurancePercentage);
  const penaltyPct = toNumber(loanSetting.defaultPenaltyPercentage);
  const baseRate = toNumber(pick(loanSetting, ['baseRate', 'BaseRate', 'benchmarkRate', 'BenchmarkRate']));

  const totals = useMemo(
    () => calcKfsTotals({ principal, annualRate: rate, months: tenure, processingFeePct, startDate: sanctionDate }),
    [principal, rate, tenure, processingFeePct, sanctionDate]
  );

  const documentationFee =
    principal > 0 && documentationFeePct > 0 ? principal * (documentationFeePct / 100) * (1 + GST_RATE) : 0;
  const insuranceAmount = principal > 0 && insurancePct > 0 ? principal * (insurancePct / 100) : null;
  const feesToLender = (totals.processingFee || 0) + documentationFee;
  const netDisbursed = principal > 0 ? principal - feesToLender : null;
  const apr = totals.emi ? calcApr(netDisbursed, totals.emi, tenure) : null;

  const spread = baseRate != null && rate != null ? rate - baseRate : null;
  const shockedEmi = calcEmi(principal, (rate || 0) + RATE_SHOCK, tenure);
  const shockedTenure = totals.emi ? monthsToClear(principal, (rate || 0) + RATE_SHOCK, totals.emi) : null;

  /* ── Parties ─────────────────────────────────────────────────────── */

  const accountNo = verificationData?.appId || verificationData?.customerCode || '';
  const loanType =
    pick(productWrapper, ['loanProductName', 'LoanProductName', 'productName', 'ProductName']) ??
    pick(productRecord, ['loanProductName', 'LoanProductName', 'productName', 'ProductName']) ??
    pick(app, ['loanProduct']) ??
    nameById(data.transactionTypes, 'loanTransactionTypeId', 'transactionTypeName', productRecord.loanTransactionTypeId);

  const company = data.company || {};
  const lenderName = LENDER_NAME;
  const lenderWebsite = pick(company, ['website']);
  const lenderEmail = pick(company, ['email']);
  const lenderPhone = pick(company, ['phoneNo', 'mobileNo']);
  const lenderTollFree = pick(company, ['tollFreeNo', 'tollFreeNumber', 'TollFreeNo']);
  const lenderAddressLines = LENDER_ADDRESS_LINES;
  const lenderAddress = lenderAddressLines.join(' ');

  const contact = data.contact || {};
  const gro = {
    name: pick(contact, ['contactPersonName', 'personName', 'name', 'fullName']),
    designation: pick(contact, ['designation', 'designationName']),
    phone: pick(contact, ['mobileNo', 'phoneNo', 'contactNo']) ?? lenderPhone,
    email: pick(contact, ['email', 'emailId']) ?? lenderEmail,
  };
  const websiteText = lenderWebsite || 'our website';

  const tenureText = tenure ? `${tenure} Months` : '';
  const emiText = fmtRupee(totals.emi);
  const firstDue = totals.firstDueDate;

  const { handlePrint, handleDownloadPdf, isExporting, exportError } = usePrintAndPdf(reportRef, {
    title: 'KFS',
    fileName: `KFS-${accountNo || agentCustomerId || 'Application'}.pdf`,
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

  const firstScheduleRows = totals.schedule.slice(0, SCHEDULE_FIRST_PAGE_ROWS);
  const restScheduleRows = totals.schedule.slice(SCHEDULE_FIRST_PAGE_ROWS);
  const schedulePages = [];
  for (let i = 0; i < restScheduleRows.length; i += SCHEDULE_ROWS_PER_PAGE) {
    schedulePages.push(restScheduleRows.slice(i, i + SCHEDULE_ROWS_PER_PAGE));
  }

  const lenderBlock = (
    <div className="kfs-address">
      <strong>{lenderName}</strong>
      {lenderAddressLines.map((line) => <span key={line}>{line}</span>)}
    </div>
  );

  return (
    <div className="cam-report kfs-report">
      <div className="cam-toolbar">
        <span className="cam-toolbar-status">{loading ? 'Loading KFS data…' : DOC_LABEL}</span>
        <div className="cam-toolbar-actions">
          {exportError && <span className="cam-toolbar-error">{exportError}</span>}
          <button type="button" className="cam-btn" onClick={handlePrint} disabled={loading || !isCompleteApproved}>Print</button>
          <button type="button" className="cam-btn cam-btn-primary" onClick={handleDownload} disabled={loading || isExporting || !isCompleteApproved}>
            {isExporting ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {!isCompleteApproved && !loading && (
        <div className="kfs-notice">
          {!decision
            ? 'Approval Pending: This Key Facts Statement is a post-approval disclosure and can only be generated after the application is approved by the Credit Manager.'
            : !isApproved
            ? `Not Approved: This application has a Credit Manager decision of "${decisionStatus}". A Key Facts Statement can only be generated for approved loans.`
            : 'Incomplete Sanction Data: The Credit Manager approval decision is missing required financial terms (sanctioned amount, interest rate, or tenure).'}
        </div>
      )}

      <div className="cam-print-root" ref={reportRef}>
        {/* Page 1: Part 1 — loan details, instalments, interest */}
        <KfsPage>
          <p className="kfs-date">Date: {fmtLongDate(sanctionDate || new Date())}</p>
          <h2 className="kfs-title">Key Facts Statement</h2>
          <p className="kfs-part-title">Part 1 (Interest rate and fees/charges)</p>

          <table className="kfs-table">
            <colgroup>
              <col className="kfs-col-no" />
              <col className="kfs-col-p1a" />
              <col className="kfs-col-p1b" />
              <col className="kfs-col-p1c" />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className="kfs-no">1</td>
                <td>Loan proposal/ account No.</td>
                <td>{nil(accountNo)}</td>
                <td>Type of Loan</td>
                <td>{nil(loanType)}</td>
              </tr>
              <tr>
                <td className="kfs-no">2</td>
                <td colSpan={2}>Sanctioned Loan amount (in Rupees)</td>
                <td colSpan={2}>{principal ? `INR ${fmtINR(principal)} (${amountInWords(principal)})` : NIL}</td>
              </tr>
              <tr>
                <td className="kfs-no">3</td>
                <td colSpan={2}>
                  Disbursal schedule
                  <div className="kfs-indent">(i) Disbursement in stages or 100% upfront.</div>
                  <div className="kfs-indent">(ii) If it is stage wise, mention the clause of loan agreement having relevant details</div>
                </td>
                <td colSpan={2}>{DISBURSAL_TEXT}</td>
              </tr>
              <tr>
                <td className="kfs-no">4</td>
                <td colSpan={2}>Loan term (year/months/days)</td>
                <td colSpan={2}>{tenure ? `[${tenure} month] i.e. ${tenure} Months` : NIL}</td>
              </tr>
              <tr>
                <td className="kfs-no">5</td>
                <td colSpan={4}>Instalment details</td>
              </tr>
            </tbody>
          </table>

          <table className="kfs-table">
            <thead>
              <tr>
                <th>Type of instalments</th>
                <th>Number of EPIs</th>
                <th>EPI (₹)<sup>1</sup></th>
                <th>Commencement of repayment, post sanction</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="kfs-strong">Monthly</td>
                <td className="kfs-center">{tenure ? `1 - ${tenure} (EMI)` : NIL}</td>
                <td className="kfs-center">{nil(emiText)}</td>
                <td>{firstDue ? `EMI commence from ${fmtDayMonYear(firstDue)}` : NIL}</td>
              </tr>
            </tbody>
          </table>

          <table className="kfs-table">
            <colgroup>
              <col className="kfs-col-no" />
              <col className="kfs-col-label" />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className="kfs-no">6</td>
                <td>Interest Rate (%) and Type (Fixed or Floating or Hybrid)</td>
                <td>{rate != null ? `${fmtPct(rate)}, Floating` : NIL}</td>
              </tr>
              <tr>
                <td className="kfs-no">7</td>
                <td colSpan={2}>Additional Information in case of Floating Rate of Interest</td>
              </tr>
            </tbody>
          </table>

          <table className="kfs-table kfs-floating">
            <thead>
              <tr>
                <th rowSpan={2}>Reference Benchmark</th>
                <th>Benchmark rate (%) (B)</th>
                <th>Spread (%) (S)</th>
                <th rowSpan={2}>Final rate (%) R = (B) + (S)</th>
                <th colSpan={2}>Reset periodicity (Months)<sup>2</sup></th>
                <th colSpan={2}>
                  Impact of change in the reference benchmark (For 25 bps change in ‘R’, change in:)<sup>3</sup> &amp; <sup>4</sup>
                </th>
              </tr>
              <tr>
                <th>Base Rate Value</th>
                <th>Spread Value</th>
                <th>B</th>
                <th>S</th>
                <th>EPI (₹)</th>
                <th>No. of EPIs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="kfs-strong">Base Rate</td>
                <td>{nil(fmtPct(baseRate))}</td>
                <td>{spread != null ? `(${spread < 0 ? '-' : '+'})${fmtPct(Math.abs(spread))}` : NIL}</td>
                <td>{nil(fmtPct(rate))}</td>
                <td>{RESET_PERIODICITY_MONTHS}</td>
                <td>{RESET_PERIODICITY_MONTHS}</td>
                <td>{nil(emiText)}</td>
                <td>{nil(shockedTenure ?? (shockedEmi ? tenure : null))}</td>
              </tr>
            </tbody>
          </table>

          <table className="kfs-table">
            <colgroup>
              <col className="kfs-col-no" />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className="kfs-no">8</td>
                <td>Fee/ Charges<sup>5</sup></td>
              </tr>
            </tbody>
          </table>
        </KfsPage>

        {/* Page 2: Fees, VAS, APR, contingent charges */}
        <KfsPage>
          <table className="kfs-table kfs-fees">
            <colgroup>
              <col className="kfs-col-no" />
              <col className="kfs-col-fee-name" />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th />
                <th />
                <th colSpan={2}>Payable to {LENDER_SHORT} (A)</th>
                <th colSpan={2}>Payable to a third party through {LENDER_SHORT} (B)</th>
              </tr>
              <tr>
                <th />
                <th>Config Name</th>
                <th>One-time/ Recurring</th>
                <th>Amount (in ₹) or Percentage (%) as applicable</th>
                <th>One- time/Recurring</th>
                <th>Amount (in ₹) or Percentage(%) as applicable</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="kfs-no">(i)</td><td>Processing Fee</td>
                <td>One Time</td><td>{totals.processingFee ? fmtINR(totals.processingFee) : NIL}</td>
                <td /><td />
              </tr>
              <tr>
                <td className="kfs-no">(ii)</td><td>Login Fees</td>
                <td>One Time</td><td>{documentationFee ? fmtINR(documentationFee) : NIL}</td>
                <td /><td />
              </tr>
              <tr>
                <td className="kfs-no">(iii)</td><td>Cersai Charge</td>
                <td /><td />
                <td>One Time</td><td>{NIL}</td>
              </tr>
              <tr>
                <td className="kfs-no">(iv)</td><td>Technical Fees</td>
                <td /><td />
                <td>One Time</td><td>{NIL}</td>
              </tr>
              <tr>
                <td className="kfs-no">(v)</td><td>Legal Fees</td>
                <td /><td />
                <td>One Time</td><td>{NIL}</td>
              </tr>
              <tr>
                <td colSpan={6} className="kfs-strong">
                  Value Added Services(&quot;VAS&quot;) <sup>6</sup> forming part of the Sanctioned Loan Amount
                </td>
              </tr>
              <tr>
                <td className="kfs-no">(i)</td><td>Life Insurance</td>
                <td /><td />
                <td>One Time</td><td>{insuranceAmount ? fmtINR(insuranceAmount) : NIL}</td>
              </tr>
              <tr>
                <td className="kfs-no">(ii)</td><td>Health Insurance</td>
                <td /><td />
                <td>One Time</td><td>{NIL}</td>
              </tr>
              <tr>
                <td className="kfs-no">(iii)</td><td>Personal Accident Cover</td>
                <td /><td />
                <td>One Time</td><td>{NIL}</td>
              </tr>
              <tr>
                <td className="kfs-no">(iv)</td><td>Stamp Duty</td>
                <td /><td />
                <td>One Time</td><td>{NIL}</td>
              </tr>
            </tbody>
          </table>

          <table className="kfs-table">
            <colgroup>
              <col className="kfs-col-no" />
              <col className="kfs-col-label" />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className="kfs-no">9</td>
                <td>Annual Percentage Rate (APR) (%)</td>
                <td>{nil(fmtPct(apr))}</td>
              </tr>
              <tr>
                <td className="kfs-no">10</td>
                <td colSpan={2}>Details of Contingent Charges (in ₹ or %, as applicable)</td>
              </tr>
              <tr>
                <td className="kfs-no">(i)</td>
                <td className="kfs-strong">Penal charges, if any, in case of delayed payment</td>
                <td className="kfs-strong">{penaltyPct != null ? `${fmtPct(penaltyPct)} p.m` : '2% p.m'}</td>
              </tr>
              <tr>
                <td className="kfs-no">(ii)</td>
                <td className="kfs-strong">Other penal charges, if any</td>
                <td>
                  Rs.25,000/- p.m. until the default is cured *
                  <div className="kfs-strong">
                    *[Cure period shall be as per the loan agreement or lender’s notice and shall not exceed 90 days.]
                  </div>
                </td>
              </tr>
              <tr>
                <td className="kfs-no">(iii)</td>
                <td>Foreclosure charges, if applicable</td>
                <td>
                  Foreclosure not allowed in the first 24 months of loan disbursement.{' '}
                  <strong>(Applicable charges in case of closure is at the discretion of company not beyond 6% of the POS)</strong>
                  <div>1% of the POS: Foreclosure after 24 months.</div>
                </td>
              </tr>
              <tr>
                <td className="kfs-no">(iv)</td>
                <td>Charges for switching of loans from floating to fixed rate and vice versa</td>
                <td className="kfs-strong">0.25% of loan outstanding amount</td>
              </tr>
              <tr>
                <td className="kfs-no">(v)</td>
                <td>Any other charges (please specify)</td>
                <td>All charges as applicable and as updated on our website</td>
              </tr>
            </tbody>
          </table>
        </KfsPage>

        {/* Page 3: Validity and Part 2 (1-4) */}
        <KfsPage>
          <table className="kfs-table">
            <colgroup>
              <col className="kfs-col-no" />
              <col className="kfs-col-label" />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className="kfs-no">(vi)</td>
                <td>
                  This KFS shall be valid for a period of thirty working days (Validity Period)
                  <div className="kfs-gap">
                    (Note: The aforesaid Validity Period refers to the period available to the borrower to agree to the
                    terms of the loan upon receipt of this KFS from the Lender.)
                  </div>
                </td>
                <td />
              </tr>
            </tbody>
          </table>

          <p className="kfs-part-title kfs-strong">Part 2 (Other qualitative information)</p>

          <table className="kfs-table">
            <colgroup>
              <col className="kfs-col-no" />
              <col className="kfs-col-label" />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className="kfs-no">1</td>
                <td>Clause of Loan agreement relating to engagement of recovery agents</td>
                <td>
                  Pursuant to Clause 10.1.11, upon occurrence of an Event of Default, the Lender shall have the right, at
                  its sole discretion, to exercise any or all rights that the Lender may have in accordance with applicable
                  Law including any remedy which may become available to the Lender in the event of any Law being made or
                  amended so as to provide the Lender access to any special legislation enacted for debt recovery.
                </td>
              </tr>
              <tr>
                <td className="kfs-no">2</td>
                <td>Clause of Loan agreement which details grievance redressal mechanism</td>
                <td>
                  Annexure A of this KFS comprises details of the Grievance Redressal Mechanism. The details of the
                  Designated Grievance Redressal Officer and the procedure for redressal of grievances have been also
                  placed on the website at {websiteText}.
                </td>
              </tr>
              <tr>
                <td className="kfs-no">3</td>
                <td>Phone number and email id of the nodal grievance redressal officer</td>
                <td className="kfs-nested-cell">
                  <table className="kfs-nested">
                    <colgroup>
                      <col className="kfs-col-gro" />
                      <col />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td colSpan={2} className="kfs-center">Details of Grievance Redressal Officer (GRO) of Lender</td>
                      </tr>
                      <tr><td>Name</td><td>{nil(gro.name)}</td></tr>
                      <tr><td>Designation</td><td>{nil(gro.designation)}</td></tr>
                      <tr><td>Telephone</td><td>{nil(gro.phone)}</td></tr>
                      <tr><td>Address</td><td>{`${lenderName}, ${lenderAddress}`}</td></tr>
                      <tr><td>Email</td><td>{nil(gro.email)}</td></tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td className="kfs-no">4</td>
                <td>Whether the loan is, or in future maybe, subject to transfer to other REs or securitisation (Yes/ No)</td>
                <td>Yes, the loan may be transferred in accordance with Clause 12.1 of the Loan Agreement.</td>
              </tr>
            </tbody>
          </table>
        </KfsPage>

        {/* Page 4: Part 2 (5-6) and APR computation (1-3) */}
        <KfsPage>
          <table className="kfs-table">
            <colgroup>
              <col className="kfs-col-no" />
              <col className="kfs-col-label" />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className="kfs-no">5</td>
                <td colSpan={2}>
                  In case of lending under collaborative lending arrangements (e.g., co-lending/ outsourcing), following
                  additional details may be furnished
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="kfs-nested-cell">
                  <table className="kfs-nested kfs-center-all">
                    <tbody>
                      <tr>
                        <td>Name of the originating {LENDER_SHORT}, along with its funding proportion</td>
                        <td>Name of the partner {LENDER_SHORT} along with its proportion of funding</td>
                        <td>Blended rate of interest</td>
                      </tr>
                      <tr>
                        <td>Not Applicable</td>
                        <td>Not Applicable</td>
                        <td>Not Applicable</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td className="kfs-no">6</td>
                <td colSpan={2}>In case of digital loans, following specific disclosures may be furnished</td>
              </tr>
              <tr>
                <td className="kfs-no">(i)</td>
                <td>
                  Cooling off/look-up period, in terms of RE’s board approved policy, during which borrower shall not be
                  charged any penalty on prepayment of loan
                </td>
                <td>Not Applicable</td>
              </tr>
              <tr>
                <td className="kfs-no">(ii)</td>
                <td>Details of LSP acting as recovery agent and authorized to approach the borrower</td>
                <td>Not Applicable</td>
              </tr>
            </tbody>
          </table>

          <p className="kfs-part-title kfs-strong">Computation of APR/Computation Sheet</p>

          <table className="kfs-table kfs-computation">
            <colgroup>
              <col className="kfs-col-no" />
              <col className="kfs-col-label" />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th>Sr. No</th>
                <th>Parameter</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="kfs-no">1</td><td>Sanctioned Loan amount (in Rupees)</td><td>{principal ? `INR ${fmtINR(principal)}` : NIL}</td></tr>
              <tr><td className="kfs-no">2</td><td>Loan Term (in years/ months/ days)</td><td>{nil(tenureText)}</td></tr>
              <tr>
                <td className="kfs-no">a)</td>
                <td>No. of instalments for payment of principal, in case of non- equated periodic loans</td>
                <td>{nil(tenure)}</td>
              </tr>
              <tr>
                <td className="kfs-no">b)</td>
                <td>
                  Type of EPI
                  <div>Amount of each EPI (in Rupees) and nos. of EPIs (e.g., no. of EMIs in case of monthly instalments)</div>
                </td>
                <td>{totals.emi ? `EMI-Rs. ${Math.round(totals.emi).toLocaleString('en-IN')} -${tenureText}` : NIL}</td>
              </tr>
              <tr><td className="kfs-no">c)</td><td>No. of instalments for payment of capitalised interest, if any</td><td>0</td></tr>
              <tr><td className="kfs-no">d)</td><td>Total amount capitalized during the Grace Period</td><td>0</td></tr>
              <tr><td className="kfs-no">e)</td><td>Commencement of repayments, post sanction</td><td>{nil(fmtOrdinalDate(firstDue))}</td></tr>
              <tr><td className="kfs-no">3</td><td>Interest rate type (fixed or floating or hybrid)</td><td>Floating</td></tr>
            </tbody>
          </table>
        </KfsPage>

        {/* Page 5: APR computation (4-11) and start of the repayment schedule */}
        <KfsPage>
          <table className="kfs-table kfs-computation">
            <colgroup>
              <col className="kfs-col-no" />
              <col className="kfs-col-label" />
              <col />
            </colgroup>
            <tbody>
              <tr><td className="kfs-no">4</td><td>Rate of Interest</td><td>{nil(fmtPct(rate))}</td></tr>
              <tr>
                <td className="kfs-no">5</td>
                <td>Total Interest Amount to be charged during the entire tenor of the loan as per the rate prevailing on sanction date (in Rupees)</td>
                <td>{totals.totalInterest != null ? fmtINR(totals.totalInterest) : NIL}</td>
              </tr>
              <tr><td className="kfs-no">6</td><td>Fee/ Charges payable (in Rupees)</td><td>{feesToLender ? fmtINR(feesToLender) : NIL}</td></tr>
              <tr><td className="kfs-no">A</td><td>Payable to the RE</td><td>{feesToLender ? fmtINR(feesToLender) : NIL}</td></tr>
              <tr><td className="kfs-no">B</td><td>Payable to third-party routed through RE</td><td>{NIL}</td></tr>
              <tr><td className="kfs-no">7</td><td>Net disbursed amount (1-6) (in Rupees)</td><td>{netDisbursed != null ? fmtINR(netDisbursed) : NIL}</td></tr>
              <tr>
                <td className="kfs-no">8</td>
                <td>Total amount to be paid by the borrower (sum of 1 &amp; 5) (in Rupees)</td>
                <td>{totals.totalPayable != null ? fmtINR(totals.totalPayable) : NIL}</td>
              </tr>
              <tr>
                <td className="kfs-no">9</td>
                <td>Annual Percentage rate- Effective annualized interest rate (in percentage)</td>
                <td>{nil(fmtPct(apr))}</td>
              </tr>
              <tr>
                <td className="kfs-no">10</td>
                <td>Schedule of disbursement as per terms and conditions</td>
                <td>{DISBURSAL_TEXT} <sup>8</sup></td>
              </tr>
              <tr>
                <td className="kfs-no">11</td>
                <td>Due date of payment of instalment and interest</td>
                <td>{`${ordinal(EMI_DUE_DAY)} of Each Month. As per the Repayment Schedule.`}</td>
              </tr>
            </tbody>
          </table>

          <p className="kfs-schedule-title">Repayment Schedule/Amortization Schedule</p>
          <ScheduleTable rows={firstScheduleRows} totalRows={totals.schedule} showTotals={restScheduleRows.length === 0} />
        </KfsPage>

        {schedulePages.map((rows, idx) => (
          <KfsPage key={`schedule-${idx}`}>
            <ScheduleTable rows={rows} totalRows={totals.schedule} showTotals={idx === schedulePages.length - 1} />
          </KfsPage>
        ))}

        {/* Annexure A: Levels 1-2 */}
        <KfsPage>
          <p className="kfs-annexure-title">Annexure A- Grievance Redressed Mechanism</p>
          <div className="kfs-annexure">
            <p>The Company follows a four (4) tier approach for redressal of customer grievances, as detailed below:</p>
            <p className="kfs-level">1. Level 1</p>
            <div className="kfs-lettered">
              <span>a.</span>
              <div>
                In case of any service request / complaints, the customer may contact the customer engagement team on any
                of the below mentioned contact points:
                <div className="kfs-contact">
                  <span>Email: {nil(lenderEmail)}</span>
                  <span>Toll Free Number for customers calling from India: {nil(lenderTollFree)}</span>
                  <span>Contact Number for customers calling from Abroad: {nil(lenderPhone)}</span>
                  <span>Written request to the below mentioned details:</span>
                </div>
                {lenderBlock}
              </div>
            </div>
            <div className="kfs-lettered">
              <span>b.</span>
              <div>
                On receipt of service request / complaint, an acknowledgement shall be given within 2 working days by us to
                the customer via e-mail/ letter by post/ SMS/any other form of legally valid electronic communication
                including WhatsApp. The Company shall endeavour to respond to the same within a period of 14 days.
              </div>
            </div>
            <div className="kfs-lettered">
              <span>c.</span>
              <div>
                However, in case where a complaint warrants extensive investigation and/or support of the customer to
                identify the perpetrator, root cause analysis, or under litigation (incl. pending with local Police
                authorities), the TAT for responding and resolving such complaints may be more than 14 days.
              </div>
            </div>
            <div className="kfs-lettered">
              <span>d.</span>
              <div>
                In case the customer is not satisfied with the resolution/response provided by the customer engagement
                team/s as above, then customer shall escalate to Level 2 as given below.
              </div>
            </div>

            <p className="kfs-level">2. Level 2</p>
            <div className="kfs-level-body">
              <p>
                It may be noted that the customers shall approach for resolution of their service request/complaint at the
                first instance to the customer engagement team as mentioned in Level 1 hereinabove, and if their request /
                complaint remains unresolved for a period of 14 days or they are dissatisfied with the resolution given,
                they are required to contact Grievance Redressal Cell of the Company:
              </p>
              <div className="kfs-address">
                <strong>Kind Attn: Senior Grievance Redressal Manager</strong>
                <strong>{lenderName}</strong>
                {lenderAddressLines.map((line) => <span key={line}>{line}</span>)}
                <span>Email: {nil(lenderEmail)}</span>
                <span>Telephone : {nil(lenderTollFree ?? lenderPhone)}</span>
              </div>
            </div>
          </div>
        </KfsPage>

        {/* Annexure A: Levels 3-4 and footnotes */}
        <KfsPage>
          <div className="kfs-annexure">
            <p className="kfs-level">3. Level 3</p>
            <div className="kfs-level-body">
              <p>
                In case the customer is not satisfied with the decision of the Grievance Redressal Cell, he may approach
                the Grievance Redressal Officer (GRO) of the Company:
              </p>
              <div className="kfs-address">
                <strong>Kind Attn: {nil(gro.name)}</strong>
                <strong>Grievance Redressal Officer (GRO)</strong>
                <strong>{lenderName}</strong>
                {lenderAddressLines.map((line) => <span key={line}>{line}</span>)}
                <span>Email: {nil(gro.email)}</span>
                <span>Telephone: {nil(gro.phone)}</span>
              </div>
              <p>We will make our best efforts to resolve customer’s complaint at this level.</p>
            </div>

            <p className="kfs-level">4. Level 4</p>
            <div className="kfs-lettered">
              <span>A.</span>
              <div>
                If the complaint is not redressed within a period of 30 days or if the customer is dissatisfied with the
                resolution received at Level 3 hereinabove, the customer may further escalate to Ombudsman via CMS Portal
                or Electronic / Physical mode by following procedure as mentioned on the website{' '}
                {lenderWebsite ? `${lenderWebsite.replace(/\/$/, '')}/grievance-redressal-mechanism` : 'of the Company'}
              </div>
            </div>
            <div className="kfs-lettered">
              <span>B.</span>
              <div>
                If the customer is aggrieved by the Ombudsman Award or rejection of complaint by Ombudsman Office,
                customer can file an appeal within 30 days of receipt of Award or rejection of complaint to:
                <div className="kfs-address">
                  <strong>Executive Director</strong>
                  <strong>Consumer Education &amp; Protection Department</strong>
                  <strong>Reserve Bank of India.</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="kfs-footnotes">
            <p><sup>1</sup> Please refer to the Amortization Schedule for details. The EPI is calculated assuming entire sanctioned loan amount has been disbursed. The EPI shall be subject to change in case of partial drawdown in accordance with revised Amortization Schedule.</p>
            <p><sup>2</sup> Fixed Reset other than on account of changes in credit profile. Reset Periodicity pertains to such period post which the Lender may prescribe change in ROI including due to changes in the Base Rate subject to the terms of the loan agreement.</p>
            <p><sup>3</sup> The effect of change in ROI is given in the tenor keeping the EMI constant in the normal course subject to maximum tenor criteria is met. The Borrower may elect to give effect in the EMI upon change in ROI by serving a notice to the Lender in this regard.</p>
            <p><sup>4</sup> The changed tenor shall be on account of upward revision in the base rate. The tenor change in such case would be in the range of 7 to 10 months; assuming the change in base rate has been effected after completing 3 months from the repayment start date.</p>
            <p><sup>5</sup> Amounts are mentioned inclusive of GST that shall be borne by the Borrower.</p>
          </div>
          <div className="kfs-footnotes">
            <p><sup>6</sup> These Amounts are part of the sanctioned loan amount and hence part of the APR calculation. Accordingly APR would not be calculated separately on these amounts to avoid duplication. These Amounts related to VAS would form part of Net disbursed amounts pursuant to disbursement of loan amount.</p>
            <p><sup>7</sup> “Net Disbursed Amount” is the loan amounts disbursed to the Borrower including loan for purchasing Value Added Services from the Service Providers such as insurer, health package provider and other VAS products. Accordingly, VAS Amounts forms part of the sanctioned loan amount.</p>
            <p><sup>8</sup> Disbursement shall be done as per the request of the Borrower, subject to sanction validity period to avail drawdowns.</p>
          </div>
        </KfsPage>
      </div>
    </div>
  );
}
