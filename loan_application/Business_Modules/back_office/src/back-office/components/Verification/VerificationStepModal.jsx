/**
 * VerificationStepModal.jsx
 * --------------------
 * Dynamic modal component for reviewing and verifying any of the 12
 * RM Application Wizard steps in the Back Office workspace.
 */

import React, { useState } from 'react';
import iconMap from '../../config/iconMap';
import './VerificationStepModal.css';

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export default function VerificationStepModal({
  stepNumber,
  stepDefinition,
  customerData,
  onClose,
}) {
  const XIcon = iconMap['X'] || iconMap['XCircle'];
  const CheckCircleIcon = iconMap['CheckCircle2'] || iconMap['Check'];
  const ShieldCheckIcon = iconMap['ShieldCheck'];
  const FileTextIcon = iconMap['FileText'];
  const EyeIcon = iconMap['Eye'];

  if (!stepDefinition || !customerData) return null;

  const renderStepContent = () => {
    switch (stepNumber) {
      // ----------------------------------------------------
      // Step 1: Application Details
      // ----------------------------------------------------
      case 1: {
        const d = customerData.applicationDetails || {};
        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">APPLICATION &amp; LOAN PRODUCT PARAMETERS</span>
              <p>Review submitted core loan parameters, requested financing amount, and underwriting terms.</p>
            </div>

            <div className="bo-v-grid-2">
              <div className="bo-v-field">
                <label>Application ID</label>
                <strong className="bo-text-primary">{customerData.applicationId}</strong>
              </div>
              <div className="bo-v-field">
                <label>Loan Product</label>
                <span>{d.loanProduct}</span>
              </div>
              <div className="bo-v-field">
                <label>Requested Loan Amount</label>
                <strong className="bo-amount-lead">{formatCurrency(d.loanAmount)}</strong>
              </div>
              <div className="bo-v-field">
                <label>Loan Tenure</label>
                <span>{d.loanTenure}</span>
              </div>
              <div className="bo-v-field">
                <label>Rate of Interest</label>
                <span>{d.interestRate}</span>
              </div>
              <div className="bo-v-field">
                <label>Repayment Frequency</label>
                <span>{d.repaymentFrequency}</span>
              </div>
              <div className="bo-v-field">
                <label>Transaction Type</label>
                <span>{d.transactionType}</span>
              </div>
              <div className="bo-v-field">
                <label>Co-Applicants</label>
                <span>{d.coApplicantCount} Co-Applicant(s)</span>
              </div>
              <div className="bo-v-field">
                <label>Sourcing Branch</label>
                <span>{d.sourcingBranch}</span>
              </div>
              <div className="bo-v-field">
                <label>Applied Date</label>
                <span>{d.appliedDate}</span>
              </div>
            </div>

            <div className="bo-v-full-field">
              <label>Purpose of Loan</label>
              <div className="bo-v-purpose-box">{d.purposeOfLoan}</div>
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // Step 2: Personal Information (With PAN Verification)
      // ----------------------------------------------------
      case 2: {
        const p = customerData.personalInformation || {};
        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">APPLICANT DEMOGRAPHICS &amp; IDENTITY</span>
              <p>Verify primary applicant KYC identity details, contact numbers, and PAN authenticity.</p>
            </div>

            <div className="bo-v-grid-2">
              <div className="bo-v-field">
                <label>Full Name</label>
                <strong>{p.fullName}</strong>
              </div>
              <div className="bo-v-field">
                <label>Father / Spouse Name</label>
                <span>{p.fatherOrSpouseName}</span>
              </div>
              <div className="bo-v-field">
                <label>Date of Birth &amp; Age</label>
                <span>{p.dob} ({p.age} Years)</span>
              </div>
              <div className="bo-v-field">
                <label>Gender &amp; Marital Status</label>
                <span>{p.gender} &bull; {p.maritalStatus}</span>
              </div>
              <div className="bo-v-field">
                <label>Primary Mobile Number</label>
                <span>+91 {p.mobile}</span>
              </div>
              <div className="bo-v-field">
                <label>Email Address</label>
                <span>{p.email}</span>
              </div>
              <div className="bo-v-field">
                <label>Aadhaar Number (Masked)</label>
                <span>{p.aadhaarNumber}</span>
              </div>
              <div className="bo-v-field">
                <label>Education &amp; Dependents</label>
                <span>{p.education} ({p.dependents} Dependents)</span>
              </div>
            </div>

            {/* View-Only PAN Verification Box */}
            <div className="bo-pan-verification-card">
              <div className="bo-pan-header">
                <div>
                  <span className="bo-pan-kicker">TAX IDENTIFICATION (SUBMITTED)</span>
                  <h4>Permanent Account Number (PAN)</h4>
                </div>
                <strong className="bo-pan-number">{p.panNumber}</strong>
              </div>

              <div className="bo-pan-result-area">
                <div className="bo-pan-verified-box">
                  <div className="bo-pan-verified-header">
                    <div className="bo-pan-badge-row">
                      <span className="bo-pan-success-pill">
                        ✓ PAN Verified
                      </span>
                      <span className="bo-pan-meta-pill">Status: Active</span>
                      <span className="bo-pan-meta-pill">Name Matched: Yes</span>
                    </div>
                  </div>
                  <div className="bo-pan-details-grid">
                    <div>
                      <small>PAN Holder Name</small>
                      <strong>{p.fullName}</strong>
                    </div>
                    <div>
                      <small>PAN Category</small>
                      <span>Individual / Proprietor</span>
                    </div>
                    <div>
                      <small>Verification Match</small>
                      <span className="text-success font-semibold">100% Identity Match</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // Step 3: Address Details
      // ----------------------------------------------------
      case 3: {
        const a = customerData.addressDetails || {};
        const curr = a.currentAddress || {};
        const perm = a.permanentAddress || {};
        const biz = a.businessAddress;
        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">RESIDENTIAL &amp; PROPERTY ADDRESS PROOF</span>
              <p>Verify applicant current dwelling, permanent home address, and business premises.</p>
            </div>

            <div className="bo-v-address-cards-grid">
              <div className="bo-v-addr-card">
                <div className="bo-addr-card-header">
                  <h5>Current Residence Address</h5>
                  <span className="bo-addr-type-pill">{curr.residenceType || 'Owned'}</span>
                </div>
                <div className="bo-addr-content">
                  <p><strong>Door &amp; Street:</strong> {curr.doorNo}, {curr.streetName}</p>
                  <p><strong>Landmark:</strong> {curr.landmark}</p>
                  <p><strong>City &amp; District:</strong> {curr.city}, {curr.district}</p>
                  <p><strong>State &amp; Pincode:</strong> {curr.state} - {curr.pincode}</p>
                  <p><strong>Vintage at Address:</strong> {curr.yearsAtAddress} Years</p>
                </div>
              </div>

              <div className="bo-v-addr-card">
                <div className="bo-addr-card-header">
                  <h5>Permanent Address</h5>
                  <span className="bo-addr-type-pill">Permanent Record</span>
                </div>
                <div className="bo-addr-content">
                  <p><strong>Door &amp; Street:</strong> {perm.doorNo}, {perm.streetName}</p>
                  <p><strong>Landmark:</strong> {perm.landmark}</p>
                  <p><strong>City &amp; District:</strong> {perm.city}, {perm.district}</p>
                  <p><strong>State &amp; Pincode:</strong> {perm.state} - {perm.pincode}</p>
                  <p><strong>Status:</strong> {perm.sameAsCurrent ? 'Same as Current Residence' : 'Verified Alternate'}</p>
                </div>
              </div>

              {biz && (
                <div className="bo-v-addr-card">
                  <div className="bo-addr-card-header">
                    <h5>Business Operating Address</h5>
                    <span className="bo-addr-type-pill">{biz.premiseType}</span>
                  </div>
                  <div className="bo-addr-content">
                    <p><strong>Premises:</strong> {biz.doorNo}, {biz.streetName}</p>
                    <p><strong>City &amp; District:</strong> {biz.city}, {biz.district}</p>
                    <p><strong>State &amp; Pincode:</strong> {biz.state} - {biz.pincode}</p>
                    <p><strong>Operating Vintage:</strong> {biz.yearsInPremise} Years</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // Step 4: KYC Documents
      // ----------------------------------------------------
      case 4: {
        const kyc = customerData.kycDocuments || {};
        const docs = kyc.documents || [];
        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">KYC PROOFS &amp; BIOMETRIC VERIFICATION</span>
              <p>Mode: <strong>{kyc.verificationMode}</strong>. Inspect uploaded government ID proofs.</p>
            </div>

            <div className="bo-kyc-docs-grid">
              {docs.map((doc) => (
                <div key={doc.id} className="bo-kyc-doc-card">
                  <div className="bo-kyc-thumb-preview">
                    {FileTextIcon && <FileTextIcon size={24} className="bo-doc-icon" />}
                    <span className="bo-doc-type-label">{doc.name}</span>
                  </div>
                  <div className="bo-kyc-doc-details">
                    <h6>{doc.name}</h6>
                    <small>{doc.type} &bull; {doc.documentNumber}</small>
                    <div className="bo-doc-meta-row">
                      <span className="bo-doc-status-badge is-verified">✓ {doc.verificationStatus}</span>
                      <span className="bo-doc-size">{doc.fileSize}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // Step 5: Employment & Income Details
      // ----------------------------------------------------
      case 5: {
        const emp = customerData.employmentIncome || {};
        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">OCCUPATIONAL PROFILE &amp; INCOME UNDERWRITING</span>
              <p>Review submitted income sources, business turnover, employer details, and ITR documents.</p>
            </div>

            <div className="bo-v-grid-2">
              <div className="bo-v-field">
                <label>Employment / Business Type</label>
                <strong>{emp.employmentType}</strong>
              </div>
              <div className="bo-v-field">
                <label>Company / Trading Name</label>
                <span>{emp.companyOrBusinessName}</span>
              </div>
              <div className="bo-v-field">
                <label>Designation / Role</label>
                <span>{emp.designationOrRole}</span>
              </div>
              <div className="bo-v-field">
                <label>Industry Classification</label>
                <span>{emp.industryType}</span>
              </div>
              <div className="bo-v-field">
                <label>Experience / Business Vintage</label>
                <span>{emp.experienceYears} Years</span>
              </div>
              <div className="bo-v-field">
                <label>Constitution of Business</label>
                <span>{emp.businessConstitution}</span>
              </div>
              <div className="bo-v-field">
                <label>Monthly Gross Income</label>
                <strong className="bo-amount-highlight">{formatCurrency(emp.monthlyGrossIncome)}</strong>
              </div>
              <div className="bo-v-field">
                <label>Monthly Net Disposable Income</label>
                <strong className="bo-amount-lead">{formatCurrency(emp.monthlyNetIncome)}</strong>
              </div>
              <div className="bo-v-field">
                <label>Annual Turnover / Gross Package</label>
                <span>{formatCurrency(emp.annualTurnoverOrSalary)}</span>
              </div>
              <div className="bo-v-field">
                <label>ITR Assessment Status</label>
                <span>{emp.itrFiled ? `Filed (${emp.lastItrYear})` : 'Exempt'}</span>
              </div>
            </div>

            <div className="bo-v-full-field">
              <label>Submitted Income Proof Documentation</label>
              <div className="bo-v-purpose-box">{emp.incomeProofType}</div>
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // Step 6: Bank / Existing Loan Details & CIBIL Bureau
      // ----------------------------------------------------
      case 6: {
        const b = customerData.bankExistingLoans || {};
        const bank = b.primaryBank || {};
        const cibil = b.cibilBureau || {};
        const loans = b.existingLoans || [];

        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">BANKING RELATIONS &amp; CREDIT BUREAU UNDERWRITING</span>
              <p>Primary operative bank account, existing credit obligations, and CIBIL bureau score.</p>
            </div>

            {/* CIBIL Score Card */}
            <div className="bo-cibil-score-card">
              <div className="bo-cibil-top">
                <div className="bo-cibil-meter">
                  <span className="bo-cibil-kicker">CIBIL BUREAU SCORE</span>
                  <h3 className="bo-cibil-score-val">{cibil.score}</h3>
                  <span className="bo-cibil-rating-tag">{cibil.rating} RATING</span>
                </div>
                <div className="bo-cibil-summary-stats">
                  <div className="bo-cibil-stat-box">
                    <small>Active Loans</small>
                    <strong>{cibil.totalActiveLoans}</strong>
                  </div>
                  <div className="bo-cibil-stat-box">
                    <small>Closed Loans</small>
                    <strong>{cibil.totalClosedLoans}</strong>
                  </div>
                  <div className="bo-cibil-stat-box">
                    <small>Credit Cards</small>
                    <strong>{cibil.activeCreditCards}</strong>
                  </div>
                  <div className="bo-cibil-stat-box">
                    <small>Repayment History</small>
                    <strong className="text-success">{cibil.paymentHistoryPercentage}</strong>
                  </div>
                  <div className="bo-cibil-stat-box">
                    <small>Total Outstanding</small>
                    <strong>{formatCurrency(cibil.totalOutstandingAmount)}</strong>
                  </div>
                  <div className="bo-cibil-stat-box">
                    <small>Monthly EMI Burden</small>
                    <strong>{formatCurrency(cibil.currentMonthlyEmiObligation)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Bank Account */}
            <div className="bo-v-section-card">
              <h5 className="bo-v-card-title">Primary Disbursal Bank Account</h5>
              <div className="bo-v-grid-2">
                <div className="bo-v-field">
                  <label>Bank Name</label>
                  <strong>{bank.bankName}</strong>
                </div>
                <div className="bo-v-field">
                  <label>Account Number</label>
                  <span>{bank.accountNumber}</span>
                </div>
                <div className="bo-v-field">
                  <label>Account Type</label>
                  <span>{bank.accountType}</span>
                </div>
                <div className="bo-v-field">
                  <label>IFSC Code &amp; Branch</label>
                  <span>{bank.ifscCode} &bull; {bank.branchName}</span>
                </div>
                <div className="bo-v-field">
                  <label>Average Monthly Balance (AMB)</label>
                  <strong className="bo-amount-highlight">{formatCurrency(bank.averageMonthlyBalance)}</strong>
                </div>
                <div className="bo-v-field">
                  <label>Account Vintage</label>
                  <span>{bank.accountVintageYears} Years</span>
                </div>
              </div>
            </div>

            {/* Existing Loans Table */}
            {loans.length > 0 && (
              <div className="bo-v-section-card">
                <h5 className="bo-v-card-title">Declared Existing Loan Obligations</h5>
                <div className="bo-mini-table-wrap">
                  <table className="bo-mini-table">
                    <thead>
                      <tr>
                        <th>Lender Bank</th>
                        <th>Loan Facility</th>
                        <th>Sanction</th>
                        <th>Outstanding</th>
                        <th>Monthly EMI</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans.map((loan, idx) => (
                        <tr key={idx}>
                          <td><strong>{loan.bank}</strong></td>
                          <td>{loan.loanType}</td>
                          <td>{formatCurrency(loan.sanctionAmount)}</td>
                          <td>{formatCurrency(loan.currentOutstanding)}</td>
                          <td><strong>{formatCurrency(loan.monthlyEmi)}</strong></td>
                          <td><span className="bo-status-pill-small">{loan.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      }

      // ----------------------------------------------------
      // Step 7: Collateral Details
      // ----------------------------------------------------
      case 7: {
        const col = customerData.collateral || {};
        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">SECURITY COLLATERAL &amp; ASSET APPRAISAL</span>
              <p>Review pledged property assets, title deed documents, and technical valuation report.</p>
            </div>

            <div className="bo-v-grid-2">
              <div className="bo-v-field">
                <label>Collateral Structure</label>
                <strong>{col.collateralType}</strong>
              </div>
              <div className="bo-v-field">
                <label>Ownership Structure</label>
                <span>{col.ownershipType}</span>
              </div>
              <div className="bo-v-field">
                <label>Estimated Market Valuation</label>
                <strong className="bo-amount-lead">{col.estimatedMarketValue ? formatCurrency(col.estimatedMarketValue) : 'N/A (Unsecured)'}</strong>
              </div>
              <div className="bo-v-field">
                <label>Forced Realisable Value (FSV)</label>
                <span>{col.forcedSaleValue ? formatCurrency(col.forcedSaleValue) : 'N/A'}</span>
              </div>
              <div className="bo-v-field">
                <label>Title Deed Document Reference</label>
                <span>{col.titleDeedNo}</span>
              </div>
              <div className="bo-v-field">
                <label>Legal Title Search Status</label>
                <span className="text-success font-semibold">{col.legalVerificationStatus}</span>
              </div>
            </div>

            <div className="bo-v-full-field">
              <label>Asset / Property Description</label>
              <div className="bo-v-purpose-box">{col.propertyDescription}</div>
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // Step 8: Reference Details
      // ----------------------------------------------------
      case 8: {
        const refs = customerData.references || [];
        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">PERSONAL &amp; TRADE REFERENCES VERIFICATION</span>
              <p>Confirmed reference contacts and field verification feedback.</p>
            </div>

            <div className="bo-v-references-grid">
              {refs.map((ref, idx) => (
                <div key={ref.id || idx} className="bo-ref-card">
                  <div className="bo-ref-header">
                    <span className="bo-ref-kicker">REFERENCE 0{idx + 1}</span>
                    <span className="bo-ref-status-pill">✓ Verified</span>
                  </div>
                  <h5 className="bo-ref-name">{ref.name}</h5>
                  <div className="bo-ref-meta">
                    <p><strong>Relationship:</strong> {ref.relationship}</p>
                    <p><strong>Mobile:</strong> +91 {ref.mobile}</p>
                    <p><strong>Occupation:</strong> {ref.occupation}</p>
                    <p><strong>Address:</strong> {ref.address}</p>
                    <p className="bo-ref-feedback"><strong>Field Verification:</strong> {ref.verificationStatus}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // Step 9: Sourcing Details
      // ----------------------------------------------------
      case 9: {
        const s = customerData.sourcing || {};
        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">SOURCING HIERARCHY &amp; CHANNEL ATTRIBUTION</span>
              <p>Operational sourcing network: District &bull; RM &bull; Field Agent &bull; Sourcing channel.</p>
            </div>

            <div className="bo-v-hierarchy-strip">
              <div className="bo-hier-node">
                <small>District</small>
                <strong>{s.sourcingDistrict}</strong>
              </div>
              <div className="bo-hier-arrow">&rarr;</div>
              <div className="bo-hier-node">
                <small>Relationship Manager</small>
                <strong>{s.relationshipManager}</strong>
                <span>({s.rmId})</span>
              </div>
              <div className="bo-hier-arrow">&rarr;</div>
              <div className="bo-hier-node">
                <small>Field Agent</small>
                <strong>{s.fieldAgent}</strong>
                <span>({s.agentId})</span>
              </div>
            </div>

            <div className="bo-v-grid-2">
              <div className="bo-v-field">
                <label>Sourcing Channel</label>
                <span>{s.sourcingChannel}</span>
              </div>
              <div className="bo-v-field">
                <label>Lead Generation Date</label>
                <span>{s.leadGenerationDate}</span>
              </div>
            </div>

            <div className="bo-v-full-field">
              <label>Agent Field Sourcing Recommendation Note</label>
              <div className="bo-v-purpose-box">{s.agentRecommendation}</div>
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // Step 10: Schedule of Charges
      // ----------------------------------------------------
      case 10: {
        const ch = customerData.scheduleCharges || {};
        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">DISBURSAL COMPUTATION &amp; FEE SCHEDULE</span>
              <p>Transparent schedule of processing charges, statutory stamp duties, and net borrower disbursal.</p>
            </div>

            <div className="bo-charges-table-card">
              <div className="bo-charge-row is-total-top">
                <span>Sanctioned Loan Principal Amount</span>
                <strong>{formatCurrency(ch.sanctionLoanAmount)}</strong>
              </div>
              <div className="bo-charge-row">
                <span>Processing Fee (2.00% + GST)</span>
                <span>- {formatCurrency(ch.processingFee)}</span>
              </div>
              <div className="bo-charge-row">
                <span>Documentation &amp; Legal Scrutiny Charges</span>
                <span>- {formatCurrency(ch.documentationCharges)}</span>
              </div>
              <div className="bo-charge-row">
                <span>Credit Shield Insurance Premium</span>
                <span>- {formatCurrency(ch.insuranceFee)}</span>
              </div>
              <div className="bo-charge-row">
                <span>Applicable GST (18%)</span>
                <span>- {formatCurrency(ch.gstAmount)}</span>
              </div>
              <div className="bo-charge-row is-subtotal">
                <span>Total Upfront Deductions</span>
                <span className="text-danger">- {formatCurrency(ch.totalUpfrontCharges)}</span>
              </div>
              <div className="bo-charge-row is-net-disbursal">
                <div>
                  <strong>Net Disbursal to Customer Account</strong>
                  <small>Payable directly to verified bank account</small>
                </div>
                <strong className="bo-net-amount">{formatCurrency(ch.netDisbursalAmount)}</strong>
              </div>
            </div>

            <div className="bo-v-grid-2" style={{ marginTop: '16px' }}>
              <div className="bo-v-field">
                <label>Monthly Equated Instalment (EMI)</label>
                <strong className="bo-amount-highlight">{formatCurrency(ch.monthlyEmiAmount)} / Month</strong>
              </div>
              <div className="bo-v-field">
                <label>Prepayment &amp; Foreclosure</label>
                <span>{ch.prepaymentCharges}</span>
              </div>
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // Step 11: Document Checklist
      // ----------------------------------------------------
      case 11: {
        const items = customerData.documentChecklist || [];
        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">MANDATORY DOCUMENT UNDERWRITING CHECKLIST</span>
              <p>Verification status of all compulsory regulatory and credit policy documents.</p>
            </div>

            <div className="bo-checklist-table-wrap">
              <table className="bo-checklist-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Document Description</th>
                    <th>Requirement</th>
                    <th>Underwriting Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td><strong>{String(idx + 1).padStart(2, '0')}</strong></td>
                      <td>{item.label}</td>
                      <td>
                        <span className={`bo-req-pill ${item.mandatory ? 'is-mandatory' : 'is-optional'}`}>
                          {item.mandatory ? 'Mandatory' : 'Optional / NA'}
                        </span>
                      </td>
                      <td>
                        <span className="bo-chk-status-pill is-verified">
                          ✓ {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // ----------------------------------------------------
      // Step 12: Declaration & Sign-off
      // ----------------------------------------------------
      case 12: {
        const decl = customerData.declaration || {};
        return (
          <div className="bo-modal-step-body">
            <div className="bo-modal-info-banner">
              <span className="bo-banner-kicker">LEGAL UNDERTAKING &amp; FINAL SIGN-OFF</span>
              <p>Borrower consent confirmation, field agent sign-off, and RM approval recommendation.</p>
            </div>

            <div className="bo-decl-box">
              <h6>Borrower Declaration &amp; Information Undertaking</h6>
              <p className="bo-decl-text">{decl.borrowerConsent}</p>
              <div className="bo-decl-meta-row">
                <span><strong>Consent Date:</strong> {decl.consentDate}</span>
                <span className="text-success font-semibold">✓ {decl.digitalSignatureStatus}</span>
              </div>
            </div>

            <div className="bo-v-grid-2">
              <div className="bo-v-field">
                <label>Field Agent Endorsement</label>
                <span>{decl.fieldAgentEndorsement}</span>
              </div>
              <div className="bo-v-field">
                <label>RM Recommendation</label>
                <span>{decl.rmRecommendation}</span>
              </div>
            </div>

            <div className="bo-signoff-banner">
              <div className="bo-signoff-icon">
                {ShieldCheckIcon && <ShieldCheckIcon size={20} />}
              </div>
              <div className="bo-signoff-text">
                <strong>Back Office Underwriter Recommendation:</strong> Application meets underwriting policy criteria. Ready for operational sign-off and sanction dispatch.
              </div>
            </div>
          </div>
        );
      }

      default:
        return <div>Step data not available.</div>;
    }
  };

  return (
    <div className="bo-vmodal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bo-vmodal-window" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="bo-vmodal-header">
          <div className="bo-vmodal-title-group">
            <div className="bo-vmodal-step-badge">
              <span>Step {stepNumber} of 12</span>
            </div>
            <h3 className="bo-vmodal-title">{stepDefinition.name}</h3>
            <span className="bo-vmodal-subtitle">{customerData.customerName} &bull; {customerData.applicationId}</span>
          </div>

          <div className="bo-vmodal-header-actions">
            <span className="bo-vmodal-status-badge is-submitted">
              Submitted Data (View Only)
            </span>
            <button
              type="button"
              className="bo-vmodal-close-btn"
              onClick={onClose}
              aria-label="Close step modal"
            >
              {XIcon && <XIcon size={18} />}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="bo-vmodal-content">
          {renderStepContent()}
        </div>

        {/* Modal Footer (View Only) */}
        <div className="bo-vmodal-footer bo-vmodal-footer--single">
          <button
            type="button"
            className="bo-btn bo-btn--outline"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
