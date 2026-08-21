/**
 * Header
 * --------------------
 * Purpose:
 *   Top navigation bar for the Back Office module.
 *
 * Responsibilities:
 *   - Render the hamburger menu toggle (controls sidebar on mobile/tablet).
 *   - Display the current page title and subtitle.
 *   - Display a formatted date with calendar icon.
 *   - Render the notification bell with an unread count badge.
 *   - Render the user avatar, name, role, and a dropdown trigger.
 *   - Emit callbacks for all interactive actions — no internal business logic.
 *
 * Props:
 *   title               {string}   — Current page heading (e.g. "Back Office Dashboard")
 *   subtitle            {string}   — Page subheading (e.g. "Welcome back!...")
 *   date                {string}   — Formatted date string (e.g. "05 Jun 2025")
 *   notificationCount   {number}   — Unread notification count; 0 hides the badge
 *   user                {Object}   — { name: string, role: string, avatarUrl?: string }
 *   onMenuToggle        {Function} — () => void — opens/closes sidebar drawer
 *   onNotificationsClick{Function} — () => void — opens notification panel
 *   onUserMenuClick     {Function} — () => void — opens user dropdown menu
 *
 * Rules:
 *   - Fully reusable — works on every Back Office page without modification.
 *   - No hardcoded strings — everything comes through props.
 *   - No router hooks, no application state.
 *   - No Lucide imports — all icons resolved through iconMap.
 *   - No inline styles — all values via CSS variables in Header.css.
 */

import { memo } from 'react';
import iconMap from '../../config/iconMap';
import './Header.css';

/* ==========================================
   AVATAR — Renders initials when no image URL
========================================== */
function UserAvatar({ name, avatarUrl }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${name} avatar`}
        className="header-avatar-img"
      />
    );
  }

  /* Generate initials from name (first + last word) */
  const parts    = name.trim().split(' ');
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0][0];

  return (
    <div className="header-avatar-initials" aria-hidden="true">
      {initials.toUpperCase()}
    </div>
  );
}

/* ==========================================
   HEADER COMPONENT
========================================== */
const Header = memo(function Header({
  title               = '',
  subtitle            = '',
  date                = '',
  notificationCount   = 0,
  user                = { name: '', role: '' },
  onMenuToggle,
  onNotificationsClick,
  onUserMenuClick,
}) {
  const MenuIcon     = iconMap['Menu'];
  const BellIcon     = iconMap['Bell'];
  const CalendarIcon = iconMap['Calendar'];
  const ChevronIcon  = iconMap['ChevronDown'];

  const hasNotifications = notificationCount > 0;
  const displayCount     = notificationCount > 99 ? '99+' : notificationCount;

  return (
    <header className="header" role="banner">

      {/* ---- Left — Page title ---- */}
      <div className="header-left">

        <div className="header-title-group">
          <h1 className="header-title">{title}</h1>
          {subtitle && (
            <p className="header-subtitle">{subtitle}</p>
          )}
        </div>
      </div>

      {/* ---- Right — Date, Notifications, User ---- */}
      <div className="header-right">

        {/* Date display */}
        {date && (
          <div className="header-date" aria-label={`Today's date: ${date}`}>
            {CalendarIcon && (
              <span className="header-date-icon" aria-hidden="true">
                <CalendarIcon size={15} strokeWidth={1.8} />
              </span>
            )}
            <span className="header-date-text">{date}</span>
          </div>
        )}

        {/* Notification bell */}
        <button
          type="button"
          className="header-notif-btn"
          onClick={onNotificationsClick}
          aria-label={
            hasNotifications
              ? `${notificationCount} unread notifications`
              : 'Notifications'
          }
        >
          {BellIcon && <BellIcon size={20} strokeWidth={1.8} />}
          {hasNotifications && (
            <span className="header-notif-badge" aria-hidden="true">
              {displayCount}
            </span>
          )}
        </button>

        {/* User info + dropdown */}
        <button
          type="button"
          className="header-user-btn"
          onClick={onUserMenuClick}
          aria-label={`User menu for ${user.name}`}
          aria-haspopup="true"
        >
          <div className="header-avatar">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} />
          </div>

          <div className="header-user-info">
            <span className="header-user-name">{user.name}</span>
            <span className="header-user-role">{user.role}</span>
          </div>

          <span className="header-user-chevron" aria-hidden="true">
            {ChevronIcon && <ChevronIcon size={16} strokeWidth={2} />}
          </span>
        </button>

      </div>
    </header>
  );
});

export default Header;
