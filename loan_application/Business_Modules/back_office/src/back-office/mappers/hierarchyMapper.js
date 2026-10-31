/**
 * hierarchyMapper.js
 * --------------------
 * Purpose:
 *   Normalizes raw backend master records (Districts, RMs, Agents, Customers)
 *   into consistent, safe frontend UI structures.
 *
 * Capabilities:
 *   - Transparently handles mixed casing (camelCase vs. PascalCase).
 *   - Preserves original raw response for debugging/custom access.
 *   - Enforces real primary key (`agentCustomerId`) across customer models.
 */

/**
 * Safely extracts the first non-null, non-undefined value matching any candidate key.
 *
 * @param {object} obj - Source record
 * @param {...string} keys - Candidate property keys
 * @returns {any} Resolved value or null
 */
export const getValue = (obj, ...keys) => {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }
  return null;
};

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isDisplayName(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && text !== '—' && text !== '0' && !/^\d+$/.test(text) && !/\bid\b/i.test(text);
}

function isNumericId(value) {
  return isPresent(value) && /^\d+$/.test(String(value).trim()) && String(value).trim() !== '0';
}

function resolveLocation(source, config, lookupData) {
  const rawId = config.idKeys.map((key) => source?.[key]).find(isNumericId);
  const name = config.nameKeys.map((key) => source?.[key]).find(isDisplayName);
  if (name !== undefined) {
    return { id: rawId ?? null, name: String(name).trim() };
  }

  const list = lookupData?.[config.collection] || [];
  const match = rawId == null
    ? null
    : list.find((item) => {
      const itemId = config.itemIdKeys.map((key) => item?.[key]).find(isPresent);
      return itemId !== undefined && String(itemId).trim() === String(rawId).trim();
    });
  const resolvedName = match && config.itemNameKeys.map((key) => match?.[key]).find(isDisplayName);
  return { id: rawId ?? null, name: resolvedName ? String(resolvedName).trim() : '' };
}

/**
 * Maps raw backend District record to standard frontend shape.
 *
 * @param {object} district - Raw district object
 * @returns {object|null} Standardized district
 */
export function mapDistrict(district) {
  if (!district) return null;

  const id = getValue(district, 'districtId', 'DistrictId', 'id', 'Id');
  const name = getValue(district, 'districtName', 'DistrictName', 'name', 'Name', 'district', 'District') || '';
  const districtCode = getValue(district, 'districtCode', 'DistrictCode', 'code', 'Code') || '';
  const stateId = getValue(district, 'stateId', 'StateId');
  const zone = getValue(district, 'zone', 'Zone') || 'Tamil Nadu Zone';
  const headquarters =
    getValue(district, 'headquarters', 'Headquarters', 'hq', 'HQ', 'branch', 'Branch') ||
    (name ? `${name} HQ` : 'Regional Office');
  const isActive = getValue(district, 'isActive', 'IsActive', 'status', 'Status') ?? true;

  const idStr = id != null ? String(id) : '';
  const code = districtCode || (idStr ? `DIS-${idStr.padStart(3, '0')}` : (name ? name.slice(0, 3).toUpperCase() : ''));

  return {
    id: idStr,
    districtId: id,
    name,
    code,
    districtCode: code,
    stateId,
    zone,
    headquarters,
    isActive: Boolean(isActive),
    raw: district,
  };
}

/**
 * Maps raw backend Relationship Manager (RM) record to standard frontend shape.
 *
 * @param {object} rm - Raw RM object
 * @returns {object|null} Standardized RM
 */
export function mapRM(rm) {
  if (!rm) return null;

  const id = getValue(rm, 'rmId', 'RmId', 'RMId', 'id', 'Id');
  const employeeCode = getValue(rm, 'employeeCode', 'EmployeeCode', 'rmCode', 'RmCode', 'code', 'Code') || '';
  const name = getValue(rm, 'fullName', 'FullName', 'name', 'Name', 'rmName', 'RmName') || '';
  const mobile = getValue(rm, 'mobileNumber', 'MobileNumber', 'mobile', 'Mobile', 'phoneNumber', 'PhoneNumber') || '';
  const email = getValue(rm, 'email', 'Email', 'emailAddress', 'EmailAddress') || '';
  const branch = getValue(rm, 'branch', 'Branch', 'branchName', 'BranchName') || '';
  const districtId = getValue(rm, 'districtId', 'DistrictId');
  const districtName = getValue(rm, 'districtName', 'DistrictName', 'district', 'District') || '';
  const status = getValue(rm, 'status', 'Status') || 'Active';
  const activeSince = getValue(
    rm,
    'activeSince',
    'ActiveSince',
    'createdAt',
    'CreatedAt',
    'createdDate',
    'CreatedDate',
    'joiningDate',
    'JoiningDate'
  );
  const targetAmount = getValue(rm, 'targetAmount', 'TargetAmount') || 0;
  const targetAchievement = getValue(rm, 'targetAchievement', 'TargetAchievement') || 0;

  const idStr = id != null ? String(id) : '';
  const code = employeeCode || '—';

  return {
    id: idStr,
    rmId: id,
    employeeCode: code,
    code,
    name,
    fullName: name,
    mobile: String(mobile).replace(/\D/g, '').slice(-10),
    email,
    branch,
    districtId: districtId != null ? String(districtId) : null,
    districtName,
    status:
      status === 1 || status === true || String(status).toLowerCase() === 'active' || String(status).toLowerCase() === 'on track'
        ? 'Active'
        : status === 0 || status === false || String(status).toLowerCase() === 'inactive'
        ? 'Inactive'
        : String(status),
    activeSince: activeSince ? String(activeSince).slice(0, 10) : '—',
    targetAmount: Number(targetAmount) || 0,
    targetAchievement: Number(targetAchievement) || 0,
    raw: rm,
  };
}

