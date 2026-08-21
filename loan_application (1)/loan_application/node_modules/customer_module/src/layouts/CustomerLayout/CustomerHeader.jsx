import React from 'react';
import { Bell, ChevronDown } from 'lucide-react';

export default function CustomerHeader() {
  return (
    <header className="customer-header">
      <div className="customer-header-title">
        <h2>Welcome back, Arjun Kumar! 👋</h2>
        <p>Here's what's happening with your loan account today.</p>
      </div>

      <div className="customer-header-actions">
        <button className="customer-notification-btn">
          <Bell size={20} />
          <span className="customer-notification-badge">3</span>
        </button>

        <div className="customer-profile-menu">
          <div className="customer-avatar">AK</div>
          <span className="customer-profile-name">Arjun Kumar</span>
          <ChevronDown size={16} color="var(--color-text-secondary)" />
        </div>
      </div>
    </header>
  );
}
