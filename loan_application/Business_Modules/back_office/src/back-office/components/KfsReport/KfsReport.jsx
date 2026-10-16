/**
 * KfsReport — Key Facts Statement (KFS)
 *
 * A4 paginated borrower disclosure: interest rate, fees, APR computation and the full
 * repayment schedule, built from the sanctioned (or proposed) loan terms. Amounts the
 * system does not capture yet are left blank.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import backOfficeService from '../../api/backOfficeService';
import {
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
  CamPage,
  KvTable,
  GridTable,
  SectionTitle,
  usePrintAndPdf,
} from '../CamReport/camShared';
import { amountInWords, calcEmi, calcKfsTotals, EMI_DUE_DAY } from './kfsCalc';
import './KfsReport.css';

const LENDER_FALLBACK = 'Sivels Finance Private Limited';
const DOC_LABEL = 'Key Facts Statement';
const SCHEDULE_ROWS_PER_PAGE = 50;
const RATE_SHOCK = 0.25;

const ordinal = (day) => {
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return `${day}${suffix}`;
};

const monthsToClear = (principal, annualRate, emi) => {
  const r = annualRate / 12 / 100;
  const ratio = (principal * r) / emi;
  if (!(r > 0) || ratio >= 1) return null;
  return Math.ceil(-Math.log(1 - ratio) / Math.log(1 + r));
};

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

export default function KfsReport({ verificationData, applicationProductDetailsId, agentCustomerId }) {
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
        custId ? backOfficeService.getLatestCreditDecision(custId) : Promise.resolve(null),
        appProdId > 0 ? backOfficeService.getLoanObligationsSummary(appProdId, 0) : Promise.resolve(null),
        appProdId > 0 ? backOfficeService.getAssessmentsByApplication(appProdId) : Promise.resolve([]),
        getMaster('/company/companyloansetting'),
        getMaster('/company/companymaster'),
        getMaster('/company/companyaddressmaster'),
        getMaster('/company/companycontactpersonmaster'),
        getMaster('/LoanTransactionTypeMaster'),
        getMaster('/City'),
        getMaster('/State'),
      ]);
      if (!isMounted) return;
      const [
        creditDecision, obligationSummary, assessments, loanSettings, companies, addresses, contacts,
        transactionTypes, cities, states,
      ] = results.map(settledValue);

      setData({
        creditDecision: firstRecord(creditDecision),
        obligationSummary: obligationSummary || null,
        assessments: toList(assessments),
        loanSetting: firstRecord(toList(loanSettings).filter((s) => s && s.isActive !== false)),
        company: firstRecord(toList(companies).filter((c) => c && c.status !== false)),
        address: firstRecord(toList(addresses)),
        contact: firstRecord(toList(contacts)),
        transactionTypes: toList(transactionTypes),
        cities: toList(cities),
        states: toList(states),
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

  const decision = data.creditDecision;
  const isApproved = String(pick(decision, ['decision', 'Decision']) || '').toLowerCase() === 'approved';
  const sanctioned = (keys) => (isApproved ? toNumber(pick(decision, keys)) : null);

  const assessment = useMemo(() => {
    const list = (data.assessments || []).filter(
      (a) => a && a.isActive !== false && Number(a.applicantSequence || 0) === 0
    );
    const current = list.filter((a) => a.isCurrent !== false);
    return (current.length ? current : list)[0] || null;
  }, [data.assessments]);

  const principal =
    sanctioned(['sanctionedLoanAmount', 'SanctionedLoanAmount']) ??
    toNumber(pick(data.obligationSummary, ['proposedLoanAmount'])) ??
    toNumber(productRecord.loanAmount) ??
    toNumber(app.loanAmount);
  const rate =
    sanctioned(['sanctionedROI', 'SanctionedROI', 'sanctionedRoi']) ??
    toNumber(pick(data.obligationSummary, ['proposedROI'])) ??
    toNumber(pick(assessment, ['proposedROI'])) ??
    toNumber(app.interestRate);
  const tenure =
    sanctioned(['sanctionedTenureMonths', 'SanctionedTenureMonths']) ??
    toNumber(pick(data.obligationSummary, ['proposedTenureMonths'])) ??
    toNumber(pick(assessment, ['proposedTenureMonths'])) ??
    toNumber(app.loanTenure);
  const sanctionDate = isApproved
    ? pick(decision, ['decisionDate', 'DecisionDate', 'createdDate', 'CreatedDate', 'createdAt'])
    : null;

  const loanSetting = data.loanSetting || {};
  const processingFeePct = toNumber(loanSetting.defaultProcessingFee);
  const insurancePct = toNumber(loanSetting.defaultInsurancePercentage);

  const totals = useMemo(
    () => calcKfsTotals({ principal, annualRate: rate, months: tenure, processingFeePct, startDate: sanctionDate }),
    [principal, rate, tenure, processingFeePct, sanctionDate]
  );

  const shockedEmi = calcEmi(principal, (rate || 0) + RATE_SHOCK, tenure);
  const shockedTenure = totals.emi ? monthsToClear(principal, (rate || 0) + RATE_SHOCK, totals.emi) : null;
  const insuranceAmount = principal > 0 && insurancePct > 0 ? principal * (insurancePct / 100) : null;

  /* ── Parties ─────────────────────────────────────────────────────── */

  const applicantName = dash(verificationData?.customerName);
  const accountNo = verificationData?.appId || verificationData?.customerCode || '';
  const loanType =
    pick(productWrapper, ['loanProductName', 'LoanProductName', 'productName', 'ProductName']) ??
    pick(productRecord, ['loanProductName', 'LoanProductName', 'productName', 'ProductName']) ??
    pick(app, ['loanProduct']) ??
    nameById(data.transactionTypes, 'loanTransactionTypeId', 'transactionTypeName', productRecord.loanTransactionTypeId);

  const company = data.company || {};
  const lenderName = pick(company, ['companyName']) || LENDER_FALLBACK;
  const lenderWebsite = pick(company, ['website']);
  const lenderEmail = pick(company, ['email']);
  const lenderPhone = pick(company, ['phoneNo', 'mobileNo']);
  const addr = data.address || {};
  const lenderAddress = [
    addr.addressLine1,
    addr.addressLine2,
    addr.area,
    nameById(data.cities, 'cityId', 'cityName', addr.cityId),
    nameById(data.states, 'stateId', 'stateName', addr.stateId),
    addr.pincode,
  ].filter((v) => !isBlank(v)).join(', ');

  const contact = data.contact || {};
  const gro = {
    name: pick(contact, ['contactPersonName', 'personName', 'name', 'fullName']),
    designation: pick(contact, ['designation', 'designationName']),
    phone: pick(contact, ['mobileNo', 'phoneNo', 'contactNo']),
    email: pick(contact, ['email', 'emailId']),
  };

  const dueDayText = `${ordinal(EMI_DUE_DAY)} of each month`;
  const footer = `Name of Applicant: ${applicantName} // Loan A/c No. ${accountNo} // ${lenderName}`;
  const tenureText = tenure ? `${tenure} Months` : '';
  const emiText = totals.emi ? `₹ ${fmtINR(totals.emi)}` : '';

  const { handlePrint, handleDownloadPdf, isExporting, exportError } = usePrintAndPdf(reportRef, {
    title: 'KFS',
    fileName: `KFS-${accountNo || agentCustomerId || 'Application'}.pdf`,
  });

  const schedulePages = chunk(totals.schedule, SCHEDULE_ROWS_PER_PAGE);

  let pageNo = 0;
  const nextPage = () => {
    pageNo += 1;
    return pageNo;
  };

  return (
    <div className="cam-report kfs-report">
      <div className="cam-toolbar">
        <span className="cam-toolbar-status">{loading ? 'Loading KFS data…' : DOC_LABEL}</span>
        <div className="cam-toolbar-actions">
          {exportError && <span className="cam-toolbar-error">{exportError}</span>}
          <button type="button" className="cam-btn" onClick={handlePrint} disabled={loading}>Print</button>
          <button type="button" className="cam-btn cam-btn-primary" onClick={handleDownloadPdf} disabled={loading || isExporting}>
            {isExporting ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {!isApproved && !loading && (
        <div className="kfs-notice">
          The loan is not yet sanctioned, so this KFS uses the proposed amount, rate and tenure.
        </div>
      )}

      <div className="cam-print-root" ref={reportRef}>
        {/* Part 1 */}
        <CamPage number={nextPage()} footer={footer} label={DOC_LABEL}>
          <p className="kfs-date">Date: {fmtDate(sanctionDate || new Date())}</p>
          <h2 className="kfs-title">Key Facts Statement</h2>
          <SectionTitle>Part 1 (Interest rate and fees/charges)</SectionTitle>
          <table className="cam-table cam-kv kfs-numbered">
            <tbody>
              <tr>
                <td className="kfs-no">1</td>
                <th>Loan proposal / account No.</th>
                <td>{dash(accountNo)}</td>
                <th>Type of Loan</th>
                <td>{dash(loanType)}</td>
              </tr>
              <tr>
                <td className="kfs-no">2</td>
                <th>Sanctioned Loan amount (in Rupees)</th>
                <td colSpan={3}>
                  {principal ? `INR ${fmtINR(principal)} (${amountInWords(principal)})` : ''}
                </td>
              </tr>
              <tr>
                <td className="kfs-no">3</td>
                <th>Disbursal schedule</th>
                <td colSpan={3}>
                  The Loan may be disbursed in 1 (one) or more instalments, as set out in Schedule I (Loan Details) of the
                  Loan Agreement and in accordance with the Lender&apos;s policy.
                </td>
              </tr>
              <tr>
                <td className="kfs-no">4</td>
                <th>Loan term (year/months/days)</th>
                <td colSpan={3}>{tenureText}</td>
              </tr>
            </tbody>
          </table>

          <h4 className="cam-sub-title">5. Instalment details</h4>
          <GridTable
            headers={['Type of instalments', 'Number of EPIs', 'EPI (₹)¹', 'Commencement of repayment, post sanction']}
            rows={[[
              'Monthly',
              tenure ? `1 - ${tenure} (EMI)` : '',
              emiText,
              totals.firstDueDate ? `EMI commences from ${fmtDate(totals.firstDueDate)}` : '',
            ]]}
          />

          <KvTable rows={[['6. Interest Rate (%) and Type', rate != null ? `${fmtNum(rate)}%, Floating` : '']]} />

          <h4 className="cam-sub-title">7. Additional Information in case of Floating Rate of Interest</h4>
          <GridTable
            headers={['Reference Benchmark', 'Benchmark rate (%) (B)', 'Spread (%) (S)', 'Final rate (%) R = (B) + (S)', 'Reset periodicity (Months)²', `EPI (₹) for ${RATE_SHOCK * 100} bps change³`, 'No. of EPIs⁴']}
            rows={[[
              'Base Rate',
              '',
              '',
              rate != null ? `${fmtNum(rate)}%` : '',
              '3',
              shockedEmi ? fmtINR(Math.round(shockedEmi)) : '',
              shockedTenure ?? '',
            ]]}
          />

          <h4 className="cam-sub-title">8. Fee / Charges⁵</h4>
          <GridTable
            headers={['#', 'Charge', 'Payable to the Lender (A): One-time / Recurring', 'Amount (₹) or %', 'Payable to a third party through the Lender (B): One-time / Recurring', 'Amount (₹) or %']}
            rows={[
              ['(i)', 'Processing Fee', 'One Time', totals.processingFee ? fmtINR(totals.processingFee) : '', '', ''],
              ['(ii)', 'Login Fees', 'One Time', '', '', ''],
              ['(iii)', 'CERSAI Charge', '', '', 'One Time', ''],
              ['(iv)', 'Technical Fees', '', '', 'One Time', ''],
              ['(v)', 'Legal Fees', '', '', 'One Time', ''],
            ]}
          />
          <h4 className="cam-sub-title">Value Added Services (&quot;VAS&quot;)⁶ forming part of the Sanctioned Loan Amount</h4>
          <GridTable
            headers={['#', 'Service', 'One-time / Recurring', 'Amount (₹)']}
            rows={[
              ['(i)', 'Life Insurance', 'One Time', insuranceAmount ? fmtINR(insuranceAmount) : ''],
              ['(ii)', 'Health / Accident Cover', 'One Time', ''],
              ['(iii)', 'Stamp Duty', 'One Time', ''],
            ]}
          />
        </CamPage>

        <CamPage number={nextPage()} footer={footer} label={DOC_LABEL}>
          <KvTable rows={[['9. Annual Percentage Rate (APR) (%)', totals.apr != null ? `${fmtNum(totals.apr)}%` : '']]} />

          <h4 className="cam-sub-title">10. Details of Contingent Charges (in ₹ or %, as applicable)</h4>
          <GridTable
            headers={['#', 'Charge', 'Details']}
            rows={[
              ['(i)', 'Penal charges, if any, in case of delayed payment', ''],
              ['(ii)', 'Other penal charges, if any', 'Cure period shall be as per the loan agreement or the Lender’s notice and shall not exceed 90 days.'],
              ['(iii)', 'Foreclosure charges, if applicable', 'As per the Loan Agreement and the Lender’s policy prevailing at the time of foreclosure.'],
              ['(iv)', 'Charges for switching of loans from floating to fixed rate and vice versa', ''],
              ['(v)', 'Any other charges (please specify)', `All charges as applicable and as updated on our website${lenderWebsite ? ` (${lenderWebsite})` : ''}.`],
              ['(vi)', 'Validity of this KFS', 'This KFS shall be valid for a period of thirty working days (Validity Period). The Validity Period is the time available to the borrower to agree to the terms of the loan upon receipt of this KFS from the Lender.'],
            ]}
          />

          <SectionTitle>Part 2 (Other qualitative information)</SectionTitle>
          <GridTable
            headers={['#', 'Parameter', 'Details']}
            rows={[
              ['1', 'Clause of Loan agreement relating to engagement of recovery agents', 'Upon occurrence of an Event of Default, the Lender shall have the right, at its sole discretion, to exercise any or all rights available to it under applicable law, including engagement of recovery agents in accordance with the Loan Agreement and regulatory guidelines.'],
              ['2', 'Clause of Loan agreement which details grievance redressal mechanism', `Annexure A of this KFS details the Grievance Redressal Mechanism. The details of the Grievance Redressal Officer and the redressal procedure are also available on our website${lenderWebsite ? ` at ${lenderWebsite}` : ''}.`],
            ]}
          />

          <h4 className="cam-sub-title">3. Phone number and email id of the nodal grievance redressal officer</h4>
          <KvTable
            rows={[
              ['Name', gro.name, 'Designation', gro.designation],
              ['Telephone', gro.phone ?? lenderPhone, 'Email', gro.email ?? lenderEmail],
              ['Address', lenderName + (lenderAddress ? `, ${lenderAddress}` : '')],
            ]}
          />

          <KvTable
            rows={[[
              '4. Whether the loan is, or in future may be, subject to transfer to other REs or securitisation (Yes / No)',
              'Yes, the loan may be transferred in accordance with the Loan Agreement.',
            ]]}
          />

          <h4 className="cam-sub-title">5. Collaborative lending arrangements (e.g., co-lending / outsourcing)</h4>
          <GridTable
            headers={['Name of the originating RE, along with its funding proportion', 'Name of the partner RE along with its proportion of funding', 'Blended rate of interest']}
            rows={[['Not Applicable', 'Not Applicable', 'Not Applicable']]}
          />

          <h4 className="cam-sub-title">6. Digital loans</h4>
          <GridTable
            headers={['#', 'Disclosure', 'Details']}
            rows={[
              ['(i)', 'Cooling off / look-up period during which the borrower shall not be charged any penalty on prepayment of loan', 'Not Applicable'],
              ['(ii)', 'Details of LSP acting as recovery agent and authorized to approach the borrower', 'Not Applicable'],
            ]}
          />
        </CamPage>

        {/* APR computation sheet */}
        <CamPage number={nextPage()} footer={footer} label={DOC_LABEL}>
          <SectionTitle>Computation of APR / Computation Sheet</SectionTitle>
          <GridTable
            headers={['Sr. No', 'Parameter', 'Details']}
            rows={[
              ['1', 'Sanctioned Loan amount (in Rupees)', principal ? `INR ${fmtINR(principal)}` : ''],
              ['2', 'Loan Term (in years / months / days)', tenureText],
              ['a)', 'No. of instalments for payment of principal, in case of non-equated periodic loans', tenure ?? ''],
              ['b)', 'Type of EPI; amount of each EPI (in Rupees) and no. of EPIs', totals.emi ? `EMI - ₹ ${fmtINR(totals.emi)} - ${tenureText}` : ''],
              ['c)', 'No. of instalments for payment of capitalised interest, if any', '0'],
              ['d)', 'Total amount capitalised during the Grace Period', '0'],
              ['e)', 'Commencement of repayments, post sanction', fmtDate(totals.firstDueDate)],
              ['3', 'Interest rate type (fixed or floating or hybrid)', 'Floating'],
              ['4', 'Rate of Interest', rate != null ? `${fmtNum(rate)}%` : ''],
              ['5', 'Total Interest Amount to be charged during the entire tenor of the loan as per the rate prevailing on sanction date (in Rupees)', totals.totalInterest != null ? fmtINR(totals.totalInterest) : ''],
              ['6', 'Fee / Charges payable (in Rupees)', totals.processingFee ? fmtINR(totals.processingFee) : ''],
              ['A', 'Payable to the RE', totals.processingFee ? fmtINR(totals.processingFee) : ''],
              ['B', 'Payable to third-party routed through RE', ''],
              ['7', 'Net disbursed amount (1-6) (in Rupees)⁷', totals.netDisbursed != null ? fmtINR(totals.netDisbursed) : ''],
              ['8', 'Total amount to be paid by the borrower (sum of 1 and 5) (in Rupees)', totals.totalPayable != null ? fmtINR(totals.totalPayable) : ''],
              ['9', 'Annual Percentage Rate - Effective annualised interest rate (in percentage)', totals.apr != null ? `${fmtNum(totals.apr)}%` : ''],
              ['10', 'Schedule of disbursement as per terms and conditions', 'The Loan may be disbursed in 1 (one) or more instalments, as set out in Schedule I (Loan Details) of the Loan Agreement and in accordance with the Lender’s policy.⁸'],
              ['11', 'Due date of payment of instalment and interest', `${dueDayText}, as per the Repayment Schedule.`],
            ]}
          />
        </CamPage>

        {/* Repayment schedule */}
        {(schedulePages.length ? schedulePages : [[]]).map((rows, idx) => (
          <CamPage key={`schedule-${idx}`} number={nextPage()} footer={footer} label={DOC_LABEL}>
            <SectionTitle>
              Repayment Schedule / Amortization Schedule{schedulePages.length > 1 ? ` (${idx + 1} of ${schedulePages.length})` : ''}
            </SectionTitle>
            <GridTable
              className="kfs-schedule"
              headers={['Installment', 'Date', 'Interest', 'Principal', 'EMI', 'Closing']}
              rows={rows.map((r) => [
                r.installment,
                fmtDate(r.date),
                r.interest.toLocaleString('en-IN'),
                r.principal.toLocaleString('en-IN'),
                r.emi.toLocaleString('en-IN'),
                r.closing.toLocaleString('en-IN'),
              ])}
            />
          </CamPage>
        ))}

        {/* Annexure A */}
        <CamPage number={nextPage()} footer={footer} label={DOC_LABEL}>
          <SectionTitle>Annexure A - Grievance Redressal Mechanism</SectionTitle>
          <div className="kfs-text">
            <p>The Company follows a four (4) tier approach for redressal of customer grievances, as detailed below:</p>
            <h4 className="cam-sub-title">Level 1</h4>
            <p>
              In case of any service request / complaint, the customer may contact our customer service team at
              {lenderEmail ? ` ${lenderEmail}` : ' the email published on our website'}
              {lenderPhone ? ` or call ${lenderPhone}` : ''}, or write to {lenderName}
              {lenderAddress ? `, ${lenderAddress}` : ''}.
            </p>
            <p>
              An acknowledgement shall be given within 2 working days via e-mail / letter / SMS / any other legally valid
              electronic communication. The Company shall endeavour to respond within 14 days. Complaints that warrant
              extensive investigation, root cause analysis, or are under litigation may take longer to resolve.
            </p>
            <h4 className="cam-sub-title">Level 2</h4>
            <p>
              If the request / complaint remains unresolved for 14 days, or the customer is dissatisfied with the
              resolution, the customer may contact the Grievance Redressal Cell of the Company at the address above.
            </p>
            <h4 className="cam-sub-title">Level 3</h4>
            <p>
              If the customer is not satisfied with the decision of the Grievance Redressal Cell, the customer may approach
              the Grievance Redressal Officer (GRO): {[gro.name, gro.designation, gro.email ?? lenderEmail, gro.phone ?? lenderPhone].filter((v) => !isBlank(v)).join(', ') || '(details as published on our website)'}.
            </p>
            <h4 className="cam-sub-title">Level 4</h4>
            <p>
              If the complaint is not redressed within 30 days, or the customer is dissatisfied with the resolution at
              Level 3, the customer may escalate to the RBI Ombudsman via the CMS portal (https://cms.rbi.org.in) or by
              electronic / physical mode. If aggrieved by the Ombudsman&apos;s award or rejection of the complaint, the
              customer may appeal within 30 days to the Executive Director, Consumer Education &amp; Protection
              Department, Reserve Bank of India.
            </p>
          </div>

          <SectionTitle>Notes</SectionTitle>
          <ol className="kfs-footnotes">
            <li>Please refer to the Amortization Schedule. The EPI assumes the entire sanctioned loan amount has been disbursed and may change in case of partial drawdown.</li>
            <li>Reset periodicity is the period after which the Lender may change the rate of interest, including due to changes in the Base Rate, subject to the Loan Agreement.</li>
            <li>The effect of a change in rate of interest is given in the tenor, keeping the EMI constant, subject to maximum tenor criteria. The borrower may elect to give effect in the EMI by notice to the Lender.</li>
            <li>No. of EPIs shown is the revised tenor (keeping the EMI constant) for a {RATE_SHOCK * 100} bps upward change in the rate of interest.</li>
            <li>Amounts are inclusive of GST, which shall be borne by the Borrower.</li>
            <li>VAS amounts are part of the sanctioned loan amount and hence of the APR calculation; APR is not calculated separately on them.</li>
            <li>Net Disbursed Amount is the loan amount disbursed to the Borrower, including amounts for Value Added Services.</li>
            <li>Disbursement shall be done as per the request of the Borrower, subject to the sanction validity period.</li>
          </ol>
        </CamPage>
      </div>
    </div>
  );
}
