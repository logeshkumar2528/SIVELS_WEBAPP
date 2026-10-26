/**
 * SanctionLetter.jsx
 * --------------------
 * Sivels Finance loan Sanction Letter rendered from the application already loaded
 * in the Customer Verification workspace. Laid out as A4 pages and downloadable as PDF.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Printer } from 'lucide-react';
import approvalDocumentService from '../../services/approvalDocumentService';
import { calcEmi } from '../../utils/kfsCalc';
import SivelsLogo from '../../../../assets/branding/SivelsFinanceLogo.jpg';
import './SanctionLetter.css';

const COMPANY = 'Sivels Holdings (P) Ltd';
const COMPANY_ADDRESS = 'New No. 86, Old No. 1091, Periyar EVR High Road, Chennai - 600007.';
const COMPANY_CIN = 'U65921TN2012PTC084410';
const COMPANY_GSTIN = '33AARCS0202L1ZF';
const PAGE_FOOTER = 'Signed, Stamped and Accepted by all the Borrower(s)/Co-Applicant(s)/Guarantor(s)';
const EMPTY = '—';

const MISSING_VALUES = new Set(['', 'not available', 'n/a', 'na', 'null', 'undefined', '—', '-']);

function clean(value) {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  return MISSING_VALUES.has(text.toLowerCase()) ? '' : text;
}

function pick(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of keys) {
    const value = clean(obj[key]);
    if (value) return value;
  }
  return '';
}

function toList(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function sequenceOf(row, fallback) {
  const raw = row?.applicantSequence ?? row?.ApplicantSequence;
  const seq = Number(raw);
  return raw !== undefined && raw !== null && Number.isFinite(seq) ? seq : fallback;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(num) ? num : null;
}

function formatRupees(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) return EMPTY;
  return `Rs. ${num.toLocaleString('en-IN')}/-`;
}

function formatLetterDate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-IN', { month: 'short' });
  return `${day}-${month}-${d.getFullYear()}`;
}

function formatLongDate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n) {
  if (n < 20) return ONES[n];
  return [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' ');
}

function threeDigitWords(n) {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return [hundred ? `${ONES[hundred]} Hundred` : '', rest ? twoDigitWords(rest) : ''].filter(Boolean).join(' ');
}

/** Indian numbering system (Crore / Lakh / Thousand). */
function amountInWords(amount) {
  let n = Math.floor(Number(amount));
  if (!Number.isFinite(n) || n <= 0) return '';
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const parts = [
    crore ? `${threeDigitWords(crore)} Crore` : '',
    lakh ? `${twoDigitWords(lakh)} Lakh${lakh > 1 ? 's' : ''}` : '',
    thousand ? `${twoDigitWords(thousand)} Thousand` : '',
    n ? threeDigitWords(n) : '',
  ].filter(Boolean);
  return `${parts.join(' ')} Rupees Only`;
}

function formatAddress(address) {
  if (!address) return '';
  const parts = [address.doorNo, address.streetName, address.landmark, address.city, address.district, address.state]
    .map(clean)
    .filter(Boolean)
    .filter((part, idx, arr) => arr.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === idx);
  const pincode = clean(address.pincode);
  const line = parts.join(', ');
  return pincode ? `${line}${line ? ' - ' : ''}${pincode}` : line;
}

function formatRawAddress(row) {
  if (!row) return '';
  return formatAddress({
    doorNo: pick(row, 'addressLine1', 'AddressLine1'),
    streetName: pick(row, 'addressLine2', 'AddressLine2'),
    landmark: pick(row, 'landmark', 'Landmark'),
    city: pick(row, 'cityName', 'CityName'),
    district: pick(row, 'districtName', 'DistrictName', 'district', 'District'),
    state: pick(row, 'stateName', 'StateName'),
    pincode: pick(row, 'pincode', 'Pincode', 'postalCode', 'PostalCode'),
  });
}

function withTitle(title, name) {
  if (!name) return '';
  if (!title || /^\d+$/.test(title)) return name;
  const prefix = title.endsWith('.') ? title : `${title}.`;
  return name.toLowerCase().startsWith(title.toLowerCase()) ? name : `${prefix} ${name}`;
}

function buildLetterData(verificationData, coApplicants, approvedTerms = null, loanIdentifier = null) {
  const app = verificationData?.applicationDetails || {};
  const personal = verificationData?.personalInformation || {};
  const address = verificationData?.addressDetails || {};
  const charges = verificationData?.scheduleCharges || {};
  const collateral = verificationData?.collateral || {};
  const raw = verificationData?.raw || {};

  const borrowerName = clean(verificationData?.customerName) || clean(personal.fullName);
  const title = pick(personal.raw, 'titleName', 'TitleName', 'title', 'Title');

  const isCompleteApproved = approvedTerms?.isCompleteApproved ?? false;
  const loanAmount = isCompleteApproved ? (approvedTerms.approvedLoanAmount || 0) : 0;
  const roi = isCompleteApproved && approvedTerms.approvedROI != null ? String(approvedTerms.approvedROI) : '';
  const tenure = isCompleteApproved && approvedTerms.approvedTenure != null ? String(approvedTerms.approvedTenure) : '';
  const emi = isCompleteApproved ? (approvedTerms.emi || 0) : 0;

  const rawAddresses = toList(raw.addressDetails || raw.AddressDetails);
  const rawPersonal = toList(raw.personalInformation || raw.PersonalInformation);

  const coApplicantRows = (coApplicants || []).map((co) => {
    const seq = co.sequence ?? co.number;
    const pers = co.personalRecord || rawPersonal.find((p, idx) => sequenceOf(p, idx) === seq) || {};
    const addrRow = rawAddresses.find((a, idx) => sequenceOf(a, idx) === seq);
    const coTitle = pick(pers, 'titleName', 'TitleName', 'title', 'Title');
    return {
      name: withTitle(coTitle, clean(co.name)),
      type: pick(pers, 'applicantTypeName', 'ApplicantTypeName') || 'Co-Applicant',
      pan: clean(co.pan),
      address: formatRawAddress(addrRow),
    };
  });

  const collateralRows = toList(collateral.raw)
    .map((row) => ({
      type: pick(row, 'propertyName', 'PropertyName', 'propertyTypeName', 'PropertyTypeName'),
      address: pick(row, 'locationAddress', 'LocationAddress', 'propertyAddress', 'PropertyAddress'),
      owner: pick(row, 'ownerName', 'OwnerName', 'propertyOwnerName', 'PropertyOwnerName'),
    }))
    .filter((row) => row.type || row.address);

  const processingFee = Number(charges.processingFee) || 0;
  const processingFeePercent = loanAmount > 0 && processingFee > 0
    ? `${Number(((processingFee / loanAmount) * 100).toFixed(2))}%`
    : '';

  const correspondence = formatAddress(address.currentAddress);
  const registered = address.permanentAddress?.sameAsCurrent
    ? correspondence
    : formatAddress(address.permanentAddress) || correspondence;

  const letterDate = approvedTerms?.sanctionDate || formatLetterDate(new Date());

  const officialSanctionLetterId = clean(loanIdentifier?.sanctionLetterId);
  const officialLoanAccountNumber = clean(loanIdentifier?.loanAccountNumber);

  return {
    refNo: officialSanctionLetterId || EMPTY,
    sanctionLetterRef: officialSanctionLetterId || EMPTY,
    loanAccountNumber: officialLoanAccountNumber || EMPTY,
    branch: clean(app.sourcingBranch) || clean(verificationData?.districtName),
    letterDate,
    applicationDate: formatLongDate(verificationData?.appliedDate || app.appliedDate),
    borrowerName,
    borrowerDisplayName: withTitle(title, borrowerName),
    pan: clean(personal.panNumber),
    registeredAddress: registered,
    correspondenceAddress: correspondence,
    constitution: 'Individual',
    coApplicants: coApplicantRows,
    product: clean(app.loanProduct),
    loanAmount,
    loanAmountWords: amountInWords(loanAmount),
    purpose: clean(app.purposeOfLoan),
    tenure,
    emi,
    roi,
    processingFee,
    processingFeePercent,
    insuranceFee: Number(charges.insuranceFee) || 0,
    hasCollateral: Boolean(collateral.hasCollateral) && collateralRows.length > 0,
    collateralRows,
  };
}