/**
 * Maps raw backend Field Agent record to standard frontend shape.
 *
 * @param {object} agent - Raw Agent object
 * @returns {object|null} Standardized Agent
 */
export function mapAgent(agent) {
  if (!agent) return null;

  const id = getValue(agent, 'agentId', 'AgentId', 'id', 'Id');
  const agentCode = getValue(agent, 'agentCode', 'AgentCode', 'code', 'Code') || '';
  const name = getValue(agent, 'fullName', 'FullName', 'name', 'Name', 'agentName', 'AgentName') || '';
  const mobile = getValue(agent, 'mobileNumber', 'MobileNumber', 'mobile', 'Mobile', 'phoneNumber', 'PhoneNumber') || '';
  const email = getValue(agent, 'email', 'Email', 'emailAddress', 'EmailAddress') || '';
  const rmId = getValue(agent, 'rmId', 'RmId', 'RMId');
  const rmName = getValue(agent, 'rmName', 'RmName', 'RMName') || '';
  const districtId = getValue(agent, 'districtId', 'DistrictId');
  const districtName = getValue(agent, 'districtName', 'DistrictName', 'district', 'District') || '';
  const branch = getValue(agent, 'branch', 'Branch', 'branchName', 'BranchName') || '';
  const status = getValue(agent, 'status', 'Status') || 'Active';
  const joinedDate = getValue(
    agent,
    'joinedDate',
    'JoinedDate',
    'createdAt',
    'CreatedAt',
    'createdDate',
    'CreatedDate',
    'dateJoined'
  );

  const idStr = id != null ? String(id) : '';
  const code = agentCode || '—';

  return {
    id: idStr,
    agentId: id,
    code,
    agentCode: code,
    name,
    fullName: name,
    mobile: String(mobile).replace(/\D/g, '').slice(-10),
    email,
    rmId: rmId != null ? String(rmId) : null,
    rmName,
    districtId: districtId != null ? String(districtId) : null,
    districtName,
    branch,
    status:
      status === 1 || status === true || String(status).toLowerCase() === 'active'
        ? 'Active'
        : status === 0 || status === false || String(status).toLowerCase() === 'inactive'
        ? 'Inactive'
        : String(status),
    joinedDate: joinedDate ? String(joinedDate).slice(0, 10) : '—',
    customerCount: getValue(agent, 'customerCount', 'CustomerCount') || 0,
    applicationCount: getValue(agent, 'applicationCount', 'ApplicationCount') || 0,
    portfolioAmount: getValue(agent, 'portfolioAmount', 'PortfolioAmount') || 0,
    raw: agent,
  };
}

/**
 * Maps raw backend Customer / Lead record to standard frontend shape.
 * Enforces `agentCustomerId` as primary relational identifier.
 *
 * @param {object} customer - Raw customer object
 * @returns {object|null} Standardized Customer
 */
