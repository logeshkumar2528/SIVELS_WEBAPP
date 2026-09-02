import {
  Banknote, BriefcaseBusiness, CalendarDays, Contact, FileBadge, Fingerprint,
  Hash, Landmark, Mail, MapPinned, Settings2, ShieldCheck, Smartphone, WalletCards
} from 'lucide-react';

const text = (name, label, required = false, type = 'text') => ({ name, label, required, type });
const select = (name, label, options, required = false) => ({ name, label, required, type: 'select', options });

const common = {
  companyType: {
    title: 'Company Types', singular: 'Company Type', icon: BriefcaseBusiness, apiKey: 'companyType',
    fields: [text('companyTypeCode', 'Company type code', true), text('companyTypeName', 'Company type name', true)],
    columns: ['companyTypeCode', 'companyTypeName', 'isActive'],
  },
  company: {
    title: 'Companies', singular: 'Company', icon: Landmark, apiKey: 'company',
    fields: [text('companyCode', 'Company code', true), select('companyTypeId', 'Company type', 'companyTypes', true), text('companyName', 'Company name', true), text('shortName', 'Short name'), text('registrationNumber', 'Registration number'), text('taxIdentificationNumber', 'Tax identification number'), text('website', 'Website', false, 'url')],
    columns: ['companyCode', 'companyName', 'shortName', 'registrationNumber', 'isActive'],
  },
  addressType: {
    title: 'Address Types', singular: 'Address Type', icon: MapPinned, apiKey: 'addressType',
    fields: [text('companyAddressTypeName', 'Address type', true), text('description', 'Description')],
    columns: ['companyAddressTypeName', 'description', 'isActive'],
  },
  address: {
    title: 'Company Addresses', singular: 'Company Address', icon: MapPinned, apiKey: 'address', child: true,
    fields: [select('companyId', 'Company', 'companies', true), select('companyAddressTypeId', 'Address type', 'addressTypes', true), text('addressLine1', 'Address line 1', true), text('addressLine2', 'Address line 2'), text('city', 'City'), text('state', 'State'), text('postalCode', 'Postal code'), text('country', 'Country')],
    columns: ['companyName', 'companyAddressTypeName', 'addressLine1', 'city', 'isActive'],
  },
  bankAccount: {
    title: 'Bank Accounts', singular: 'Bank Account', icon: WalletCards, apiKey: 'bankAccount', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('bankName', 'Bank name', true), text('accountName', 'Account name', true), text('accountNumber', 'Account number', true), text('ifscCode', 'IFSC / routing code'), text('branchName', 'Branch name')],
    columns: ['companyName', 'bankName', 'accountName', 'ifscCode', 'isActive'],
  },
  contactPerson: {
    title: 'Contact Persons', singular: 'Contact Person', icon: Contact, apiKey: 'contactPerson', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('firstName', 'First name', true), text('lastName', 'Last name'), text('designation', 'Designation'), text('email', 'Email', true, 'email'), text('phoneNumber', 'Phone number')],
    columns: ['companyName', 'firstName', 'lastName', 'designation', 'email', 'isActive'],
  },
  digitalSignature: {
    title: 'Digital Signatures', singular: 'Digital Signature', icon: Fingerprint, apiKey: 'digitalSignature', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('certificateName', 'Certificate name', true), text('certificateType', 'Certificate type'), text('expiryDate', 'Expiry date', false, 'date')],
    columns: ['companyName', 'certificateName', 'certificateType', 'expiryDate', 'isActive'],
  },
  document: {
    title: 'Company Documents', singular: 'Document', icon: FileBadge, apiKey: 'document', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('documentName', 'Document name', true), text('documentType', 'Document type'), text('documentNumber', 'Document number'), text('expiryDate', 'Expiry date', false, 'date')],
    columns: ['companyName', 'documentName', 'documentType', 'documentNumber', 'isActive'],
  },
  emailConfiguration: {
    title: 'Email Configuration', singular: 'Email Configuration', icon: Mail, apiKey: 'emailConfiguration', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('smtpHost', 'SMTP host', true), text('smtpPort', 'SMTP port', true, 'number'), text('fromEmail', 'From email', true, 'email'), text('displayName', 'Display name')],
    columns: ['companyName', 'smtpHost', 'smtpPort', 'fromEmail', 'isActive'],
  },
  smsConfiguration: {
    title: 'SMS Configuration', singular: 'SMS Configuration', icon: Smartphone, apiKey: 'smsConfiguration', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('providerName', 'Provider name', true), text('senderId', 'Sender ID', true), text('apiUrl', 'API URL', false, 'url')],
    columns: ['companyName', 'providerName', 'senderId', 'apiUrl', 'isActive'],
  },
  numberSeries: {
    title: 'Number Series', singular: 'Number Series', icon: Hash, apiKey: 'numberSeries', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('seriesName', 'Series name', true), text('prefix', 'Prefix'), text('nextNumber', 'Next number', true, 'number'), text('financialYear', 'Financial year')],
    columns: ['companyName', 'seriesName', 'prefix', 'nextNumber', 'isActive'],
  },
  holidayCalendar: {
    title: 'Holiday Calendar', singular: 'Holiday', icon: CalendarDays, apiKey: 'holidayCalendar', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('holidayName', 'Holiday name', true), text('holidayDate', 'Date', true, 'date'), text('description', 'Description')],
    columns: ['companyName', 'holidayName', 'holidayDate', 'description', 'isActive'],
  },
  financialSetting: {
    title: 'Financial Settings', singular: 'Financial Setting', icon: Banknote, apiKey: 'financialSetting', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('financialYearStart', 'Financial year start', false, 'date'), text('financialYearEnd', 'Financial year end', false, 'date'), text('currency', 'Currency', true), text('decimalPlaces', 'Decimal places', false, 'number')],
    columns: ['companyName', 'financialYearStart', 'financialYearEnd', 'currency', 'isActive'],
  },
  loanSetting: {
    title: 'Loan Settings', singular: 'Loan Setting', icon: Settings2, apiKey: 'loanSetting', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('settingName', 'Setting name', true), text('settingValue', 'Setting value', true), text('description', 'Description')],
    columns: ['companyName', 'settingName', 'settingValue', 'description', 'isActive'],
  },
  accountingDetail: {
    title: 'Accounting Details', singular: 'Accounting Detail', icon: ShieldCheck, apiKey: 'accountingDetail', child: true,
    fields: [select('companyId', 'Company', 'companies', true), text('ledgerName', 'Ledger name', true), text('accountCode', 'Account code', true), text('taxRegistrationNumber', 'Tax registration number'), text('description', 'Description')],
    columns: ['companyName', 'ledgerName', 'accountCode', 'taxRegistrationNumber', 'isActive'],
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
  'id', 'companyMasterId', 'companyTypeMasterId', 'companyAddressTypeMasterId',
  'companyAddressId', 'companyBankAccountId', 'companyContactPersonId',
  'companyDigitalSignatureId', 'companyDocumentId', 'companyEmailConfigurationId',
  'companySmsConfigurationId', 'companyNumberSeriesId', 'companyHolidayCalendarId',
  'companyFinancialSettingId', 'companyLoanSettingId', 'companyAccountingDetailId',
  'companyTypeId', 'companyAddressTypeId', 'addressTypeId',
];

const resourceKeyNames = {
  company: ['companyMasterId', 'companyId', 'id'],
  companyType: ['companyTypeMasterId', 'companyTypeId', 'id'],
  addressType: ['companyAddressTypeMasterId', 'companyAddressTypeId', 'addressTypeId', 'id'],
  address: ['companyAddressId', 'id'],
  bankAccount: ['companyBankAccountId', 'id'],
  contactPerson: ['companyContactPersonId', 'id'],
  digitalSignature: ['companyDigitalSignatureId', 'id'],
  document: ['companyDocumentId', 'id'],
  emailConfiguration: ['companyEmailConfigurationId', 'id'],
  smsConfiguration: ['companySmsConfigurationId', 'id'],
  numberSeries: ['companyNumberSeriesId', 'id'],
  holidayCalendar: ['companyHolidayCalendarId', 'id'],
  financialSetting: ['companyFinancialSettingId', 'id'],
  loanSetting: ['companyLoanSettingId', 'id'],
  accountingDetail: ['companyAccountingDetailId', 'id'],
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