/** Maps a saved PD assessment record to the PD sheet shape used on the verification page. */
function normalizePdRecord(record) {
  const resolved = Array.isArray(record) ? record[0] : record;
  if (!resolved || typeof resolved !== 'object') return null;
  const rawConditions = resolved.sanctionConditions ?? resolved.SanctionConditions ?? [];
  return {
    pdVisitDate: pick(resolved, 'dateOfPdVisit', 'DateOfPdVisit'),
    pdDoneBy: pick(resolved, 'pdDoneBy', 'PdDoneBy', 'createdByName', 'CreatedByName'),
    pdAddress: pick(resolved, 'pdAddress', 'PdAddress'),
    personalDiscussionSiteVisit: pick(resolved, 'personalDiscussionSiteVisit', 'PersonalDiscussionSiteVisit'),
    endUse: pick(resolved, 'endUse', 'EndUse'),
    disbursementTransaction: pick(resolved, 'disbursementTransaction', 'DisbursementTransaction'),
    applicantProfile: pick(resolved, 'applicantProfile', 'ApplicantProfile'),
    coApplicantProfile: pick(resolved, 'coApplicantProfile', 'CoApplicantProfile'),
    bureauReport: pick(resolved, 'bureauReport', 'BureauReport'),
    proposedCollateral: pick(resolved, 'proposedCollateral', 'ProposedCollateral'),
    legalAndTechnical: pick(resolved, 'legalTechnicalReview', 'LegalTechnicalReview'),
    strengths: pick(resolved, 'strengths', 'Strengths'),
    concerns: pick(resolved, 'concerns', 'Concerns'),
    recommendation: pick(resolved, 'recommendation', 'Recommendation', 'finalRemarks', 'FinalRemarks'),
    otherSanctionConditions: toList(rawConditions)
      .filter((c) => c && c.isActive !== false && c.IsActive !== false)
      .map((c) => (typeof c === 'string' ? c : c.conditionText ?? c.ConditionText ?? '')),
  };
}

function hasPdContent(sheet) {
  if (!sheet) return false;
  return Object.entries(sheet).some(([key, value]) => (
    key === 'otherSanctionConditions'
      ? toList(value).some((c) => clean(c))
      : key !== 'id' && key !== 'pdDoneBy' && clean(value)
  ));
}

function PdPoint({ label, value }) {
  return (
    <>
      <strong>{label}:</strong> <span className="sl-pd-value">{value}</span>
    </>
  );
}

/** PD sheet fields 1–13 that have a value; empty fields are left out. */
function buildPdPoints(sheet, pdDoneBy) {
  const s = sheet || {};
  const fields = [
    ['date', 'Date of PD Visit', formatLetterDate(s.pdVisitDate) || clean(s.pdVisitDate)],
    ['by', 'PD Done By', clean(s.pdDoneBy) || clean(pdDoneBy)],
    ['addr', 'Address Where PD Was Conducted', clean(s.pdAddress)],
    ['visit', 'Personal Discussion / Site Visit', clean(s.personalDiscussionSiteVisit)],
    ['enduse', 'End Use of the Loan', clean(s.endUse)],
    ['disb', 'Disbursement Transaction', clean(s.disbursementTransaction)],
    ['app', 'Applicant Profile', clean(s.applicantProfile)],
    ['coapp', 'Co-Applicant Profile', clean(s.coApplicantProfile)],
    ['bureau', 'About Bureau Report of Applicant & Co-Applicant', clean(s.bureauReport)],
    ['collateral', null, null],
    ['str', 'Strengths', clean(s.strengths)],
    ['con', 'Concerns (If Any)', clean(s.concerns)],
    ['rec', 'Recommendation', clean(s.recommendation)],
  ];

  const collateralItems = [
    ['c', 'Proposed Collateral Details', clean(s.proposedCollateral)],
    ['l', 'Legal & Technical Review', clean(s.legalAndTechnical)],
  ]
    .filter(([, , value]) => value)
    .map(([key, label, value]) => <PdPoint key={key} label={label} value={value} />);

  return fields.flatMap(([key, label, value]) => {
    if (key === 'collateral') {
      if (collateralItems.length === 0) return [];
      return [
        <React.Fragment key={key}>
          <strong>About Proposed Collateral (Including Legal and Technical):</strong>
          <BulletList items={collateralItems} />
        </React.Fragment>,
      ];
    }
    return value ? [<PdPoint key={key} label={label} value={value} />] : [];
  });
}

