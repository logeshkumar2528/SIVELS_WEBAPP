import { apiFetch } from '../../../../../Core/src/api/apiFetch';
import { API_BASE_URL } from '../../../../../Core/src/api/apiConfig';
import { useEffect, useMemo, useState } from 'react';
import iconMap from '../../config/iconMap';
import { formatDate } from '../../utils/dateHelper';
import { getProfileImageUrl, getInitials } from '../../utils/profileImageHelper';
import './RmProfile.css';
import AuthImage from '../../../../../Core/src/auth/AuthImage';
import { masterService } from '../../../../../Core/src/services/masterService';

const API_BASE = API_BASE_URL;

const EMPTY_LOCATIONS = { countries: [], states: [], districts: [], cities: [] };

function unwrapLookup(response) {
  const value = response?.value ?? response?.data ?? response?.result ?? response;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;
  return [];
}

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isDisplayName(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && text !== '—' && text !== '0' && !/^\d+$/.test(text) && !/\bid\b/i.test(text);
}

function resolveLocation(record, config, locations) {
  const source = record || {};
  const name = config.nameKeys.map((key) => source[key]).find(isDisplayName);
  if (name !== undefined) return String(name).trim();

  const rawId = config.idKeys.map((key) => source[key]).find((value) => isPresent(value) && String(value).trim() !== '0');
  if (!isPresent(rawId)) return '—';

  const match = (locations?.[config.collection] || []).find((item) => {
    const itemId = config.itemIdKeys.map((key) => item?.[key]).find(isPresent);
    return itemId !== undefined && String(itemId).trim() === String(rawId).trim();
  });
  const resolved = match && config.itemNameKeys.map((key) => match?.[key]).find(isDisplayName);
  return resolved ? String(resolved).trim() : '—';
}

function resolvePincode(record) {
  const value = ['pincode', 'Pincode', 'pinCode', 'PinCode', 'postalCode', 'PostalCode']
    .map((key) => record?.[key])
    .find(isPresent);
  return isPresent(value) && String(value).trim() !== '0' ? String(value).trim() : '—';
}

function normalizePhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone || '—';
}

function ProfileSkeleton() {
  return (
    <div className="rm-profile-dashboard rm-profile-skeleton" aria-label="Loading profile">
      <div className="rm-profile-skeleton-hero" />
      <div className="rm-profile-skeleton-grid" />
    </div>
  );
}

