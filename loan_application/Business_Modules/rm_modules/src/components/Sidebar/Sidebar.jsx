import { memo, useState } from 'react';
import iconMap from '../../config/iconMap';
import logoImg from '../../../../../Core/Logo_img/Logo.png';
import Modal from '../Modal/Modal';
import './Sidebar.css';

const BADGE_CLASS_MAP = {
  newApplications: 'sidebar-badge--new',
  verification: 'sidebar-badge--review',
  returned: 'sidebar-badge--return',
  approved: 'sidebar-badge--approved',
  customerSubmissionHistory: 'sidebar-badge--pending',
  submissionHistory: 'sidebar-badge--pending',
  myAgents: 'sidebar-badge--pending',
};

const BOTTOM_SECTION = 'BOTTOM';

const NavItem = memo(function NavItem({ item, isActive, badgeCount, onNavigate, onLogoutClick }) {
  const Icon = iconMap[item.icon];
  const badgeClass = BADGE_CLASS_MAP[item.badgeKey] ?? '';

  function handleClick(e) {
    e.preventDefault();
    if (item.id === 'logout') {
      if (onLogoutClick) {
        onLogoutClick();
      }
      return;
    }
    onNavigate(item.route);
  }

  return (
    <a
      href={item.route}
      onClick={handleClick}
      className={['sidebar-nav-item', isActive ? 'sidebar-nav-item--active' : ''].join(' ').trim()}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="sidebar-nav-icon" aria-hidden="true">
        {Icon && <Icon size={18} strokeWidth={1.8} />}
      </span>

      <span className="sidebar-nav-label">{item.label}</span>

      {badgeCount != null && badgeCount > 0 && (
        <span className={`sidebar-badge ${badgeClass}`} role="status">
          {badgeCount}
        </span>
      )}
    </a>
  );
});

function NavSection({ sectionTitle, items, activeRoute, badgeCounts, onNavigate, onLogoutClick }) {
  return (
    <div className="sidebar-section">
      {sectionTitle && (
        <p className="sidebar-section-title" aria-hidden="true">
          {sectionTitle}
        </p>
      )}
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

function Sidebar({ menu = [], activeRoute = '', badgeCounts = {}, isOpen = false, onNavigate, onClose }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const mainItems = menu.filter((item) => item.section !== BOTTOM_SECTION);
  const bottomItems = menu.filter((item) => item.section === BOTTOM_SECTION);
  const sectionKeys = [...new Set(mainItems.map((item) => item.section))];

  const SupportIcon = iconMap['Headphones'];

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('sivels_currentUser');
    localStorage.removeItem('sivels_permissions');
    localStorage.removeItem('sivels_roles');
    localStorage.removeItem('rmData');
    localStorage.removeItem('rmId');
    window.location.href = '/login';
  };

  return (
    <>
      {isOpen && (
        <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={['sidebar', isOpen ? 'sidebar--open' : ''].join(' ').trim()} aria-label="Main navigation">
        <div className="sidebar-logo" aria-label="Sivels Finance RM Portal">
          <img src={logoImg} alt="Sivels Finance Logo" className="sidebar-logo-img" />
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-brand">SIVELS</span>
            <span className="sidebar-logo-sub">FINANCE</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="RM Application navigation">
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
              <span className="sidebar-support-label">Need RM Support?</span>
              <a href="mailto:rmhelp@sivelsfinance.com" className="sidebar-support-link">
                Contact Helpdesk
              </a>
            </div>
          </div>
        </div>
      </aside>

      {showLogoutModal && (
        <Modal
          show={showLogoutModal}
          onHide={() => setShowLogoutModal(false)}
          title="Confirm Logout"
          size="sm"
        >
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ margin: '0 0 1.25rem 0', color: '#475569', fontSize: '0.95rem' }}>
              Are you sure you want to logout?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
                onClick={handleConfirmLogout}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default Sidebar;
