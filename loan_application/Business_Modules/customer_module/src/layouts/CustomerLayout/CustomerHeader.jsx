import React from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { useCustomerProfile } from '../../hooks/useCustomerProfile';
import { resolveApiUrl, normalizeUploadedFilePath } from '../../../../../Core/src/api/apiConfig';
import { useAuthedObjectUrl } from '../../../../../Core/src/auth/useAuthedObjectUrl';

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'CU';
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const upper = trimmed.toUpperCase();
  const consonants = upper.slice(1).replace(/[AEIOU\s]/gi, '');
  if (consonants.length > 0) {
    return upper[0] + consonants[0];
  }
  return upper.slice(0, 2);
}

export default function CustomerHeader() {
  const { profile, fallbackIdentity, loading } = useCustomerProfile();
  const customerData = profile || fallbackIdentity;
  const rawFullName = customerData?.fullName?.trim();
  const fullName = rawFullName || (loading ? 'Loading…' : 'Customer');
  const initials = getInitials(rawFullName || 'Customer');
  const profileImagePath =
    profile?.kyc?.profileImagePath ||
    profile?.profileImagePath ||
    fallbackIdentity?.profileImagePath ||
    fallbackIdentity?.profileImage;
  const imagePath = normalizeUploadedFilePath(profileImagePath);
  const imageUrl = imagePath
    ? resolveApiUrl(`/ApplicationKYCDocuments/download?path=${encodeURIComponent(imagePath)}`)
    : null;
  const authedImageUrl = useAuthedObjectUrl(imageUrl);

  return (
    <header className="customer-header">
      <div className="customer-header-title">
        <h2>Welcome back{rawFullName ? `, ${rawFullName}` : ''}! 👋</h2>
      </div>

      <div className="customer-header-actions">
        <button className="customer-notification-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="customer-notification-badge">3</span>
        </button>

        <div className="customer-profile-menu">
          <div className="customer-avatar">
            {authedImageUrl ? <img src={authedImageUrl} alt={fullName} /> : initials}
          </div>
          <span className="customer-profile-name">{fullName}</span>
          <ChevronDown size={16} color="var(--color-text-secondary)" />
        </div>
      </div>
    </header>
  );
}
