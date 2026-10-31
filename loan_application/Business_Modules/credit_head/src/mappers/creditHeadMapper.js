/**
 * creditHeadMapper.js
 * --------------------
 * Normalizes raw backend records from `CreditHeadMaster` into Credit Head UI structures.
 */

function getValue(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) {
      return obj[k];
    }
  }
  return undefined;
}

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
  if (name !== undefined) return { id: rawId ?? null, name: String(name).trim() };

  const match = rawId == null
    ? null
    : (lookupData?.[config.collection] || []).find((item) => {
      const itemId = config.itemIdKeys.map((key) => item?.[key]).find(isPresent);
      return itemId !== undefined && String(itemId).trim() === String(rawId).trim();
    });
  const resolvedName = match && config.itemNameKeys.map((key) => match?.[key]).find(isDisplayName);
  return { id: rawId ?? null, name: resolvedName ? String(resolvedName).trim() : '' };
}

export function mapCreditHeadProfile(raw, lookupData = {}) {
  if (!raw) return null;
  const source = raw.creditHead || raw.data || raw;

  const creditHeadId = getValue(source, 'creditHeadId', 'CreditHeadId', 'id', 'Id');
  const creditHeadCode = getValue(
    source,
    'creditHeadCode',
    'CreditHeadCode',
    'employeeCode',
    'EmployeeCode',
    'code',
    'Code'
  ) || '—';

  const fullName = getValue(source, 'fullName', 'FullName', 'name', 'Name', 'userName', 'UserName') || '—';
  const rawMobile = getValue(source, 'mobileNumber', 'MobileNumber', 'mobile', 'Mobile', 'phoneNumber', 'PhoneNumber') || '';
  const mobileNumber = rawMobile ? String(rawMobile).replace(/\D/g, '').slice(-10) : '—';
  const emailAddress = getValue(source, 'emailAddress', 'EmailAddress', 'email', 'Email') || '—';
  const branch = getValue(source, 'branch', 'Branch', 'branchName', 'BranchName') || '—';
  const isActive = getValue(source, 'isActive', 'IsActive', 'status', 'Status') ?? true;
  const department = getValue(source, 'department', 'Department') || 'Credit & Risk Leadership';
  const dateOfBirth = getValue(source, 'dateOfBirth', 'DateOfBirth', 'dob', 'DOB') || null;
  const dateJoined = getValue(source, 'dateJoined', 'DateJoined', 'createdAt', 'CreatedAt', 'joiningDate', 'JoiningDate') || null;

  // Gender resolution
  const genderId = getValue(source, 'genderId', 'GenderId');
  const rawGenderName = getValue(source, 'genderName', 'GenderName', 'gender', 'Gender');
  let gender = rawGenderName || '';
  if (!gender && genderId) {
    if (lookupData.genders && Array.isArray(lookupData.genders)) {
      const match = lookupData.genders.find(g => Number(g.genderId || g.id) === Number(genderId));
      if (match) gender = match.genderName || match.name || '';
    }
  }
  if (!gender && genderId) {
    gender = (genderId === 1 || genderId === 6) ? 'Male' : (genderId === 2 || genderId === 7) ? 'Female' : 'Other';
  }

  // Address and Locations
  const address = getValue(source, 'address', 'Address') || '—';
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

  // Banking
  const accountNumber = getValue(source, 'accountNumber', 'AccountNumber') || '—';
  const ifscCode = getValue(source, 'ifscCode', 'IfscCode', 'IFSCCode') || '—';

  return {
    id: creditHeadId != null ? String(creditHeadId) : '',
    creditHeadId,
    creditHeadCode,
    fullName,
    mobileNumber,
    emailAddress,
    branch,
    department,
    role: 'Credit Head',
    status: isActive ? 'Active' : 'Inactive',
    isActive: Boolean(isActive),
    dateOfBirth,
    dateJoined,
    genderId,
    gender: gender || '—',
    genderName: gender || '—',
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
    accountNumber,
    ifscCode,
    raw: source,
  };
}
