import { memo } from 'react';
import iconMap from '../../config/iconMap';
import './Header.css';

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

  const parts = (name || 'Investor').trim().split(' ');
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : parts[0][0];

  return (
    <div className="header-avatar-initials" aria-hidden="true">
      {initials.toUpperCase()}
    </div>
  );
}

const Header = memo(function Header({
  title = 'Investor Dashboard',
  subtitle = 'Welcome back! Overview of your investments and earnings.',
  date = '',
  notificationCount = 0,
  user = { name: 'Rajesh Kumar', role: 'Investor' },
  onMenuToggle,
  onNotificationsClick,
  onUserMenuClick,
}) {
  const MenuIcon = iconMap['Menu'];
  const BellIcon = iconMap['Bell'];
  const CalendarIcon = iconMap['Calendar'];
  const ChevronIcon = iconMap['ChevronDown'];

  const hasNotifications = notificationCount > 0;
  const displayCount = notificationCount > 99 ? '99+' : notificationCount;

  return (
    <header className="header" role="banner">
      <div className="header-left">
        {onMenuToggle && (
          <button
            type="button"
            className="header-menu-btn"
            onClick={onMenuToggle}
            aria-label="Toggle navigation menu"
          >
            {MenuIcon && <MenuIcon size={20} />}
          </button>
        )}
        <div className="header-title-group">
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="header-right">
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

        <button
          type="button"
          className="header-user-btn"
          onClick={onUserMenuClick}
          aria-label={`User menu for ${user.name}`}
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