function PageHeader() {
  return (
    <div className="sl-page-header">
      <img src={SivelsLogo} alt="Sivels Finance" className="sl-header-logo" />
    </div>
  );
}

function PageFooter({ pageNo }) {
  return (
    <div className="sl-page-footer">
      <span>{PAGE_FOOTER}</span>
      <span className="sl-page-no">Page {pageNo}</span>
    </div>
  );
}

function SignatureStrip({ signatories }) {
  return (
    <div className="sl-sign-strip">
      {signatories.map((signatory, idx) => (
        <div key={`${signatory.role}-${idx}`} className="sl-sign-strip-item">
          <div className="sl-sign-strip-line" />
          <strong>{signatory.name || EMPTY}</strong>
          <span>{signatory.role}</span>
        </div>
      ))}
    </div>
  );
}

function LetterPage({ pageNo, children, pageRef, footerExtra, signatories }) {
  return (
    <section className="sl-page" ref={pageRef}>
      <PageHeader />
      <div className="sl-page-body">{children}</div>
      {signatories && <SignatureStrip signatories={signatories} />}
      {footerExtra}
      <PageFooter pageNo={pageNo} />
    </section>
  );
}

function TermRow({ label, children }) {
  return (
    <tr>
      <th className="sl-term-label" scope="row">{label}</th>
      <td className="sl-term-value">{children}</td>
    </tr>
  );
}

function NumberedList({ items, start = 1 }) {
  return (
    <div className="sl-numbered">
      {items.map((item, idx) => (
        <div key={idx} className="sl-list-item">
          <span className="sl-list-marker">{start + idx}.</span>
          <div className="sl-list-text">{item}</div>
        </div>
      ))}
    </div>
  );
}

function BulletList({ items }) {
  return (
    <div className="sl-bullets">
      {items.map((item, idx) => (
        <div key={idx} className="sl-list-item">
          <span className="sl-list-marker">•</span>
          <div className="sl-list-text">{item}</div>
        </div>
      ))}
    </div>
  );
}

