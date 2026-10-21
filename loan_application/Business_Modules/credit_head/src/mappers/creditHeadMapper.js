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
  const stateId = getValue(source, 'stateId', 'StateId');
  const districtId = getValue(source, 'districtId', 'DistrictId');
  const cityId = getValue(source, 'cityId', 'CityId');

  let stateName = getValue(source, 'stateName', 'StateName', 'state', 'State') || '';
  if (!stateName && stateId && lookupData.states) {
    const match = lookupData.states.find(s => Number(s.stateId || s.id) === Number(stateId));
    if (match) stateName = match.stateName || match.name || '';
  }

  let districtName = getValue(source, 'districtName', 'DistrictName', 'district', 'District') || '';
  if (!districtName && districtId && lookupData.districts) {
    const match = lookupData.districts.find(d => Number(d.districtId || d.id) === Number(districtId));
    if (match) districtName = match.districtName || match.name || '';
  }

  let cityName = getValue(source, 'cityName', 'CityName', 'city', 'City') || '';
  if (!cityName && cityId && lookupData.cities) {
    const match = lookupData.cities.find(c => Number(c.cityId || c.id) === Number(cityId));
    if (match) cityName = match.cityName || match.name || '';
  }

  const pincode = getValue(source, 'pincode', 'Pincode') || '—';

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
    stateId,
    stateName,
    districtId,
    districtName,
    cityId,
    cityName,
    pincode,
    accountNumber,
    ifscCode,
    raw: source,
  };
}