export default function RmProfile() {
  const getCurrentUser = () => {
    try {
      const rmDataRaw = localStorage.getItem('rmData');
      if (rmDataRaw) {
        const parsed = JSON.parse(rmDataRaw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
      const raw = localStorage.getItem('sivels_currentUser');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [activeRmId, setActiveRmId] = useState(() => Number(currentUser?.rmId || currentUser?.RMId || localStorage.getItem('rmId')) || null);
  const [profileData, setProfileData] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [locations, setLocations] = useState(EMPTY_LOCATIONS);

  const UserIcon = iconMap['UserCircle'] || iconMap['User'];
  const MailIcon = iconMap['Mail'];
  const PhoneIcon = iconMap['Phone'];
  const BuildingIcon = iconMap['Building2'] || iconMap['Briefcase'];
  const BadgeIcon = iconMap['BadgeIndianRupee'] || iconMap['ShieldCheck'] || iconMap['Shield'];
  const ShieldIcon = iconMap['ShieldCheck'] || iconMap['Shield'];
  const RefreshIcon = iconMap['RefreshCw'] || iconMap['Clock'];
  const CheckIcon = iconMap['CheckCircle2'] || iconMap['Check'];
  const CalendarIcon = iconMap['Calendar'] || iconMap['Clock'];
  const MapPinIcon = iconMap['MapPin'];

  const imageUrl = useMemo(() => {
    return activeRmId ? getProfileImageUrl('RM', activeRmId) : null;
  }, [activeRmId]);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const fetchProfile = async (isActive = () => true) => {
    const isLive = typeof isActive === 'function' ? isActive : () => Boolean(isActive);

    setIsLoading(true);
    setLoadError('');

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const authHeaders = {};
      if (token) authHeaders['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE}/RMMaster`, { headers: authHeaders });
      if (!isLive()) return;

      if (!response.ok) {
        throw new Error(`Failed to load RM profile (${response.status})`);
      }

      const data = await response.json();
      if (!isLive()) return;

      const rows = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);
      const currentMobile = String(currentUser?.mobileNumber || currentUser?.phone || '').replace(/\D/g, '');
      const currentRmId = Number(currentUser?.rmId || currentUser?.RMId || localStorage.getItem('rmId') || 0);

      const match =
        (currentRmId > 0 && rows.find((row) => Number(row.rmId || row.RMId) === currentRmId)) ||
        (currentMobile && rows.find((row) => String(row.mobileNumber || '').replace(/\D/g, '') === currentMobile)) ||
        rows[0];

      if (isLive()) {
        if (match) {
          const resolvedId = Number(match.rmId || match.RMId || currentRmId) || null;
          setActiveRmId(resolvedId);
          setProfileData(match);
        } else {
          setProfileData(currentUser);
        }
      }
    } catch (error) {
      if (!isLive()) return;
      console.error('Failed to load RM profile:', error);
      setLoadError('Unable to load live RM profile. Showing available session values.');
      setProfileData(currentUser);
    } finally {
      if (isLive()) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let active = true;
    fetchProfile(() => active);
    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    const handleStorage = () => setCurrentUser(getCurrentUser());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      masterService.getCountries(),
      masterService.getStates(),
      masterService.getDistricts(),
      masterService.getCities(),
    ]).then(([countries, states, districts, cities]) => {
      if (!active) return;
      setLocations({
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

  if (isLoading && !profileData) {
    return <ProfileSkeleton />;
  }

  const showImage = Boolean(imageUrl && !imageFailed);

  const fullName =
    profileData?.fullName ||
    profileData?.FullName ||
    profileData?.name ||
    currentUser?.fullName ||
    'Relationship Manager';

  const rmCode =
    profileData?.rmCode ||
    profileData?.RmCode ||
    profileData?.RMCode ||
    profileData?.employeeCode ||
    currentUser?.rmCode ||
    currentUser?.RmCode ||
    '—';

  const role =
    profileData?.role ||
    profileData?.Role ||
    currentUser?.role ||
    'Relationship Manager';

  const branch =
    profileData?.branch ||
    profileData?.Branch ||
    profileData?.branchName ||
    currentUser?.branch ||
    '—';

  const department =
    profileData?.department ||
    profileData?.Department ||
    'Retail Banking & Loans';

  const mobileNumber = normalizePhone(
    profileData?.mobileNumber ||
    profileData?.MobileNumber ||
    currentUser?.mobileNumber ||
    currentUser?.phone
  );

  const emailAddress =
    profileData?.emailAddress ||
    profileData?.EmailAddress ||
    profileData?.email ||
    currentUser?.emailAddress ||
    currentUser?.email ||
    '—';

  const dateOfBirth = profileData?.dateOfBirth || currentUser?.dateOfBirth;
  const formattedDob = formatDate(dateOfBirth, '—');

  const rawDateJoined =
    profileData?.dateJoined ||
    profileData?.DateJoined ||
    profileData?.createdAt ||
    profileData?.CreatedAt ||
    currentUser?.dateJoined ||
    currentUser?.createdAt;
  const formattedDateJoined = formatDate(rawDateJoined, '—');

  const gender =
    profileData?.genderName ||
    profileData?.GenderName ||
    profileData?.gender ||
    profileData?.Gender ||
    currentUser?.genderName ||
    currentUser?.gender ||
    '—';

  const address =
    profileData?.address ||
    profileData?.Address ||
    currentUser?.address ||
    '—';

  const locationConfigs = {
    country: {
      nameKeys: ['countryName', 'CountryName', 'country', 'Country'],
      idKeys: ['countryId', 'CountryId', 'country', 'Country'],
      collection: 'countries',
      itemIdKeys: ['countryId', 'CountryId', 'id', 'Id'],
      itemNameKeys: ['countryName', 'CountryName', 'name', 'Name'],
    },
    state: {
      nameKeys: ['stateName', 'StateName', 'state', 'State'],
      idKeys: ['stateId', 'StateId', 'state', 'State'],
      collection: 'states',
      itemIdKeys: ['stateId', 'StateId', 'id', 'Id'],
      itemNameKeys: ['stateName', 'StateName', 'name', 'Name'],
    },
    district: {
      nameKeys: ['districtName', 'DistrictName', 'district', 'District'],
      idKeys: ['districtId', 'DistrictId', 'district', 'District'],
      collection: 'districts',
      itemIdKeys: ['districtId', 'DistrictId', 'id', 'Id'],
      itemNameKeys: ['districtName', 'DistrictName', 'name', 'Name'],
    },
    city: {
      nameKeys: ['cityName', 'CityName', 'city', 'City'],
      idKeys: ['cityId', 'CityId', 'city', 'City'],
      collection: 'cities',
      itemIdKeys: ['cityId', 'CityId', 'id', 'Id'],
      itemNameKeys: ['cityName', 'CityName', 'name', 'Name'],
    },
  };

  const countryName = resolveLocation(profileData, locationConfigs.country, locations);
  const stateName = resolveLocation(profileData, locationConfigs.state, locations);
  const districtName = resolveLocation(profileData, locationConfigs.district, locations);
  const cityName = resolveLocation(profileData, locationConfigs.city, locations);
  const pincode = resolvePincode(profileData);

  const isActive =
    profileData?.isActive ??
    profileData?.IsActive ??
    (profileData?.status ? String(profileData.status).toLowerCase() === 'active' : true);

  const statusClass = isActive ? 'is-active' : 'is-inactive';
  const statusLabel = isActive ? 'Active' : 'Inactive';

  return (
    <div className="rm-profile-dashboard">
      {loadError && (
        <div style={{ padding: '6px 12px', background: '#fef3c7', color: '#92400e', fontSize: '12px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #fde68a' }}>
          {loadError}
        </div>
      )}

      <div className="rm-profile-grid-layout">
        {/* LEFT — Dark-green employee identity panel */}
        <aside className="rm-identity-panel">
          <div className="rm-identity-avatar-wrap">
            {showImage ? (
              <AuthImage
                src={imageUrl}
                alt={fullName}
                className="rm-identity-avatar-img"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="rm-identity-initials">
                {getInitials(fullName, 'RM')}
              </span>
            )}
          </div>

          <h2 className="rm-identity-name">{fullName}</h2>

          <div className="rm-identity-code-badge">
            {BadgeIcon && <BadgeIcon size={13} />}
            <span>{rmCode}</span>
          </div>

          <p className="rm-identity-role">{role}</p>

          <div className={`rm-identity-status-pill ${statusClass}`}>
            <span className="rm-identity-status-dot" />
            <span>{statusLabel}</span>
          </div>

          <div className="rm-identity-divider" />

          <div className="rm-identity-meta-list">
            <div className="rm-identity-meta-item">
              {BuildingIcon && <BuildingIcon size={14} className="rm-identity-meta-icon" />}
              <div className="rm-identity-meta-content">
                <span className="rm-identity-meta-label">Branch</span>
                <span className="rm-identity-meta-value">{branch}</span>
              </div>
            </div>

            <div className="rm-identity-meta-item">
              {ShieldIcon && <ShieldIcon size={14} className="rm-identity-meta-icon" />}
              <div className="rm-identity-meta-content">
                <span className="rm-identity-meta-label">Department</span>
                <span className="rm-identity-meta-value">{department}</span>
              </div>
            </div>

            <div className="rm-identity-meta-item">
              {CalendarIcon && <CalendarIcon size={14} className="rm-identity-meta-icon" />}
              <div className="rm-identity-meta-content">
                <span className="rm-identity-meta-label">Member Since</span>
                <span className="rm-identity-meta-value">{formattedDateJoined}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — One unified sage-green information panel */}
        <main className="rm-sage-panel">
          {/* Section 1: Personal Information */}
          <section className="rm-sage-section">
            <div className="rm-sage-section-header">
              {UserIcon && <UserIcon size={14} className="rm-sage-section-icon" />}
              <h3>Personal Information</h3>
            </div>
            <div className="rm-sage-row rm-sage-row-alt-1">
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Full Name</span>
                <span className="rm-sage-value">{fullName}</span>
              </div>
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Date of Birth</span>
                <span className="rm-sage-value">{formattedDob}</span>
              </div>
            </div>
            <div className="rm-sage-row rm-sage-row-alt-2">
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Gender</span>
                <span className="rm-sage-value">{gender}</span>
              </div>
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Joining Date</span>
                <span className="rm-sage-value">{formattedDateJoined}</span>
              </div>
            </div>
          </section>

          {/* Section 2: Contact & Location */}
          <section className="rm-sage-section">
            <div className="rm-sage-section-header">
              {MapPinIcon && <MapPinIcon size={14} className="rm-sage-section-icon" />}
              <h3>Contact &amp; Location</h3>
            </div>
            <div className="rm-sage-row rm-sage-row-alt-1">
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Mobile Number</span>
                <span className="rm-sage-value">{mobileNumber}</span>
              </div>
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Email Address</span>
                <span className="rm-sage-value">{emailAddress}</span>
              </div>
            </div>
            <div className="rm-sage-row rm-sage-row-alt-2">
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Residential Address</span>
                <span className="rm-sage-value">{address}</span>
              </div>
            </div>
            <div className="rm-sage-row rm-sage-row-alt-1">
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Country</span>
                <span className="rm-sage-value">{countryName}</span>
              </div>
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">State</span>
                <span className="rm-sage-value">{stateName}</span>
              </div>
            </div>
            <div className="rm-sage-row rm-sage-row-alt-2">
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">District</span>
                <span className="rm-sage-value">{districtName}</span>
              </div>
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">City</span>
                <span className="rm-sage-value">{cityName}</span>
              </div>
            </div>
            <div className="rm-sage-row rm-sage-row-alt-1">
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Pincode</span>
                <span className="rm-sage-value">{pincode}</span>
              </div>
            </div>
          </section>

          {/* Section 3: Work Information */}
          <section className="rm-sage-section">
            <div className="rm-sage-section-header">
              {ShieldIcon && <ShieldIcon size={14} className="rm-sage-section-icon" />}
              <h3>Work Information</h3>
            </div>
            <div className="rm-sage-row rm-sage-row-alt-1">
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">RM Code</span>
                <span className="rm-sage-value">{rmCode}</span>
              </div>
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Role / Designation</span>
                <span className="rm-sage-value">{role}</span>
              </div>
            </div>
            <div className="rm-sage-row rm-sage-row-alt-2">
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Assigned Branch</span>
                <span className="rm-sage-value">{branch}</span>
              </div>
              <div className="rm-sage-field-item">
                <span className="rm-sage-label">Department</span>
                <span className="rm-sage-value">{department}</span>
              </div>
            </div>
            <div className="rm-sage-row rm-sage-row-alt-1">
              <div className="rm-sage-field-item rm-sage-col-full">
                <span className="rm-sage-label">Access Scope &amp; Responsibilities</span>
                <div className="rm-sage-permissions-wrap">
                  <span className="rm-sage-perm-tag">
                    {CheckIcon && <CheckIcon size={12} />} Customer onboarding &amp; loan sourcing
                  </span>
                  <span className="rm-sage-perm-tag">
                    {CheckIcon && <CheckIcon size={12} />} KYC collection &amp; initial verification
                  </span>
                  <span className="rm-sage-perm-tag">
                    {CheckIcon && <CheckIcon size={12} />} Submission to Back Office &amp; status tracking
                  </span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