export default function SanctionLetter({
  verificationData,
  coApplicants = [],
  applicationProductDetailsId,
  unsavedPdSheet = null,
  pdDoneBy = '',
  agentCustomerId = null,
  creditDecision: creditDecisionProp = null,
  loanIdentifier = null,
  onGenerateIdentifier = null,
  isGeneratingIdentifier = false,
}) {
  const pageRefs = useRef([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [savedPdSheet, setSavedPdSheet] = useState(null);
  const [pdSheetLoading, setPdSheetLoading] = useState(false);

  const resolvedCustomerId =
    agentCustomerId ||
    verificationData?.customerId ||
    verificationData?.agentCustomerId ||
    verificationData?.raw?.agentCustomerId ||
    verificationData?.raw?.AgentCustomerId ||
    null;

  const [creditDecision, setCreditDecision] = useState(creditDecisionProp);
  const [decisionLoading, setDecisionLoading] = useState(false);

  useEffect(() => {
    if (creditDecisionProp) {
      setCreditDecision(creditDecisionProp);
      return;
    }
    const custId = Number(resolvedCustomerId);
    if (!custId || custId <= 0) {
      setCreditDecision(null);
      return;
    }
    let isMounted = true;
    setDecisionLoading(true);
    approvalDocumentService
      .getLatestCreditDecision(custId)
      .then((dec) => {
        if (isMounted) setCreditDecision(dec);
      })
      .catch((err) => {
        console.warn('[SanctionLetter] Failed to load latest credit decision:', err?.message || err);
        if (isMounted) setCreditDecision(null);
      })
      .finally(() => {
        if (isMounted) setDecisionLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [creditDecisionProp, resolvedCustomerId]);

  useEffect(() => {
    const appProdId = Number(applicationProductDetailsId);
    if (!appProdId || appProdId <= 0) {
      setSavedPdSheet(null);
      return undefined;
    }
    let isMounted = true;
    setPdSheetLoading(true);
    approvalDocumentService
      .getPdAssessmentByApplication(appProdId)
      .then((record) => {
        if (isMounted) setSavedPdSheet(normalizePdRecord(record));
      })
      .catch((err) => {
        console.warn('[SanctionLetter] No PD assessment found for this application:', err?.message || err);
        if (isMounted) setSavedPdSheet(null);
      })
      .finally(() => {
        if (isMounted) setPdSheetLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [applicationProductDetailsId]);

  const decisionStatus = String(
    creditDecision?.decision ?? creditDecision?.Decision ?? ''
  ).trim();
  const isApproved = decisionStatus.toLowerCase() === 'approved';

  const approvedLoanAmount = isApproved
    ? toNumber(creditDecision?.sanctionedLoanAmount ?? creditDecision?.SanctionedLoanAmount)
    : null;
  const approvedROI = isApproved
    ? toNumber(creditDecision?.sanctionedROI ?? creditDecision?.SanctionedROI ?? creditDecision?.sanctionedRoi)
    : null;
  const approvedTenure = isApproved
    ? toNumber(creditDecision?.sanctionedTenureMonths ?? creditDecision?.SanctionedTenureMonths)
    : null;

  const isCompleteApproved =
    isApproved &&
    approvedLoanAmount != null &&
    approvedLoanAmount > 0 &&
    approvedTenure != null &&
    approvedTenure > 0 &&
    approvedROI != null &&
    approvedROI >= 0;

  const calculatedEmi = isCompleteApproved
    ? calcEmi(approvedLoanAmount, approvedROI, approvedTenure)
    : null;
  const approvedEmi = calculatedEmi != null ? Math.round(calculatedEmi) : 0;

  const rawConditions = creditDecision?.conditions ?? creditDecision?.Conditions ?? '';
  const decisionConditions = typeof rawConditions === 'string'
    ? rawConditions.split('\n').map((s) => s.trim()).filter(Boolean)
    : toList(rawConditions).map(clean).filter(Boolean);

  const rawDecidedAt =
    creditDecision?.decidedAt ??
    creditDecision?.DecidedAt ??
    creditDecision?.decisionDate ??
    creditDecision?.DecisionDate ??
    creditDecision?.createdDate ??
    creditDecision?.CreatedDate ??
    creditDecision?.createdAt ??
    creditDecision?.CreatedAt ??
    null;
  const sanctionDate = rawDecidedAt ? formatLetterDate(rawDecidedAt) : null;

  const hasOfficialIdentifiers = Boolean(
    loanIdentifier?.loanAccountNumber && loanIdentifier?.sanctionLetterId
  );
  const canExport = Boolean(isCompleteApproved && hasOfficialIdentifiers);

  const approvedTerms = useMemo(() => ({
    isApproved,
    isCompleteApproved,
    approvedLoanAmount,
    approvedROI,
    approvedTenure,
    emi: approvedEmi,
    sanctionDate,
  }), [isApproved, isCompleteApproved, approvedLoanAmount, approvedROI, approvedTenure, approvedEmi, sanctionDate]);

  const pdSheet = hasPdContent(savedPdSheet) ? savedPdSheet : unsavedPdSheet;
  const pdPoints = useMemo(() => buildPdPoints(pdSheet, pdDoneBy), [pdSheet, pdDoneBy]);
  const specificConditions = useMemo(() => {
    const fromPd = toList(pdSheet?.otherSanctionConditions).map(clean).filter(Boolean);
    const combined = [...decisionConditions, ...fromPd];
    return Array.from(new Set(combined));
  }, [pdSheet, decisionConditions]);

  const data = useMemo(
    () => buildLetterData(verificationData, coApplicants, approvedTerms, loanIdentifier),
    [verificationData, coApplicants, approvedTerms, loanIdentifier]
  );

  const v = (value) => value || EMPTY;
  const setPageRef = (index) => (el) => {
    pageRefs.current[index] = el;
  };

  const capturePages = async () => {
    // html2canvas measures the text baseline with a hidden <img> on the live document; Tailwind's
    // `img { display: block }` skews that measurement and shifts all text down in the output.
    const metricsFix = document.createElement('style');
    metricsFix.textContent =
      'body > div[style*="visibility: hidden"][style*="white-space: nowrap"] > img { display: inline !important; }';
    document.head.appendChild(metricsFix);
    try {
      const canvases = [];
      for (const page of pageRefs.current.filter(Boolean)) {
        canvases.push(
          await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
        );
      }
      return canvases;
    } finally {
      metricsFix.remove();
    }
  };

  const handlePrint = async () => {
    if (isGenerating || isPrinting || !canExport) return;
    setIsGenerating(true);
    setIsPrinting(true);
    setDownloadError('');
    try {
      const canvases = await capturePages();
      const images = canvases.map((canvas) => canvas.toDataURL('image/jpeg', 0.95));

      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
      document.body.appendChild(frame);

      const doc = frame.contentDocument;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Sanction Letter ${data.refNo || ''}</title><style>
        @page { size: A4 portrait; margin: 0; }
        html, body { margin: 0; padding: 0; }
        .page { width: 210mm; height: 297mm; display: flex; justify-content: center; align-items: flex-start;
          page-break-after: always; break-after: page; overflow: hidden; }
        .page:last-child { page-break-after: auto; break-after: auto; }
        img { max-width: 210mm; max-height: 297mm; }
      </style></head><body>${images.map((src) => `<div class="page"><img src="${src}" /></div>`).join('')}</body></html>`);
      doc.close();

      await Promise.all(
        Array.from(doc.images).map((img) =>
          img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })
        )
      );
      const cleanup = () => setTimeout(() => frame.remove(), 500);
      frame.contentWindow.addEventListener('afterprint', cleanup, { once: true });
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.isConnected && frame.remove(), 60000);
    } catch (err) {
      console.error('[SanctionLetter] Print failed:', err);
      setDownloadError('Failed to prepare the Sanction Letter for printing. Please try again.');
    } finally {
      setIsPrinting(false);
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (isGenerating || !canExport) return;
    setIsGenerating(true);
    setDownloadError('');
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = 210;
      const pageHeight = 297;
      const canvases = await capturePages();
      for (let i = 0; i < canvases.length; i += 1) {
        const canvas = canvases[i];
        let imgWidth = pageWidth;
        let imgHeight = (canvas.height * pageWidth) / canvas.width;
        if (imgHeight > pageHeight) {
          imgWidth = (pageWidth * pageHeight) / imgHeight;
          imgHeight = pageHeight;
        }
        if (i > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          (pageWidth - imgWidth) / 2,
          0,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );
      }
      const filenameLoanPart = data.loanAccountNumber !== EMPTY ? data.loanAccountNumber : (data.sanctionLetterRef !== EMPTY ? data.sanctionLetterRef : 'Official');
      pdf.save(`Sanction_Letter_${filenameLoanPart}.pdf`);
    } catch (err) {
      console.error('[SanctionLetter] PDF generation failed:', err);
      setDownloadError('Failed to generate the Sanction Letter PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const disbursementText = `The loan will be disbursed in a single tranche of ${formatRupees(data.loanAmount)} in favour of ${
    data.borrowerDisplayName || 'the Borrower'
  }${data.hasCollateral ? `, against upfront creation of charge in favour of ${COMPANY}` : ''}.`;

  const signatories = [
    { name: data.borrowerDisplayName, role: 'Borrower' },
    ...data.coApplicants.map((co) => ({ name: co.name, role: co.type || 'Co-Applicant' })),
  ];

  return (
    <div className="sl-wrapper">
      <div className="sl-controls">
        {downloadError && <span className="sl-error">{downloadError}</span>}
        <button
          type="button"
          className="sl-download-btn sl-print-btn"
          onClick={handlePrint}
          disabled={isGenerating || isPrinting || !canExport}
          title={!canExport ? 'Official identifiers and complete approved terms required for printing' : 'Print Sanction Letter'}
        >
          <Printer size={14} />
          <span>{isPrinting ? 'Preparing...' : 'Print'}</span>
        </button>
        <button
          type="button"
          className="sl-download-btn"
          onClick={handleDownload}
          disabled={isGenerating || isPrinting || !canExport}
          title={!canExport ? 'Official identifiers and complete approved terms required for PDF download' : 'Download Sanction Letter PDF'}
        >
          <Download size={14} />
          <span>{isGenerating && !isPrinting ? 'Generating PDF...' : 'Download PDF'}</span>
        </button>
      </div>

      {!isCompleteApproved && !decisionLoading && (
        <div style={{ maxWidth: 820, margin: '0 auto 16px', padding: '10px 14px', background: '#fef3c7', color: '#92400e', borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
          {!creditDecision
            ? 'Approval Pending: This Sanction Letter is a post-approval document and can only be generated after the Credit Manager approves the application.'
            : !isApproved
            ? `Not Approved: This application has a Credit Manager decision of "${decisionStatus}". A Sanction Letter can only be generated for approved applications.`
            : 'Incomplete Sanction Data: The Credit Manager approval decision is missing required financial terms (sanctioned amount, interest rate, or tenure).'}
        </div>
      )}

      {isCompleteApproved && !hasOfficialIdentifiers && (
        <div style={{ maxWidth: 820, margin: '0 auto 16px', padding: '10px 14px', background: '#fef3c7', color: '#92400e', borderRadius: 6, fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            Official Loan Identifiers Missing: Official Loan Account Number and Sanction Letter ID have not been generated. Official PDF export and printing are disabled until identifiers are generated.
          </span>
          {onGenerateIdentifier && (
            <button
              type="button"
              onClick={onGenerateIdentifier}
              disabled={isGeneratingIdentifier}
              style={{
                marginLeft: 12,
                padding: '4px 10px',
                background: '#0F7A4C',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: isGeneratingIdentifier ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              {isGeneratingIdentifier ? 'Generating...' : 'Generate Now'}
            </button>
          )}
        </div>
      )}

      <div className="sl-document">
        {/* ── PAGE 1: Addressee & Facility Details ── */}
        <LetterPage
          pageNo={1}
          pageRef={setPageRef(0)}
          footerExtra={
            <div className="sl-company-footer">
              <div>
                <strong>{COMPANY}</strong>
                <span>Registered Office: {COMPANY_ADDRESS}</span>
                <span>CIN: {COMPANY_CIN}</span>
                <span>GSTIN: {COMPANY_GSTIN}</span>
              </div>
            </div>
          }
        >
          <table className="sl-meta-table">
            <tbody>
              <tr><th scope="row">Ref. No</th><td>{v(data.sanctionLetterRef)}</td></tr>
              <tr><th scope="row">Loan Account No</th><td>{v(data.loanAccountNumber)}</td></tr>
              <tr><th scope="row">Branch Office</th><td>{v(data.branch)}</td></tr>
              <tr><th scope="row">Date</th><td>{v(data.letterDate)}</td></tr>
            </tbody>
          </table>

          <div className="sl-section-title">SANCTION LETTER</div>

          <p className="sl-to">
            To,<br />
            <strong>{v(data.borrowerDisplayName)}</strong>
          </p>

          <div className="sl-text-block">
            <p>Dear Sir/Madam,</p>
            <p className="sl-justify">
              We thank you for your loan application{data.applicationDate ? ` dated ${data.applicationDate}` : ''}. We are
              pleased to inform you that, based on your loan application, we have agreed to sanction the following loan
              facilities to you, subject to the terms and conditions of this Sanction Letter:
            </p>
          </div>

          <div className="sl-section-title">FACILITY DETAILS</div>

          <table className="sl-table">
            <colgroup>
              <col className="sl-col-label" />
              <col className="sl-col-sublabel" />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <th className="sl-term-label" scope="row" rowSpan={4}>Name and Address of the Borrower</th>
                <td className="sl-sub-label">Name</td>
                <td>{v(data.borrowerDisplayName)}</td>
              </tr>
              <tr>
                <td className="sl-sub-label">PAN No</td>
                <td>{v(data.pan)}</td>
              </tr>
              <tr>
                <td className="sl-sub-label">Registered Address</td>
                <td>{v(data.registeredAddress)}</td>
              </tr>
              <tr>
                <td className="sl-sub-label">Correspondence Address</td>
                <td>{v(data.correspondenceAddress)}</td>
              </tr>
              <tr>
                <th className="sl-term-label" scope="row">Constitution of the Borrower</th>
                <td colSpan={2}>{data.constitution}</td>
              </tr>
            </tbody>
          </table>

          <table className="sl-table">
            <colgroup>
              <col className="sl-col-srno" />
              <col className="sl-col-coname" />
              <col className="sl-col-cotype" />
              <col className="sl-col-copan" />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={5} className="sl-table-caption">Name &amp; Address of the Co-Applicants / Guarantors</th>
              </tr>
              <tr>
                <th>Sr. No.</th>
                <th>Name of Co-Applicant / Guarantor / Obligor</th>
                <th>Co-Applicant / Guarantor</th>
                <th>PAN No</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {data.coApplicants.length > 0 ? (
                data.coApplicants.map((co, idx) => (
                  <tr key={`${co.name}-${idx}`}>
                    <td>{idx + 1}</td>
                    <td>{v(co.name)}</td>
                    <td>{co.type}</td>
                    <td>{v(co.pan)}</td>
                    <td>{v(co.address)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="sl-muted sl-center">Nil</td>
                </tr>
              )}
            </tbody>
          </table>

          <table className="sl-table">
            <colgroup>
              <col className="sl-col-label" />
              <col />
            </colgroup>
            <tbody>
              <TermRow label="Loan Account Number">{v(data.loanAccountNumber)}</TermRow>
              <TermRow label="Product">{v(data.product)}</TermRow>
              <TermRow label="Nature & Amount of Loan">
                Term Loan of {formatRupees(data.loanAmount)}
                {data.loanAmountWords && (
                  <>
                    <br />
                    In Words: {data.loanAmountWords}.
                  </>
                )}
              </TermRow>
            </tbody>
          </table>
        </LetterPage>

        {/* ── PAGE 2: Security & Commercial Terms ── */}
        <LetterPage pageNo={2} pageRef={setPageRef(1)} signatories={signatories}>
          <table className="sl-table">
            <colgroup>
              <col className="sl-col-label" />
              <col />
            </colgroup>
            <tbody>
              <TermRow label="Details of Security / Security Provider">
                <p className="sl-cell-lead">In accordance with the Loan Documents:</p>
                <BulletList
                  items={[
                    'The Obligor(s) shall provide security having a clear, marketable and unencumbered title.',
                    'First and exclusive charge on the security(ies)/property(ies) mentioned below:',
                  ]}
                />
                <table className="sl-table sl-inner-table">
                  <colgroup>
                    <col className="sl-col-srno-inner" />
                    <col />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Sr. No.</th>
                      <th>Details of the Security(ies)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hasCollateral ? (
                      data.collateralRows.map((row, idx) => (
                        <tr key={`collateral-${idx}`}>
                          <td>{idx + 1}</td>
                          <td>
                            <p className="sl-cell-lead">
                              Owned by: {row.owner || v(data.borrowerDisplayName)}
                              {row.type && <strong> ({row.type})</strong>}
                            </p>
                            <p>Property Address: {v(row.address)}</p>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td>1</td>
                        <td className="sl-muted">Nil — no security offered for this facility.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TermRow>
              <TermRow label="Purpose of the Loan / Facility">{v(data.purpose)}</TermRow>
              <TermRow label="Tenor of the Loan / Facility">{v(data.tenure)}</TermRow>
              <TermRow label="Repayment Term">
                {data.emi > 0 ? `Monthly EMI of ${formatRupees(data.emi)}` : EMPTY}
              </TermRow>
              <TermRow label="Rate of Interest (ROI)">
                {v(data.roi)}
                <br />
                <span className="sl-note">*Floating rate of interest with monthly rest (the rate is subject to change).</span>
              </TermRow>
              <TermRow label="Processing Fees">
                {data.processingFee > 0
                  ? `${data.processingFeePercent ? `(${data.processingFeePercent} of the sanctioned amount) ` : ''}plus applicable taxes, to be paid to ${COMPANY} (non-refundable).`
                  : EMPTY}
              </TermRow>
              <TermRow label="Prepayment and Foreclosure Charges">
                <BulletList
                  items={[
                    'No foreclosure is allowed up to 24 months from the date of disbursement.',
                    'Between 24 and 48 months, prepayment charges will be 4% + GST of the outstanding loan amount, plus applicable taxes. Thereafter, 2% + GST will be charged as prepayment charges on the outstanding loan amount.',
                  ]}
                />
              </TermRow>
              <TermRow label="Default Charges / Interest on Overdue">
                2% per month on the overdue amount (unless a higher rate is agreed in the loan agreement).
              </TermRow>
              <TermRow label="Other Charges">
                Please refer to the latest Schedule of Charges of {COMPANY}. The Schedule of Charges may be revised by{' '}
                {COMPANY} from time to time.
              </TermRow>
              <TermRow label="Insurance">
                {data.insuranceFee > 0
                  ? `The Borrower expressly elects and authorizes ${COMPANY} to collect/debit charges of ${formatRupees(data.insuranceFee)} towards insurance and health card subscription.`
                  : EMPTY}
              </TermRow>
              <TermRow label="Sanction Validity">
                This Sanction Letter is valid for 60 days from the date of issue, unless extended by {COMPANY}.
              </TermRow>
              <TermRow label="Proposed Disbursement Schedule">{disbursementText}</TermRow>
            </tbody>
          </table>
        </LetterPage>

        {/* ── PAGE 3: Conditions ── */}
        <LetterPage pageNo={3} pageRef={setPageRef(2)} signatories={signatories}>
          <table className="sl-table">
            <colgroup>
              <col className="sl-col-label" />
              <col />
            </colgroup>
            <tbody>
              <TermRow label="Balance Transfer / Takeover Conditions (if any)">
                <NumberedList
                  items={[
                    'The Borrower/Security Provider shall provide the balance transfer documents (balance confirmation/foreclosure letter and List of Documents (LOD)) before disbursement.',
                    'The Borrower/Security Provider shall deposit all title documents, the No Due Certificate and the charge release letter/release deed of the BT bank before release of the top-up amount.',
                    'The top-up amount, if any, will be released after creation of mortgage over the collateral property.',
                    'BT documents, including the POA and Indemnity, are to be executed before disbursement. The top-up amount, if any, will be released after creation of mortgage over the collateral property.',
                  ]}
                />
              </TermRow>
              <TermRow label="General Conditions / Compliance">
                <NumberedList
                  items={[
                    'Six post-dated cheques (PDCs) are to be collected from the main applicant, including one cheque equivalent to the entire loan amount.',
                    'Three PDCs each are to be collected from all co-applicants; the total of all PDCs should be equivalent to the entire loan amount.',
                    'All verifications, including profile check, FI, FCU, Hunter and Cubictree, must be positive.',
                    'Legal and technical clearance of the collateral property (applicable for loans secured by immovable property).',
                    'The end-use certificate is to be submitted on letterhead before disbursement.',
                    'All property owners must join the loan as co-applicants.',
                    'Signature verification of the loan applicants and co-applicants.',
                    'A cross-linking undertaking for the collateral is to be signed, if applicable.',
                  ]}
                />
              </TermRow>
              <TermRow label="Other Specific Conditions / Compliance">
                {pdSheetLoading && !hasPdContent(pdSheet) ? (
                  <span className="sl-muted">Loading PD sheet details...</span>
                ) : pdPoints.length > 0 || specificConditions.length > 0 ? (
                  <NumberedList
                    items={[
                      ...pdPoints,
                      ...(specificConditions.length > 0
                        ? [
                            <React.Fragment key="case-specific">
                              <strong>Case Specific Sanction Condition:</strong>
                              <BulletList items={specificConditions} />
                            </React.Fragment>,
                          ]
                        : []),
                    ]}
                  />
                ) : (
                  <span className="sl-muted">Nil</span>
                )}
              </TermRow>
            </tbody>
          </table>
        </LetterPage>

        {/* ── PAGE 4: Sanction Conditions 1–13 ── */}
        <LetterPage pageNo={4} pageRef={setPageRef(3)} signatories={signatories}>
          <div className="sl-section-title">SANCTION CONDITIONS</div>
          <NumberedList
            items={[
              'This Sanction Letter forms an integral part of the Loan Agreement. The facility/facilities mentioned herein is/are subject to the terms and conditions contained in the Loan Agreement and other loan documents.',
              'The Borrower(s) agree(s) to execute the Loan Agreement and other transaction documents for the purpose of availing the loan in terms thereof, and to pay/repay the loan in a timely manner. This sanction is subject to realization of the cheque/demand draft/pay order towards the processing fees and loan sanction charges, which are non-refundable.',
              'For a secured facility, unless otherwise agreed, the loan shall be secured by a first and exclusive charge on the immovable and movable property and/or such other security, to the satisfaction of the Lender. For the purpose of disbursement, such documents, reports and evidence as may be required by the Lender shall be produced to establish that the property to be mortgaged has a clear, marketable and unencumbered title. The Borrower/Co-Borrower(s) shall produce such originals/copies of title deeds, documents and reports as may be required by the Lender. In case of additional limits, the existing mortgage shall stand extended to cover the proposed additional limit and/or as per the sanction conditions. The Borrower has agreed to obtain insurance from an insurer of the Borrower’s choice, as approved by the Lender and on terms agreeable to the Lender, which shall be endorsed/assigned in the Lender’s favour. Such endorsement/assignment shall be maintained throughout the term of the loan until full repayment.',
              `The Borrower shall provide repayment cheques, drawn on a scheduled commercial bank approved by ${COMPANY}, to honour the payment obligations.`,
              `The Borrower(s) agree(s) and acknowledge(s) that use of the loan amount for any purpose other than the purpose specified herein shall constitute a material breach, misappropriation and a serious offence. In such a case, ${COMPANY} shall be entitled to all available remedies and to take action (including criminal complaints and civil proceedings), including recall of the loan.`,
              `The Borrower(s) shall obtain prior written approval from ${COMPANY} before making any changes to their management structure or to any existing operative bank accounts.`,
              `Loans from trustees/directors/promoters/relatives/third parties, if any, outstanding as on the date of the first disbursement under the facility, shall not be repaid without the prior written approval of ${COMPANY}.`,
              `The Borrower shall ensure deduction of TDS (if applicable) and deposit the same with the relevant government authorities. ${COMPANY} shall give credit for TDS in its books only after receipt of the original TDS certificates from the Borrower. Any additional interest charged on account of delay in submission of TDS certificates/payment of TDS shall be borne and paid by the Borrower.`,
              'The Borrower/Security Provider shall hand over the original property papers to the Lender before disbursement/release of the top-up amount.',
              'The Lender is entitled to transfer/assign the loan and/or the loan/facility documents at the Lender’s discretion, in such form, manner and parts as the Lender may decide. Any transfer of the loan (along with the underlying security) by the Lender shall be binding and shall be construed to be at the Borrower’s behest.',
              <>
                The Borrower(s) expressly undertake(s) that:
                <BulletList
                  items={[
                    'Payment of instalments shall be made under the NACH/ECS mandate for proper administration of the loan account.',
                    'The Lender will be entitled to present NACH on the due date, despite any prior or additional payments. Any additional payment into the loan account will be adjusted against the amounts payable in terms of the Loan Agreement.',
                    'The Lender will not be obliged to suspend NACH presentation for any reason whatsoever.',
                  ]}
                />
              </>,
              'The loan sanction is subject to the Borrower(s) and other obligor(s) complying at all times with the laws and regulations governing their business and operations, including but not limited to matters of (a) social cause and public policy, (b) protection of the environment, (c) labour and employment, (d) occupational health and safety, (e) the specific purpose for which the loan is availed, and (f) local laws and compliances.',
              `By signing this Sanction Letter, the Borrower(s)/Co-Borrower(s)/Guarantor(s) hereby acknowledge that they have read and understood the “Terms and Conditions for Loan Sanctioned” (“TOS”) as provided by ${COMPANY}, and expressly accept and agree to be bound by the terms and conditions contained therein, which are to be read in conjunction with this Sanction Letter.`,
            ]}
          />
        </LetterPage>

        {/* ── PAGE 5: Sanction Condition 14 & Additional Terms 1–11 ── */}
        <LetterPage pageNo={5} pageRef={setPageRef(4)} signatories={signatories}>
          <NumberedList
            start={14}
            items={[
              'The Lender, at its sole discretion, is entitled to approach courts or tribunals of competent jurisdiction in case of the Borrower’s/Guarantor’s failure to pay/repay its debts. The debts payable to the Lender under this letter or a promissory note are undisputed and are hereby expressly admitted by the Borrower/Guarantor. This clause is solely for the benefit of the Lender, and the Lender shall therefore be entitled to institute legal proceedings (including summary procedure or other suits) for the expressly admitted debts payable to the Lender. These rights may be exercised by the Lender without prejudice to any other rights that the Lender may have in respect of the said debts under the applicable laws and the agreement.',
            ]}
          />

          <div className="sl-section-title">ADDITIONAL TERMS AND CONDITIONS</div>
          <NumberedList
            items={[
              `${COMPANY} is entitled to cancel/revoke the unutilized sanctioned limit at its sole discretion. Where such a decision to cancel/revoke the sanctioned limit is taken for reasons attributable to the Borrower or its credit assessment, including but not limited to non-compliance with sanction conditions, documentation or security creation requirements of ${COMPANY}, the Borrower (without prejudice to the other rights of ${COMPANY}) will not be entitled to any full or proportionate refund of the processing fees and charges.`,
              'The interest rate, comprising the risk premium/spread, has been determined on the basis of, inter alia, the nature of the loan, the Borrower’s creditworthiness, the nature of the security, the nature of the product, the Borrower’s risk profile, repayment capacity, past repayments, loan tenure and geography (location).',
              'The fees and charges applicable to the loan facility are levied on the basis of, inter alia, the cost and expenses of products/services, encouraging financial discipline, competition/industry benchmarking, and market practices for the loan type and quantum, in compliance with regulatory guidelines.',
              `The Borrower acknowledges that the interest rate of ${COMPANY} depends on many factors, including the cost of its borrowed funds. The ROI is subject to change from time to time at the sole discretion of ${COMPANY} (including any change as may be directed by the Reserve Bank of India and/or any other regulatory/statutory body). Upon any change in the Base Lending Rate (BLR)/Benchmark Rate, the Borrower will pay loans linked to the BLR in accordance with the revised rate announced by ${COMPANY}. Any change in the rate of interest shall be notified by ${COMPANY} to the Borrowers through its website, account statements, branches or any other medium that ${COMPANY} may consider appropriate.`,
              `${COMPANY} is hereby entitled to make proportionate changes in the repayment schedule consequent to a revision of the interest rate. If any extension of the loan tenure is likely to exceed the maximum tenure assessed by ${COMPANY} for the loan, ${COMPANY} may also make the required changes to the number and amount of instalments as it may deem fit and appropriate.`,
              'The Lender shall be entitled to revise the due date cycle and other components of the amortization schedule in accordance with its policy or process for administration of loan accounts.',
              `Unless otherwise notified by ${COMPANY} in writing, this Sanction Letter shall stand revoked and cancelled if: (a) any material change occurs in the proposal for which this loan is in-principle sanctioned; (b) any material fact concerning income, ability to repay or any other relevant aspect of the proposal or loan application is withheld, suppressed, concealed or not made known to ${COMPANY}; (c) any statement made in the loan application is found to be incorrect or untrue; (d) unconditional and absolute acceptance of this Sanction Letter is not received by ${COMPANY} within thirty (30) days from the date of its issue; or (e) ${COMPANY}, at its sole discretion, revokes/cancels/recalls this Sanction Letter.`,
              'Pre-Equated Monthly Instalment Interest (PEMII), at the rate at which the EMI has been calculated, shall be charged from the respective date(s) of disbursement to the date of commencement of the EMI in respect of the loan. The EMI comprises principal and interest calculated on a monthly-rest basis at the applicable rate, and is rounded off to the next higher rupee.',
              `${COMPANY} shall be informed in writing, immediately, of any change in correspondence address, change in employment, loss of job, business or profession, as the case may be, including the causes of any delay, any loss of or damage to the property, and any additions/alterations to the property.`,
              'Stamp duty, registration charges and charges for security perfection, including all applicable taxes from time to time, shall be borne and paid by the Borrower/Co-Borrower(s)/Guarantor(s) without claiming any set-off, counter-claim, damages, etc.',
              `The Borrower will pay other applicable charges as per the Schedule of Charges of ${COMPANY}, as updated from time to time.`,
            ]}
          />
        </LetterPage>

        {/* ── PAGE 6: Additional Terms 12–17 ── */}
        <LetterPage pageNo={6} pageRef={setPageRef(5)} signatories={signatories}>
          <NumberedList
            start={12}
            items={[
              'The Borrower shall register under the Central Goods and Services Tax Act, 2017 (CGST Act), the State Goods and Services Tax Act, 2017 (SGST Act), the Integrated Goods and Services Tax Act, 2017 (IGST Act) and the Union Territory Goods and Services Tax Act, 2017 (UTGST Act) (hereinafter individually/collectively referred to as the “GST Law”), as applicable, and disclose the registration number to the Lender. Failing this, the Borrower will be treated as not registered under the GST Law, and the provisions applicable to an unregistered Borrower will apply.',
              'In case of violation of any provision of taxation law, including GST laws, by the Borrower, the Borrower undertakes to indemnify the Lender for any loss, claim, demand or penalty, if any, which may be incurred or suffered by the Lender.',
              'Notwithstanding the issue of this Sanction Letter and its acceptance, the Lender may, at its sole discretion, decide not to disburse the loan and revoke this Sanction Letter without giving the Borrower any prior notice and without assigning any reason.',
              'The post-dated cheques (PDCs), if any, issued towards repayment of the loan are to be replenished as and when they are exhausted towards payment of the balance monthly/periodic instalments, until the entire loan is paid off.',
              'Any security interest in favour of the Lender with respect to any security shall remain in full force and shall continue and be extended to all existing and future debts (irrespective of whether those debts are incurred under this loan or under any other agreements/instruments, secured or unsecured), for the Lender to exercise set-off. Accordingly, any security charged in favour of the Lender shall not be released until all such debts are fully repaid to the Lender’s satisfaction.',
              `The Borrower acknowledges that, by providing the loan facility, ${COMPANY} has not given, and does not intend to give, any professional advice or make any statement regarding taxation and related benefits. The Borrower(s) will independently consult/have consulted their tax advisors/other professionals for their financial planning and tax assessment(s).`,
            ]}
          />
        </LetterPage>

        {/* ── PAGE 7: Acceptance & Signatures ── */}
        <LetterPage pageNo={7} pageRef={setPageRef(6)}>
          <p className="sl-justify">
            In confirmation of your agreement to be bound by the terms and conditions stipulated above, please return the
            duplicate copy of this Sanction Letter, duly signed by the authorized signatories of the Borrower(s) and
            Guarantor(s) (if any), as a token of acceptance to the branch office of {COMPANY} within 30 days from the date
            of this letter, together with a cheque/demand draft marked &quot;Payee&apos;s A/c only&quot;, drawn in favour
            of &quot;{COMPANY}&quot; and payable at any bank in India, towards the balance processing fees.
          </p>
          <p>We assure you of our best services at all times.</p>
          <p>Warm regards,</p>

          <div className="sl-signatory">
            <strong>For {COMPANY},</strong>
            <div className="sl-sign-line" />
            <span className="sl-sign-caption">AUTHORISED SIGNATORY</span>
          </div>

          <p className="sl-justify">
            In particular, I/we, the undersigned Borrower(s)/Co-Borrower(s)/Guarantor(s), in person or through our
            authorised signatories, hereby agree, accept and confirm, by affixing my/our signature(s), that I/we have
            read, understood and accepted the terms and conditions appearing on all the pages of this Sanction Letter,
            including the terms and conditions mentioned in the Loan Agreement and the “Terms and Conditions for Loan
            Sanctioned” (“TOS”) stated above, and I/we agree to be bound by the same.
          </p>
          <p>I/We hereby acknowledge receipt of your Sanction Letter along with all the Schedules and Annexures (if any).</p>

          <div className="sl-acceptance-grid">
            <div className="sl-acceptance-block">
              <span className="sl-acceptance-title">For Borrower:</span>
              <strong>{v(data.borrowerDisplayName)}</strong>
              <div className="sl-sign-line" />
              <span className="sl-sign-caption">(Signature)</span>
            </div>
            <div className="sl-acceptance-block">
              <span className="sl-acceptance-title">Guarantor / Co-Borrower / Co-Applicant</span>
              {data.coApplicants.length > 0 ? (
                data.coApplicants.map((co, idx) => (
                  <div key={`sign-${idx}`} className="sl-co-sign">
                    <div className="sl-sign-line" />
                    <strong>{v(co.name)}</strong>
                  </div>
                ))
              ) : (
                <>
                  <div className="sl-sign-line" />
                  <span className="sl-sign-caption">(Signature)</span>
                </>
              )}
            </div>
          </div>
        </LetterPage>
      </div>
    </div>
  );
}
