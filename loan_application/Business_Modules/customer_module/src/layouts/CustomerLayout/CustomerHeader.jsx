import React from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { useCustomerIdentity } from '../../hooks/useCustomerIdentity';

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'AK';
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
  const { customerData } = useCustomerIdentity();
  const fullName = customerData?.fullName?.trim() || 'Arjun Kumar';
  const initials = getInitials(fullName);

  return (
    <header className="customer-header">
      <div className="customer-header-title">
        <h2>Welcome back, {fullName}! 👋</h2>
        <p>Here's what's happening with your loan account today.</p>
      </div>

      <div className="customer-header-actions">
        <button className="customer-notification-btn">
          <Bell size={20} />
          <span className="customer-notification-badge">3</span>
        </button>

        <div className="customer-profile-menu">
          <div className="customer-avatar">{initials}</div>
          <span className="customer-profile-name">{fullName}</span>
          <ChevronDown size={16} color="var(--color-text-secondary)" />
        </div>
      </div>
    </header>
  );
}