export function mapCustomer(customer) {
  if (!customer) return null;

  const agentCustomerId = getValue(
    customer,
    'agentCustomerId',
    'AgentCustomerId',
    'customerId',
    'CustomerId',
    'id',
    'Id'
  );

  const name = getValue(customer, 'fullName', 'FullName', 'customerName', 'CustomerName', 'name', 'Name') || '';
  const mobile = getValue(customer, 'mobileNumber', 'MobileNumber', 'mobile', 'Mobile', 'contactNumber', 'ContactNumber') || '';
  const email = getValue(customer, 'email', 'Email', 'emailAddress', 'EmailAddress') || '';
  const expectedLoanAmount = getValue(
    customer,
    'expectedLoanAmount',
    'ExpectedLoanAmount',
    'loanAmount',
    'LoanAmount',
    'amount',
    'Amount'
  );
  const loanPurpose = getValue(
    customer,
    'loanPurposeName',
    'LoanPurposeName',
    'loanPurpose',
    'LoanPurpose',
    'purposeOfLoan',
    'PurposeOfLoan'
  ) || '';
  const employmentType = getValue(
    customer,
    'employmentTypeName',
    'EmploymentTypeName',
    'employmentType',
    'EmploymentType'
  ) || '';
  const status = getValue(customer, 'status', 'Status') ?? 0;
  const agentId = getValue(customer, 'agentId', 'AgentId');
  const agentName = getValue(customer, 'agentName', 'AgentName') || '';
  const agentCode = getValue(customer, 'agentCode', 'AgentCode') || '';
  const rmId = getValue(customer, 'rmId', 'RmId', 'RMId');
  const rmName = getValue(
    customer,
    'rmName',
    'RmName',
    'RMName',
    'relationshipManagerName',
    'RelationshipManagerName',
    'relationshipManager',
    'RelationshipManager'
  ) || '';
  const districtId = getValue(customer, 'districtId', 'DistrictId');
  const districtName = getValue(customer, 'districtName', 'DistrictName', 'district', 'District') || '';
  const kycStatus = getValue(customer, 'kycStatus', 'KycStatus') || 'Verified';
  const createdByRole = getValue(customer, 'createdByRole', 'CreatedByRole', 'created_by_role');
  const createdByUserId = getValue(customer, 'createdByUserId', 'CreatedByUserId', 'created_by_user_id');
  const createdBy = getValue(customer, 'createdBy', 'CreatedBy', 'created_by');
  const createdAt = getValue(
    customer,
    'createdAt',
    'CreatedAt',
    'createdDate',
    'CreatedDate',
    'appliedDate',
    'AppliedDate'
  ) || '';

  const rawCustomerCode = getValue(
    customer,
    'customerCode',
    'CustomerCode',
    'customer_code'
  );
  const customerCode =
    rawCustomerCode != null && String(rawCustomerCode).trim() !== ''
      ? String(rawCustomerCode).trim()
      : 'N/A';

  const rawAppId = getValue(customer, 'appId', 'AppId', 'App_Id');
  const appId = rawAppId && typeof rawAppId === 'string' && rawAppId.trim() !== '' ? rawAppId.trim() : null;
  const idStr = agentCustomerId != null ? String(agentCustomerId) : '';

  return {
    id: idStr,
    agentCustomerId,
    customerCode,
    appId,
    applicationNo: appId || 'N/A',
    name,
    customerName: name,
    fullName: name,
    mobile: String(mobile).replace(/\D/g, '').slice(-10),
    email,
    expectedLoanAmount: expectedLoanAmount != null ? Number(expectedLoanAmount) : null,
    loanAmount: expectedLoanAmount != null ? Number(expectedLoanAmount) : null,
    amount: expectedLoanAmount != null ? Number(expectedLoanAmount) : null,
    loanPurpose,
    loanType: loanPurpose || 'Personal Loan',
    employmentType: employmentType || 'Salaried',
    status,
    kycStatus,
    agentId: agentId != null ? String(agentId) : null,
    agentName,
    agentCode,
    rmId: rmId != null ? String(rmId) : null,
    rmName,
    districtId: districtId != null ? String(districtId) : null,
    districtName,
    createdByRole,
    createdByUserId,
    createdBy,
    createdAt,
    appliedDate: createdAt ? String(createdAt).slice(0, 10) : '',
    raw: customer,
  };
}

/**
 * Maps raw backend Back Office Operator Profile record to standard frontend shape.
 *
 * @param {object} raw - Raw profile or login response object
 * @returns {object|null} Standardized Back Office profile
 */
