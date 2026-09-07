import {
  Banknote, BriefcaseBusiness, CalendarDays, Contact, FileBadge, Fingerprint,
  Hash, Landmark, Mail, MapPinned, Settings2, ShieldCheck, Smartphone, WalletCards
} from 'lucide-react';

const text = (name, label, required = false, type = 'text') => ({ name, label, required, type });
const select = (name, label, options, required = false) => ({ name, label, required, type: 'select', options });
const staticSelect = (name, label, options, required = false) => ({ name, label, required, type: 'static-select', options });

const common = {
  companyType: {
    title: 'Company Types', singular: 'Company Type', icon: BriefcaseBusiness, apiKey: 'companyType',
    fields: [text('companyTypeCode', 'Company type code', true), text('companyTypeName', 'Company type name', true)],
    columns: ['companyTypeCode', 'companyTypeName', 'isActive'],
  },
  company: {
    title: 'Companies', singular: 'Company', icon: Landmark, apiKey: 'company',
    fields: [
      text('companyCode', 'Company code', true),
      select('companyTypeId', 'Company type', 'companyTypes', true),
      text('companyName', 'Company name', true),
      text('shortName', 'Short name'),
      text('cinNo', 'CIN number'),
      text('panNo', 'PAN number'),
      text('tanNo', 'TAN number'),
      text('gstin', 'GSTIN'),
      text('udyamRegistrationNo', 'Udyam registration number'),
      text('rbiRegistrationNo', 'RBI registration number'),
      text('licenseNo', 'License number'),
      text('dateOfIncorporation', 'Date of incorporation', false, 'date'),
      text('financialYearStart', 'Financial year start', false, 'date'),
      text('financialYearEnd', 'Financial year end', false, 'date'),
      text('baseCurrency', 'Base currency'),
      text('decimalPlaces', 'Decimal places', false, 'number'),
      text('website', 'Website', false, 'url'),
      text('email', 'Email', false, 'email'),
      text('mobileNo', 'Mobile number'),
      text('phoneNo', 'Phone number'),
      text('faxNo', 'Fax number'),
      text('logoPath', 'Logo path'),
      staticSelect('isHeadOffice', 'Head office', [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }]),
      staticSelect('status', 'Status', [{ value: 1, label: 'Active' }, { value: 0, label: 'Inactive' }]),
    ],
    columns: ['companyCode', 'companyName', 'gstin', 'status'],
  },
  addressType: {
    title: 'Address Types', singular: 'Address Type', icon: MapPinned, apiKey: 'addressType',
    fields: [text('addressTypeCode', 'Address type code', true), text('addressTypeName', 'Address type name', true), text('description', 'Description'), staticSelect('isMandatory', 'Mandatory', [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }]), staticSelect('isHeadOffice', 'Head office', [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }]), text('displayOrder', 'Display order', false, 'number'), staticSelect('isActive', 'Status', [{ value: 1, label: 'Active' }, { value: 0, label: 'Inactive' }])],
    columns: ['addressTypeCode', 'addressTypeName', 'isActive'],
  },
  address: {
    title: 'Company Addresses', singular: 'Company Address', icon: MapPinned, apiKey: 'address', child: true,
    fields: [select('companyId', 'Company', 'companies'), select('companyAddressTypeId', 'Address type', 'addressTypes'), text('addressLine1', 'Address line 1'), text('addressLine2', 'Address line 2'), text('area', 'Area'), select('cityId', 'City', 'cities'), select('districtId', 'District', 'districts'), select('stateId', 'State', 'states'), select('countryId', 'Country', 'countries'), text('pincode', 'Pincode'), text('latitude', 'Latitude', false, 'number'), text('longitude', 'Longitude', false, 'number')],
    columns: ['companyName', 'addressLine1', 'area', 'pincode'],
  },
  bankAccount: {
    title: 'Bank Accounts', singular: 'Bank Account', icon: WalletCards, apiKey: 'bankAccount', child: true,
    fields: [
      select('companyId', 'Company', 'companies', true),
      select('bankId', 'Bank', 'banks'),
      select('bankBranchId', 'Bank branch', 'bankBranches'),
      text('accountHolderName', 'Account holder name'),
      text('accountNumber', 'Account number'),
      text('accountType', 'Account type'),
      text('micrCode', 'MICR code'),
      text('upiId', 'UPI ID'),
      staticSelect('isDefault', 'Default account', [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }]),
      staticSelect('status', 'Status', [{ value: 1, label: 'Active' }, { value: 0, label: 'Inactive' }]),
    ],
    columns: ['companyName', 'accountNumber', 'status'],
  },
  contactPerson: {
    title: 'Contact Persons', singular: 'Contact Person', icon: Contact, apiKey: 'contactPerson', child: true,
    fields: [select('companyId', 'Company', 'companies'), text('contactPerson', 'Contact person'), text('designationId', 'Designation ID', false, 'number'), text('mobileNo', 'Mobile number'), text('alternateMobile', 'Alternate mobile'), text('email', 'Email', false, 'email'), staticSelect('status', 'Status', [{ value: 1, label: 'Active' }, { value: 0, label: 'Inactive' }])],
    columns: ['companyName', 'contactPerson', 'mobileNo', 'email', 'status'],
  },
  digitalSignature: {
    title: 'Digital Signatures', singular: 'Digital Signature', icon: Fingerprint, apiKey: 'digitalSignature', child: true,
    fields: [select('companyId', 'Company', 'companies'), text('certificateName', 'Certificate name'), text('certificateSerialNo', 'Certificate serial number'), text('issuedBy', 'Issued by'), text('validFrom', 'Valid from', false, 'date'), text('validTo', 'Valid to', false, 'date'), text('certificatePath', 'Certificate path'), staticSelect('status', 'Status', [{ value: 1, label: 'Active' }, { value: 0, label: 'Inactive' }])],
    columns: ['companyName', 'certificateName', 'certificateSerialNo', 'validTo', 'status'],
  },
  document: {
    title: 'Company Documents', singular: 'Document', icon: FileBadge, apiKey: 'document', child: true,
    fields: [select('companyId', 'Company', 'companies'), text('documentType', 'Document type'), text('documentNumber', 'Document number'), text('issueDate', 'Issue date', false, 'date'), text('expiryDate', 'Expiry date', false, 'date'), text('fileName', 'File name'), text('filePath', 'File path'), staticSelect('status', 'Status', [{ value: 1, label: 'Active' }, { value: 0, label: 'Inactive' }])],
    columns: ['companyName', 'documentType', 'documentNumber', 'expiryDate', 'status'],
  },
  emailConfiguration: {
    title: 'Email Configuration', singular: 'Email Configuration', icon: Mail, apiKey: 'emailConfiguration', child: true,
    fields: [select('companyId', 'Company', 'companies'), text('smtpServer', 'SMTP server'), text('smtpPort', 'SMTP port', false, 'number'), text('emailId', 'Email ID', false, 'email'), staticSelect('ssl', 'SSL', [{ value: 1, label: 'Enabled' }, { value: 0, label: 'Disabled' }]), text('displayName', 'Display name'), text('replyTo', 'Reply to', false, 'email'), staticSelect('isActive', 'Status', [{ value: 1, label: 'Active' }, { value: 0, label: 'Inactive' }])],
    columns: ['companyName', 'smtpServer', 'emailId', 'displayName', 'isActive'],
  },
  smsConfiguration: {
    title: 'SMS Configuration', singular: 'SMS Configuration', icon: Smartphone, apiKey: 'smsConfiguration', child: true,
    fields: [select('companyId', 'Company', 'companies'), text('smsProvider', 'SMS provider'), text('apiUrl', 'API URL', false, 'url'), text('senderId', 'Sender ID'), text('templateId', 'Template ID'), staticSelect('isActive', 'Status', [{ value: 1, label: 'Active' }, { value: 0, label: 'Inactive' }])],
    columns: ['companyName', 'smsProvider', 'senderId', 'templateId', 'isActive'],
  },
  numberSeries: {
    title: 'Number Series', singular: 'Number Series', icon: Hash, apiKey: 'numberSeries', child: true,
    fields: [select('companyId', 'Company', 'companies'), text('seriesType', 'Series type'), text('prefix', 'Prefix'), text('suffix', 'Suffix'), text('runningNo', 'Running number', false, 'number'), text('noOfDigits', 'Number of digits', false, 'number'), staticSelect('financialYearWise', 'Financial year wise', [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }]), staticSelect('resetEveryYear', 'Reset every year', [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }])],
    columns: ['companyName', 'seriesType', 'prefix', 'runningNo'],
  },
  holidayCalendar: {
    title: 'Holiday Calendar', singular: 'Holiday', icon: CalendarDays, apiKey: 'holidayCalendar', child: true,
    fields: [select('companyId', 'Company', 'companies'), text('branchId', 'Branch ID', false, 'number'), text('holidayDate', 'Holiday date', false, 'date'), text('holidayName', 'Holiday name'), text('holidayType', 'Holiday type'), staticSelect('isWorkingDay', 'Working day', [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }])],
    columns: ['companyName', 'holidayDate', 'holidayName', 'holidayType', 'isWorkingDay'],
  },
  financialSetting: {
    title: 'Financial Settings', singular: 'Financial Setting', icon: Banknote, apiKey: 'financialSetting', child: true,
    fields: [select('companyId', 'Company', 'companies'), select('compYId', 'Accounting detail', 'accountingDetails'), text('accountingMethod', 'Accounting method'), text('defaultGST', 'Default GST', false, 'number'), staticSelect('tdsApplicable', 'TDS applicable', [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }]), text('tdsPercentage', 'TDS percentage', false, 'number'), text('defaultCurrency', 'Default currency'), text('defaultInterestCalculation', 'Default interest calculation'), text('defaultEMIFrequency', 'Default EMI frequency'), text('penalInterest', 'Penal interest', false, 'number'), text('graceDays', 'Grace days', false, 'number')],
    columns: ['companyName', 'accountingMethod', 'defaultCurrency', 'defaultEMIFrequency'],
  },
  loanSetting: {
    title: 'Loan Settings', singular: 'Loan Setting', icon: Settings2, apiKey: 'loanSetting', child: true,
    fields: [select('companyId', 'Company', 'companies'), select('compYId', 'Accounting detail', 'accountingDetails'), text('minimumLoanAmount', 'Minimum loan amount', false, 'number'), text('maximumLoanAmount', 'Maximum loan amount', false, 'number'), text('minimumInterest', 'Minimum interest', false, 'number'), text('maximumInterest', 'Maximum interest', false, 'number'), text('minimumTenure', 'Minimum tenure', false, 'number'), text('maximumTenure', 'Maximum tenure', false, 'number'), text('defaultProcessingFee', 'Default processing fee', false, 'number'), text('defaultDocumentationFee', 'Default documentation fee', false, 'number'), text('defaultInsurancePercentage', 'Default insurance percentage', false, 'number'), text('defaultPenaltyPercentage', 'Default penalty percentage', false, 'number'), text('emiGraceDays', 'EMI grace days', false, 'number'), staticSelect('autoEMIGeneration', 'Auto EMI generation', [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }])],
    columns: ['companyName', 'minimumLoanAmount', 'maximumLoanAmount', 'minimumInterest', 'maximumInterest'],
  },
  accountingDetail: {
    title: 'Accounting Details', singular: 'Accounting Detail', icon: ShieldCheck, apiKey: 'accountingDetail', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('yrId', 'Year', true, 'number'), staticSelect('dispStatus', 'Status', [{ value: 1, label: 'Active' }, { value: 0, label: 'Inactive' }], true), text('prcsDate', 'Process date', true, 'datetime-local')],
    columns: ['companyName', 'yrId', 'dispStatus', 'prcsDate'],
  },
};

