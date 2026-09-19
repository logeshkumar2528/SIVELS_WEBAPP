import { useState } from 'react';
import { User, MapPin, Briefcase, Landmark, Calendar } from 'lucide-react';

function formatCurrency(amount) {
  if (amount === undefined || amount === null || amount === '' || isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(amount));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function ApplicantsTab({ applicants = [], masterLookups = {} }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!applicants || applicants.length === 0) {
    return (
      <div className="app360-tab-pane">
        <p className="app360-no-records">No applicant records found for this application.</p>
      </div>
    );
  }

  const currentApplicant = applicants[selectedIdx] || applicants[0] || {};
  const currentPersonal = currentApplicant.person || {};
  const currentAddresses = currentApplicant.addresses || [];
  const currentEmployment = currentApplicant.employments || [];
  const currentBanks = currentApplicant.banks || [];
  const identityKyc = currentApplicant.identityKyc || {};

  // Resolve Master Labels
  const titleLabel = currentPersonal.titleId 
    ? (masterLookups.titles?.[currentPersonal.titleId] || `Title #${currentPersonal.titleId}`) 
    : null;

  const genderLabel = currentPersonal.genderId 
    ? (masterLookups.genders?.[currentPersonal.genderId] || `Gender #${currentPersonal.genderId}`) 
    : (currentPersonal.gender || '—');

  const maritalLabel = currentPersonal.maritalStatusId 
    ? (masterLookups.maritalStatuses?.[currentPersonal.maritalStatusId] || `Status #${currentPersonal.maritalStatusId}`) 
    : (currentPersonal.maritalStatus || '—');

  const relationshipLabel = currentPersonal.relationshipId 
    ? (masterLookups.relationships?.[currentPersonal.relationshipId] || `Rel #${currentPersonal.relationshipId}`) 
    : '—';

  const religionLabel = currentPersonal.religionId 
    ? (masterLookups.religions?.[currentPersonal.religionId] || `Religion #${currentPersonal.religionId}`) 
    : '—';

  const casteLabel = currentPersonal.casteId 
    ? (masterLookups.castes?.[currentPersonal.casteId] || `Caste #${currentPersonal.casteId}`) 
    : '—';

  const panCardNumber = currentPersonal.panNumber || currentPersonal.panCardNo || identityKyc.panCardNo || '—';

  const applicantDisplayName = currentPersonal.fullName || 
    [titleLabel, currentPersonal.firstName, currentPersonal.middleName, currentPersonal.lastName].filter(Boolean).join(' ').trim() || 
    currentApplicant.label;

  return (
    <div className="app360-tab-pane">
      {/* Applicant Switcher Tabs */}
      <div className="app360-applicant-selector">
        <span className="app360-selector-label">Select Applicant:</span>
        <div className="app360-selector-pills">
          {applicants.map((app, idx) => (
            <button
              key={idx}
              type="button"
              className={`app360-selector-btn ${selectedIdx === idx ? 'active' : ''}`}
              onClick={() => setSelectedIdx(idx)}
            >
              <User size={15} />
              <span>{app.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="app360-cards-grid">
        {/* Card 1: Personal Information */}
        <div className="app360-content-card">
          <div className="app360-card-header">
            <div className="app360-card-title">
              <User size={18} className="app360-card-icon" />
              <h3>Personal Details — {applicantDisplayName}</h3>
            </div>
            <span className="app360-badge app360-badge-primary">
              {currentApplicant.label}
            </span>
          </div>
          <div className="app360-card-body">
            <div className="app360-details-grid">
              <div className="app360-detail-item">
                <span className="label">Title</span>
                <span className="value">{titleLabel || '—'}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">First Name</span>
                <strong className="value">{currentPersonal.firstName || '—'}</strong>
              </div>
              <div className="app360-detail-item">
                <span className="label">Middle Name</span>
                <span className="value">{currentPersonal.middleName || '—'}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Last Name</span>
                <strong className="value">{currentPersonal.lastName || '—'}</strong>
              </div>
              <div className="app360-detail-item">
                <span className="label">Father / Spouse Name</span>
                <span className="value">{currentPersonal.fatherSpouseName || currentPersonal.fatherOrSpouseName || '—'}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Mother's Maiden Name</span>
                <span className="value">{currentPersonal.mothersMaidenName || '—'}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Relationship</span>
                <span className="value">{relationshipLabel}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Date of Birth</span>
                <span className="value">{formatDate(currentPersonal.dateOfBirth)}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Gender</span>
                <span className="value">{genderLabel}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Marital Status</span>
                <span className="value">{maritalLabel}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">PAN Number</span>
                <strong className="value">{panCardNumber}</strong>
              </div>
              <div className="app360-detail-item">
                <span className="label">Mobile Number</span>
                <span className="value">{currentPersonal.mobileNumber || '—'}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Email ID</span>
                <span className="value">{currentPersonal.emailId || currentPersonal.email || '—'}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Religion</span>
                <span className="value">{religionLabel}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Caste</span>
                <span className="value">{casteLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Address Information */}
        <div className="app360-content-card">
          <div className="app360-card-header">
            <div className="app360-card-title">
              <MapPin size={18} className="app360-card-icon" />
              <h3>Address Information ({currentAddresses.length})</h3>
            </div>
          </div>
          <div className="app360-card-body">
            {currentAddresses.length === 0 ? (
              <p className="app360-no-records">No address records linked to this applicant.</p>
            ) : (
              <div className="app360-sublist">
                {currentAddresses.map((addr, idx) => {
                  const cityName = addr.cityId ? (masterLookups.cities?.[addr.cityId] || `City #${addr.cityId}`) : (addr.cityName || '—');
                  const stateName = addr.stateId ? (masterLookups.states?.[addr.stateId] || `State #${addr.stateId}`) : (addr.stateName || '—');

                  return (
                    <div key={addr.applicationAddressDetailsId || addr.addressDetailsId || idx} className="app360-subcard">
                      <div className="app360-subcard-header">
                        <strong>Address #{idx + 1}</strong>
                        {addr.mailingAsCurrent !== undefined && (
                          <span className="app360-badge">
                            Mailing as Current: {addr.mailingAsCurrent ? 'Yes' : 'No'}
                          </span>
                        )}
                      </div>
                      <div className="app360-details-grid app360-mt-2">
                        <div className="app360-detail-item app360-col-span-2">
                          <span className="label">Address Line 1</span>
                          <span className="value">{addr.addressLine1 || '—'}</span>
                        </div>
                        <div className="app360-detail-item app360-col-span-2">
                          <span className="label">Address Line 2</span>
                          <span className="value">{addr.addressLine2 || '—'}</span>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">Landmark</span>
                          <span className="value">{addr.landmark || '—'}</span>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">Pincode</span>
                          <span className="value">{addr.pincode || '—'}</span>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">City</span>
                          <span className="value">{cityName}</span>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">State</span>
                          <span className="value">{stateName}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Employment & Income Details */}
        <div className="app360-content-card">
          <div className="app360-card-header">
            <div className="app360-card-title">
              <Briefcase size={18} className="app360-card-icon" />
              <h3>Employment & Income Details ({currentEmployment.length})</h3>
            </div>
          </div>
          <div className="app360-card-body">
            {currentEmployment.length === 0 ? (
              <p className="app360-no-records">No employment records linked to this applicant.</p>
            ) : (
              <div className="app360-sublist">
                {currentEmployment.map((emp, idx) => {
                  const empTypeName = emp.employmentTypeId 
                    ? (masterLookups.employmentTypes?.[emp.employmentTypeId] || `Employment Type #${emp.employmentTypeId}`) 
                    : '—';
                  const educationName = emp.educationId 
                    ? (masterLookups.educations?.[emp.educationId] || `Education #${emp.educationId}`) 
                    : '—';

                  return (
                    <div key={emp.applicationEmploymentIncomeDetailsId || emp.employmentIncomeId || idx} className="app360-subcard">
                      <div className="app360-subcard-header">
                        <strong>{emp.employerBusinessName || `Employment #${idx + 1}`}</strong>
                        <span className="app360-badge">{empTypeName}</span>
                      </div>
                      <div className="app360-details-grid app360-mt-2">
                        <div className="app360-detail-item">
                          <span className="label">Designation / Nature of Business</span>
                          <span className="value">{emp.designationNatureOfBusiness || '—'}</span>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">Industry Type</span>
                          <span className="value">{emp.industryType || '—'}</span>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">Education</span>
                          <span className="value">{educationName}</span>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">Total Experience</span>
                          <span className="value">{emp.totalExperience !== undefined && emp.totalExperience !== null ? `${emp.totalExperience} Years` : '—'}</span>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">Gross Monthly Income</span>
                          <strong className="value text-success">{formatCurrency(emp.grossMonthlyIncome)}</strong>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">Other Monthly Income</span>
                          <span className="value">{formatCurrency(emp.otherMonthlyIncome)}</span>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">Net Monthly Income</span>
                          <strong className="value">{formatCurrency(emp.netMonthlyIncome)}</strong>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">Gross Annual Income</span>
                          <span className="value">{formatCurrency(emp.grossAnnualIncome)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Bank Details & Existing Obligations */}
        <div className="app360-content-card">
          <div className="app360-card-header">
            <div className="app360-card-title">
              <Landmark size={18} className="app360-card-icon" />
              <h3>Bank & Loan Accounts ({currentBanks.length})</h3>
            </div>
          </div>
          <div className="app360-card-body">
            {currentBanks.length === 0 ? (
              <p className="app360-no-records">No bank account records linked to this applicant.</p>
            ) : (
              <div className="app360-sublist">
                {currentBanks.map((bank, idx) => {
                  const bankName = bank.bankId ? (masterLookups.banks?.[bank.bankId] || `Bank #${bank.bankId}`) : '—';
                  const branchName = bank.bankBranchId ? (masterLookups.bankBranches?.[bank.bankBranchId] || `Branch #${bank.bankBranchId}`) : '—';

                  return (
                    <div key={bank.applicationBankExistingLoanDetailsId || bank.bankId || idx} className="app360-subcard">
                      <div className="app360-subcard-header">
                        <strong>{bankName}</strong>
                        {bank.isPrimaryBank !== undefined && (
                          <span className={`app360-badge ${bank.isPrimaryBank ? 'app360-badge-primary' : ''}`}>
                            {bank.isPrimaryBank ? 'Primary Bank' : 'Secondary Bank'}
                          </span>
                        )}
                      </div>
                      <div className="app360-details-grid app360-mt-2">
                        <div className="app360-detail-item">
                          <span className="label">Account Number</span>
                          <strong className="value">{bank.accountNumber || '—'}</strong>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">Bank Branch</span>
                          <span className="value">{branchName}</span>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">No. of Active Loans</span>
                          <span className="value">{bank.noOfActiveLoans ?? 0}</span>
                        </div>
                        <div className="app360-detail-item">
                          <span className="label">No. of Active Credit Cards</span>
                          <span className="value">{bank.noOfActiveCreditCards ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApplicantsTab;