export function mapBackOfficeProfile(raw, lookupData = {}) {
  if (!raw) return null;
  const source = raw.backOffice || raw.data || raw;

  const backOfficeId = getValue(
    source,
    'backOfficeId',
    'BackOfficeId',
    'id',
    'Id',
    'userId',
    'UserId'
  );

  const backOfficeCode = getValue(
    source,
    'backOfficeCode',
    'BackOfficeCode',
    'employeeCode',
    'EmployeeCode',
    'code',
    'Code'
  );

  const idStr = backOfficeId != null ? String(backOfficeId) : '';
  const employeeCode = backOfficeCode || 'Not Available';

  const fullName = getValue(
    source,
    'fullName',
    'FullName',
    'name',
    'Name',
    'userName',
    'UserName'
  ) || 'Not Available';

  const mobileNumber = getValue(
    source,
    'mobileNumber',
    'MobileNumber',
    'mobile',
    'Mobile',
    'phoneNumber',
    'PhoneNumber'
  ) || '';

  const emailAddress = getValue(
    source,
    'emailAddress',
    'EmailAddress',
    'email',
    'Email'
  ) || 'Not Available';

  const branch = getValue(
    source,
    'branch',
    'Branch',
    'branchName',
    'BranchName'
  ) || 'Not Available';

  const isActive = getValue(
    source,
    'isActive',
    'IsActive',
    'status',
    'Status'
  ) ?? true;

  const role = getValue(source, 'role', 'Role') || 'Operations Team';
  const department = getValue(source, 'department', 'Department') || 'Operations';
  const dateOfBirth = getValue(source, 'dateOfBirth', 'DateOfBirth', 'dob', 'DOB') || null;
  const dateJoined = getValue(source, 'dateJoined', 'DateJoined', 'createdAt', 'CreatedAt', 'joiningDate', 'JoiningDate') || null;
  const genderId = getValue(source, 'genderId', 'GenderId');
  const rawGenderName = getValue(source, 'genderName', 'GenderName', 'gender', 'Gender');
  const gender = rawGenderName || (genderId === 1 || genderId === 6 ? 'Male' : genderId === 2 || genderId === 7 ? 'Female' : genderId === 3 ? 'Other' : '');
  const address = getValue(source, 'address', 'Address') || '';
  const country = resolveLocation(source, {
    nameKeys: ['countryName', 'CountryName', 'country', 'Country'],
    idKeys: ['countryId', 'CountryId', 'country', 'Country'],
    collection: 'countries',
    itemIdKeys: ['countryId', 'CountryId', 'id', 'Id'],
    itemNameKeys: ['countryName', 'CountryName', 'name', 'Name'],
  }, lookupData);
  const state = resolveLocation(source, {
    nameKeys: ['stateName', 'StateName', 'state', 'State'],
    idKeys: ['stateId', 'StateId', 'state', 'State'],
    collection: 'states',
    itemIdKeys: ['stateId', 'StateId', 'id', 'Id'],
    itemNameKeys: ['stateName', 'StateName', 'name', 'Name'],
  }, lookupData);
  const district = resolveLocation(source, {
    nameKeys: ['districtName', 'DistrictName', 'district', 'District'],
    idKeys: ['districtId', 'DistrictId', 'district', 'District'],
    collection: 'districts',
    itemIdKeys: ['districtId', 'DistrictId', 'id', 'Id'],
    itemNameKeys: ['districtName', 'DistrictName', 'name', 'Name'],
  }, lookupData);
  const city = resolveLocation(source, {
    nameKeys: ['cityName', 'CityName', 'city', 'City'],
    idKeys: ['cityId', 'CityId', 'city', 'City'],
    collection: 'cities',
    itemIdKeys: ['cityId', 'CityId', 'id', 'Id'],
    itemNameKeys: ['cityName', 'CityName', 'name', 'Name'],
  }, lookupData);
  const rawPincode = getValue(source, 'pincode', 'Pincode', 'pinCode', 'PinCode', 'postalCode', 'PostalCode');
  const pincode = isPresent(rawPincode) && String(rawPincode).trim() !== '0' ? String(rawPincode).trim() : '';

  const profileImagePath = getValue(
    source,
    'profileImagePath',
    'ProfileImagePath',
    'profileImage',
    'ProfileImage',
    'profilePicturePath',
    'ProfilePicturePath'
  ) || '';
  const rawPermissions = getValue(source, 'permissions', 'Permissions', 'accessPermissions', 'AccessPermissions');
  const permissions = Array.isArray(rawPermissions)
    ? rawPermissions.map((permission) => (
      typeof permission === 'string'
        ? permission
        : permission?.name || permission?.label || permission?.permissionName || permission?.PermissionName || ''
    )).filter(Boolean)
    : [];

  return {
    id: idStr,
    backOfficeId,
    backOfficeCode: backOfficeCode || employeeCode,
    employeeCode,
    fullName,
    mobile: mobileNumber ? String(mobileNumber).replace(/\D/g, '').slice(-10) : 'Not Available',
    mobileNumber: mobileNumber ? String(mobileNumber).replace(/\D/g, '').slice(-10) : 'Not Available',
    email: emailAddress,
    emailAddress,
    branch,
    department,
    role,
    status: isActive ? 'Active' : 'Inactive',
    isActive: Boolean(isActive),
    dateOfBirth,
    dateJoined,
    gender,
    genderName: gender,
    address,
    countryId: country.id,
    countryName: country.name,
    stateId: state.id,
    stateName: state.name,
    districtId: district.id,
    districtName: district.name,
    cityId: city.id,
    cityName: city.name,
    pincode,
    profileImagePath,
    permissions,
    raw: source,
  };
}
