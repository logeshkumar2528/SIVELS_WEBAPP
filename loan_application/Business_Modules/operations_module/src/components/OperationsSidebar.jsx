import { memo, useState } from 'react';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import logoImg from '../../../../Core/src/assets/branding/Logo.png';
import { logout } from '../../../../Core/src/auth/session';

const BOTTOM_SECTION = 'BOTTOM';

const NavItem = memo(function NavItem({ item, isActive, badgeCount, onNavigate, onLogoutClick }) {
  const Icon = iconMap[item.icon];
  const showBadge = item.badgeKey != null
    && badgeCount != null
    && (badgeCount > 0 || item.showZeroBadge);

  const handleClick = (event) => {
    event.preventDefault();
    if (item.id === 'logout') {
      onLogoutClick?.();
      return;
    }
    onNavigate(item.route);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (item.id === 'logout') {
      onLogoutClick?.();
      return;
    }
    onNavigate(item.route);
  };

  return (
    <a
      href={item.route}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={['sidebar-nav-item', isActive ? 'sidebar-nav-item--active' : ''].join(' ').trim()}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="sidebar-nav-icon" aria-hidden="true">
        {Icon && <Icon size={17} strokeWidth={1.8} />}
      </span>
      <span className="sidebar-nav-label">{item.label}</span>
      {showBadge && (
        <span
          className="sidebar-badge sidebar-badge--pending"
          aria-label={`${badgeCount} items`}
          role="status"
        >
          {badgeCount}
        </span>
      )}
    </a>
  );
});

function NavSection({ sectionTitle, items, activeRoute, badgeCounts, onNavigate, onLogoutClick }) {
  return (
    <div className="sidebar-section">
      {sectionTitle && <p className="sidebar-section-title" aria-hidden="true">{sectionTitle}</p>}
      <ul className="sidebar-nav-list" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <NavItem
              item={item}
              isActive={activeRoute === item.route}
              badgeCount={item.badgeKey != null ? (badgeCounts[item.badgeKey] ?? null) : null}
              onNavigate={onNavigate}
              onLogoutClick={onLogoutClick}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OperationsSidebar({
  menu = [],
  activeRoute = '',
  badgeCounts = {},
  isOpen = false,
  onNavigate,
  onClose,
  onLogout,
}) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const mainItems = menu.filter((item) => item.section !== BOTTOM_SECTION);
  const bottomItems = menu.filter((item) => item.section === BOTTOM_SECTION);
  const sectionKeys = [...new Set(mainItems.map((item) => item.section))];
  const SupportIcon = iconMap.Headphones;
  const LogOutIcon = iconMap.LogOut;

  const confirmLogout = () => {
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
      return;
    }
    logout();
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className={['sidebar', isOpen ? 'sidebar--open' : ''].join(' ').trim()} aria-label="Main navigation">
        <div className="sidebar-logo" aria-label="Sivels Finance home">
          <img src={logoImg} alt="Sivels Finance Logo" className="sidebar-logo-img" />
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-brand">SIVELS</span>
            <span className="sidebar-logo-sub">FINANCE</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Application navigation">
          {sectionKeys.map((key) => (
            <NavSection
              key={key ?? '__top__'}
              sectionTitle={key}
              items={mainItems.filter((item) => item.section === key)}
              activeRoute={activeRoute}
              badgeCounts={badgeCounts}
              onNavigate={onNavigate}
              onLogoutClick={() => setShowLogoutModal(true)}
            />
          ))}
        </nav>

        <div className="sidebar-bottom">
          <ul className="sidebar-nav-list" role="list">
            {bottomItems.map((item) => (
              <li key={item.id}>
                <NavItem
                  item={item}
                  isActive={activeRoute === item.route}
                  badgeCount={null}
                  onNavigate={onNavigate}
                  onLogoutClick={() => setShowLogoutModal(true)}
                />
              </li>
            ))}
          </ul>
          <div className="sidebar-support" role="complementary" aria-label="Support">
            <div className="sidebar-support-icon" aria-hidden="true">
              {SupportIcon && <SupportIcon size={18} strokeWidth={1.8} />}
            </div>
            <div className="sidebar-support-text">
              <span className="sidebar-support-label">Need Help?</span>
              <a href="mailto:support@sivelsfinance.com" className="sidebar-support-link" aria-label="Contact support via email">
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </aside>

      {showLogoutModal && (
        <div
          className="operations-logout-modal-backdrop"
          onClick={() => setShowLogoutModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="operations-logout-title"
        >
          <div className="operations-logout-modal" onClick={(event) => event.stopPropagation()}>
            <div className="operations-logout-modal-heading">
              <div className="operations-logout-modal-icon" aria-hidden="true">
                {LogOutIcon && <LogOutIcon size={20} />}
              </div>
              <h3 id="operations-logout-title">Confirm Logout</h3>
            </div>
            <p>Are you sure you want to logout?</p>
            <div className="operations-logout-modal-actions">
              <button type="button" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button type="button" onClick={confirmLogout}>Yes, Logout</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
