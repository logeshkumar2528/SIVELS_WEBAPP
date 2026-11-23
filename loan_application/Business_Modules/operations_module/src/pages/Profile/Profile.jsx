import { useEffect, useMemo, useState } from 'react';
import {
  BadgeIndianRupee,
  Building2,
  Calendar,
  MapPin,
  Shield,
  User,
} from 'lucide-react';
import AuthImage from '../../../../../Core/src/auth/AuthImage';
import { API_BASE_URL } from '../../../../../Core/src/api/apiConfig';
import { formatDate } from '../../../../../Core/src/utils/dateHelper';
import { getInitials } from '../../../../../Core/src/utils/profileImageHelper';
import { masterService } from '../../../../../Core/src/services/masterService';
import useOperationsProfile from '../../hooks/useOperationsProfile';
import OperationsLayout from '../../layouts/OperationsLayout';

const EMPTY_LOCATIONS = {
  genders: [],
  countries: [],
  states: [],
  districts: [],
  cities: [],
};

function readValue(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function unwrapLookup(response) {
  const value = response?.value ?? response?.data ?? response?.result ?? response;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;
  return [];
}

function resolveLookupValue(profile, locations, config) {
  const directValue = readValue(profile, ...config.nameKeys);
  if (directValue !== null && !/^\d+$/.test(String(directValue).trim())) {
    return String(directValue).trim();
  }

  const rawId = readValue(profile, ...config.idKeys);
  if (rawId === null) return '—';

  const match = (locations[config.collection] || []).find((item) => {
    const itemId = readValue(item, ...config.itemIdKeys);
    return itemId !== null && String(itemId).trim() === String(rawId).trim();
  });
  const resolvedName = match && readValue(match, ...config.itemNameKeys);
  return resolvedName === null ? '—' : String(resolvedName).trim();
}

function resolveStatus(profile) {
  const rawValue = readValue(profile, 'isActive', 'IsActive', 'activeStatus', 'ActiveStatus', 'status');
  if (rawValue === null) return null;
  if (typeof rawValue === 'boolean') return rawValue;
  if (typeof rawValue === 'number') return rawValue !== 0;

  const value = String(rawValue).trim().toLowerCase();
  if (['active', 'true', '1', 'enabled'].includes(value)) return true;
  if (['inactive', 'false', '0', 'disabled', 'deactivated'].includes(value)) return false;
  return null;
}

function errorMessage(error) {
  const status = error?.response?.status;
  if (status === 403) return 'You do not have permission to view this profile.';
  if (status === 404) return 'The Operations profile is not available.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  return 'The Operations profile could not be loaded right now.';
}

export default function Profile() {
  const { profile, loading, error, reload } = useOperationsProfile();
  const [locations, setLocations] = useState(EMPTY_LOCATIONS);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      masterService.getGenders(),
      masterService.getCountries(),
      masterService.getStates(),
      masterService.getDistricts(),
      masterService.getCities(),
    ]).then(([genders, countries, states, districts, cities]) => {
      if (!active) return;
      setLocations({
        genders: genders.status === 'fulfilled' ? unwrapLookup(genders.value) : [],
        countries: countries.status === 'fulfilled' ? unwrapLookup(countries.value) : [],
        states: states.status === 'fulfilled' ? unwrapLookup(states.value) : [],
        districts: districts.status === 'fulfilled' ? unwrapLookup(districts.value) : [],
        cities: cities.status === 'fulfilled' ? unwrapLookup(cities.value) : [],
      });
    });

    return () => {
      active = false;
    };
  }, []);

  const operationsUserId = readValue(profile, 'operationsUserId', 'OperationsUserId', 'id', 'Id');
  const profileImageUrl = useMemo(() => {
    if (!API_BASE_URL || operationsUserId === null) return null;
    return `${API_BASE_URL}/OperationsUsers/${encodeURIComponent(String(operationsUserId))}/profile-image`;
  }, [operationsUserId]);

  useEffect(() => {
    setImageFailed(false);
  }, [profileImageUrl]);

  const fullName = readValue(profile, 'fullName', 'FullName', 'name', 'Name', 'displayName') || '—';
  const employeeCode = readValue(profile, 'employeeCode', 'EmployeeCode', 'staffCode', 'StaffCode') || '—';
  const roleCode = String(readValue(profile, 'roleCode', 'RoleCode') || '').trim().toUpperCase();
  const role = readValue(profile, 'roleName', 'RoleName', 'role', 'Role')
    || (roleCode === 'MAKER' ? 'Operations Maker' : roleCode === 'CHECKER' ? 'Operations Checker' : '—');
  const branch = readValue(profile, 'branch', 'Branch', 'branchName', 'BranchName') || '—';
  const mobileNumber = readValue(profile, 'mobileNumber', 'MobileNumber', 'phoneNumber', 'PhoneNumber', 'mobile') || '—';
  const emailAddress = readValue(profile, 'emailAddress', 'EmailAddress', 'email', 'Email') || '—';
  const dateOfBirth = formatDate(readValue(profile, 'dateOfBirth', 'DateOfBirth'), '—');
  const dateJoined = formatDate(readValue(profile, 'dateJoined', 'DateJoined'), '—');
  const address = readValue(profile, 'address', 'Address') || '—';
  const pincode = readValue(profile, 'pincode', 'Pincode') || '—';
  const isActive = resolveStatus(profile);
  const statusClass = isActive === true ? 'is-active' : isActive === false ? 'is-inactive' : 'is-unknown';
  const statusLabel = isActive === true ? 'Active' : isActive === false ? 'Inactive' : '—';
  const initials = getInitials(fullName === '—' ? '' : fullName, 'OU');

  const gender = resolveLookupValue(profile, locations, {
    collection: 'genders',
    idKeys: ['genderId', 'GenderId'],
    nameKeys: ['genderName', 'GenderName', 'gender', 'Gender'],
    itemIdKeys: ['genderId', 'GenderId', 'id', 'Id'],
    itemNameKeys: ['genderName', 'GenderName', 'name', 'Name', 'description', 'Description'],
  });
  const country = resolveLookupValue(profile, locations, {
    collection: 'countries',
    idKeys: ['countryId', 'CountryId'],
    nameKeys: ['countryName', 'CountryName', 'country', 'Country'],
    itemIdKeys: ['countryId', 'CountryId', 'id', 'Id'],
    itemNameKeys: ['countryName', 'CountryName', 'name', 'Name'],
  });
  const state = resolveLookupValue(profile, locations, {
    collection: 'states',
    idKeys: ['stateId', 'StateId'],
    nameKeys: ['stateName', 'StateName', 'state', 'State'],
    itemIdKeys: ['stateId', 'StateId', 'id', 'Id'],
    itemNameKeys: ['stateName', 'StateName', 'name', 'Name'],
  });
  const district = resolveLookupValue(profile, locations, {
    collection: 'districts',
    idKeys: ['districtId', 'DistrictId'],
    nameKeys: ['districtName', 'DistrictName', 'district', 'District'],
    itemIdKeys: ['districtId', 'DistrictId', 'id', 'Id'],
    itemNameKeys: ['districtName', 'DistrictName', 'name', 'Name'],
  });
  const city = resolveLookupValue(profile, locations, {
    collection: 'cities',
    idKeys: ['cityId', 'CityId'],
    nameKeys: ['cityName', 'CityName', 'city', 'City'],
    itemIdKeys: ['cityId', 'CityId', 'id', 'Id'],
    itemNameKeys: ['cityName', 'CityName', 'name', 'Name'],
  });

  if (loading) {
    return (
      <OperationsLayout title="My Profile" subtitle="Your Operations account" profile={profile}>
        <div className="operations-state-card" role="status">Loading your profile…</div>
      </OperationsLayout>
    );
  }

  if (error) {
    return (
      <OperationsLayout title="My Profile" subtitle="Your Operations account" profile={profile}>
        <div className="operations-state-card operations-state-card--error" role="alert">
          <p>{errorMessage(error)}</p>
          <button type="button" className="operations-secondary-button" onClick={reload}>
            Try again
          </button>
        </div>
      </OperationsLayout>
    );
  }

  return (
    <OperationsLayout title="My Profile" subtitle="Your Operations account" profile={profile}>
      <div className="operations-profile-page">
        <div className="operations-profile-grid-layout">
          <aside className="operations-identity-panel">
            <div className="operations-identity-avatar-wrap">
              {profileImageUrl && !imageFailed ? (
                <AuthImage
                  src={profileImageUrl}
                  alt={fullName}
                  className="operations-identity-avatar-img"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <span className="operations-identity-initials">{initials}</span>
              )}
            </div>

            <h2 className="operations-identity-name">{fullName}</h2>

            <div className="operations-identity-code-badge">
              <BadgeIndianRupee size={13} />
              <span>{employeeCode}</span>
            </div>

            <p className="operations-identity-role">{role}</p>

            <div className={`operations-identity-status-pill ${statusClass}`}>
              <span className="operations-identity-status-dot" />
              <span>{statusLabel}</span>
            </div>

            <div className="operations-identity-divider" />

            <div className="operations-identity-meta-list">
              <div className="operations-identity-meta-item">
                <Building2 size={14} className="operations-identity-meta-icon" />
                <div className="operations-identity-meta-content">
                  <span className="operations-identity-meta-label">Branch</span>
                  <span className="operations-identity-meta-value">{branch}</span>
                </div>
              </div>

              <div className="operations-identity-meta-item">
                <Shield size={14} className="operations-identity-meta-icon" />
                <div className="operations-identity-meta-content">
                  <span className="operations-identity-meta-label">Department</span>
                  <span className="operations-identity-meta-value">—</span>
                </div>
              </div>

              <div className="operations-identity-meta-item">
                <Calendar size={14} className="operations-identity-meta-icon" />
                <div className="operations-identity-meta-content">
                  <span className="operations-identity-meta-label">Member Since</span>
                  <span className="operations-identity-meta-value">{dateJoined}</span>
                </div>
              </div>
            </div>
          </aside>

          <main className="operations-sage-panel">
            <section className="operations-sage-section">
              <div className="operations-sage-section-header">
                <User size={14} className="operations-sage-section-icon" />
                <h3>Personal Information</h3>
              </div>
              <div className="operations-sage-row operations-sage-row-alt-1">
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">Full Name</span>
                  <span className="operations-sage-value">{fullName}</span>
                </div>
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">Date of Birth</span>
                  <span className="operations-sage-value">{dateOfBirth}</span>
                </div>
              </div>
              <div className="operations-sage-row operations-sage-row-alt-2">
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">Gender</span>
                  <span className="operations-sage-value">{gender}</span>
                </div>
              </div>
            </section>

            <section className="operations-sage-section">
              <div className="operations-sage-section-header">
                <MapPin size={14} className="operations-sage-section-icon" />
                <h3>Contact &amp; Location</h3>
              </div>
              <div className="operations-sage-row operations-sage-row-alt-1">
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">Mobile Number</span>
                  <span className="operations-sage-value">{mobileNumber}</span>
                </div>
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">Email Address</span>
                  <span className="operations-sage-value">{emailAddress}</span>
                </div>
              </div>
              <div className="operations-sage-row operations-sage-row-alt-2">
                <div className="operations-sage-field-item operations-sage-col-full">
                  <span className="operations-sage-label">Residential Address</span>
                  <span className="operations-sage-value">{address}</span>
                </div>
              </div>
              <div className="operations-sage-row operations-sage-row-alt-1">
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">Country</span>
                  <span className="operations-sage-value">{country}</span>
                </div>
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">State</span>
                  <span className="operations-sage-value">{state}</span>
                </div>
              </div>
              <div className="operations-sage-row operations-sage-row-alt-2">
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">District</span>
                  <span className="operations-sage-value">{district}</span>
                </div>
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">City</span>
                  <span className="operations-sage-value">{city}</span>
                </div>
              </div>
              <div className="operations-sage-row operations-sage-row-alt-1">
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">Pincode</span>
                  <span className="operations-sage-value">{pincode}</span>
                </div>
              </div>
            </section>

            <section className="operations-sage-section">
              <div className="operations-sage-section-header">
                <Shield size={14} className="operations-sage-section-icon" />
                <h3>Work Information</h3>
              </div>
              <div className="operations-sage-row operations-sage-row-alt-1">
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">Employee Code</span>
                  <span className="operations-sage-value">{employeeCode}</span>
                </div>
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">Role / Designation</span>
                  <span className="operations-sage-value">{role}</span>
                </div>
              </div>
              <div className="operations-sage-row operations-sage-row-alt-2">
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">Assigned Branch</span>
                  <span className="operations-sage-value">{branch}</span>
                </div>
                <div className="operations-sage-field-item">
                  <span className="operations-sage-label">Department</span>
                  <span className="operations-sage-value">—</span>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </OperationsLayout>
  );
}
