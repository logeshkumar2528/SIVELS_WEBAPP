import { memo, useState, useEffect } from 'react';
import iconMap from '../../config/iconMap';
import { getProfileImageUrl, getInitials } from '../../utils/profileImageHelper';
import './Header.css';

function UserAvatar({ name = '', role = 'RM', id = null, avatarUrl = null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());

  const resolvedId = id || (typeof localStorage !== 'undefined' ? localStorage.getItem('rmId') : null);
  const imageUrl = avatarUrl || (resolvedId ? getProfileImageUrl('RM', resolvedId, imageVersion) : null);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (!e.detail?.role || e.detail.role.toLowerCase().includes('rm') || e.detail.role.toLowerCase().includes('relationship')) {
        setImageVersion(e.detail?.timestamp || Date.now());
        setImageFailed(false);
      }
    };
    window.addEventListener('profile-image-updated', handleUpdate);
    return () => window.removeEventListener('profile-image-updated', handleUpdate);
  }, []);

  if (imageUrl && !imageFailed) {
    return (
      <img
        src={imageUrl}
        alt={`${name || 'RM'} avatar`}
        className="header-avatar-img"
        onError={() => setImageFailed(true)}
      />
    );
  }

  const initials = getInitials(name, 'RM');

  return (
    <div className="header-avatar-initials" aria-hidden="true">
      {initials}
    </div>
  );
}

const Header = memo(function Header({
  title = '',
  subtitle = '',
  date = '',
  notificationCount = 0,
  user = { name: 'Relationship Manager', role: 'Relationship Manager' },
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
            aria-label="Toggle Navigation Menu"
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
          aria-label={hasNotifications ? `${notificationCount} unread notifications` : 'Notifications'}
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
            <UserAvatar
              name={user.name}
              role="RM"
              id={user.id || user.rmId}
              avatarUrl={user.avatarUrl}
            />
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