export const COMPANY_SECTIONS = Object.values(common);
export const COMPANY_CONFIG = common;
export const COMPANY_GROUPS = [
  { label: 'Company Foundation', items: ['companyType', 'company', 'addressType', 'address'] },
  { label: 'Finance & Lending', items: ['bankAccount', 'numberSeries', 'financialSetting', 'loanSetting', 'accountingDetail'] },
  { label: 'Communication', items: ['contactPerson', 'emailConfiguration', 'smsConfiguration', 'digitalSignature'] },
  { label: 'Compliance & Calendar', items: ['document', 'holidayCalendar'] },
];
export const SENSITIVE_KEYS = new Set(['passwordHash', 'apiKey', 'certificatePassword', 'certificatePassphrase', 'smsSecret']);
export const AUDIT_KEYS = new Set(['id', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'deletedAt', 'deletedBy']);

const primaryKeyNames = [
  'id', 'companyId', 'companyMasterId', 'companyTypeMasterId', 'companyAddressTypeMasterId',
  'addressId', 'companyBankId', 'contactId', 'signatureId', 'documentId', 'emailConfigId',
  'smsConfigId', 'seriesId', 'holidayId', 'settingId', 'loanSettingId', 'compYId',
  'companyAddressId', 'companyBankAccountId', 'companyContactPersonId',
  'companyDigitalSignatureId', 'companyDocumentId', 'companyEmailConfigurationId',
  'companySmsConfigurationId', 'companyNumberSeriesId', 'companyHolidayCalendarId',
  'companyFinancialSettingId', 'companyLoanSettingId', 'companyAccountingDetailId',
  'companyTypeId', 'companyAddressTypeId', 'addressTypeId', 'cityId', 'stateId',
];

const resourceKeyNames = {
  company: ['companyMasterId', 'companyId', 'id'],
  companyType: ['companyTypeMasterId', 'companyTypeId', 'id'],
  addressType: ['companyAddressTypeMasterId', 'companyAddressTypeId', 'addressTypeId', 'id'],
  address: ['addressId', 'companyAddressId', 'id'],
  bankAccount: ['companyBankId', 'companyBankAccountId', 'id'],
  contactPerson: ['contactId', 'companyContactPersonId', 'id'],
  digitalSignature: ['signatureId', 'companyDigitalSignatureId', 'id'],
  document: ['documentId', 'companyDocumentId', 'id'],
  emailConfiguration: ['emailConfigId', 'companyEmailConfigurationId', 'id'],
  smsConfiguration: ['smsConfigId', 'companySmsConfigurationId', 'id'],
  numberSeries: ['seriesId', 'companyNumberSeriesId', 'id'],
  holidayCalendar: ['holidayId', 'companyHolidayCalendarId', 'id'],
  financialSetting: ['settingId', 'companyFinancialSettingId', 'id'],
  loanSetting: ['loanSettingId', 'companyLoanSettingId', 'id'],
  accountingDetail: ['compYId', 'companyAccountingDetailId', 'id'],
};

export const getRecordId = (record, resource) => {
  const preferredKeys = resourceKeyNames[resource] || [];
  const candidateKeys = [...preferredKeys, ...primaryKeyNames];
  const explicitId = candidateKeys.find((key, index) => candidateKeys.indexOf(key) === index && record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== '');
  if (explicitId) return record[explicitId];
  const inferredId = Object.keys(record || {}).find((key) => /id$/i.test(key) && key !== 'companyId');
  return inferredId ? record[inferredId] : record?.companyId;
};
export const getDisplayValue = (record, key) => {
  const aliases = { companyName: ['companyName', 'name'], companyTypeName: ['companyTypeName', 'name'], companyAddressTypeName: ['companyAddressTypeName', 'addressTypeName', 'name'] };
  let found = (aliases[key] || [key]).find((item) => record?.[item] !== undefined && record?.[item] !== null);
  if (!found && key === 'description') {
    found = Object.keys(record || {}).find((item) => /description|desc$/i.test(item) && !SENSITIVE_KEYS.has(item));
  }
  return found ? String(record[found]) : '-';
};
