/**
 * Sidebar
 * --------------------
 * Purpose:
 *   Main navigation sidebar for the Back Office module.
 *
 * Responsibilities:
 *   - Render all navigation items received via `menu` prop.
 *   - Group items by their `section` property into labelled sections.
 *   - Render bottom-pinned items (section === 'BOTTOM') separately.
 *   - Resolve icon names to Lucide components via the centralised iconMap.
 *   - Display live badge counts from `badgeCounts` prop.
 *   - Mark the active route using `activeRoute` prop and aria-current.
 *   - Call `onNavigate(route)` when a nav item is clicked.
 *   - Call `onClose()` on mobile overlay backdrop click.
 *
 * Props:
 *   menu         {NavItem[]} — Flat array of all navigation items from navConfig
 *   activeRoute  {string}    — Current route path (from useLocation in parent)
 *   badgeCounts  {Object}    — Live counts keyed by NavItem.badgeKey
 *   isOpen       {boolean}   — Controls mobile off-canvas visibility
 *   onNavigate   {Function}  — (route: string) => void — handles routing
 *   onClose      {Function}  — () => void — closes mobile drawer
 *
 * Rules:
 *   - This component is purely presentational — no router hooks, no state.
 *   - Never import navConfig.js here — data comes through props only.
 *   - Never import Lucide icons directly — use iconMap exclusively.
 *   - No inline styles — all values via CSS variables in Sidebar.css.
 */

import { memo, useState } from 'react';
import iconMap from '../../config/iconMap';
import logoImg from '../../../../../../Core/Logo_img/Logo.png';
import { removeBackOfficeAuth } from '../../auth/authStorage';
import './Sidebar.css';

/* ==========================================
   BADGE COLOR MAP
   Maps a badgeKey → CSS modifier class.
   Matches badge types defined in navConfig.js.
========================================== */
const BADGE_CLASS_MAP = {
  districtOverview:   'sidebar-badge--pending',
  rmMonitoring:       'sidebar-badge--pending',
  agentMonitoring:    'sidebar-badge--pending',
  customerMonitoring: 'sidebar-badge--review',
  submitToCredit:     'sidebar-badge--approved',
  newApplications:    'sidebar-badge--new',
  verification:       'sidebar-badge--review',
  fieldInvest:        'sidebar-badge--pending',
  underwriting:       'sidebar-badge--underwriting',
  approved:           'sidebar-badge--approved',
  rejected:           'sidebar-badge--return',
};

/* ==========================================
   SECTION SENTINEL — identifies bottom items
========================================== */
const BOTTOM_SECTION = 'BOTTOM';

/* ------------------------------------------
   NavItem
   Single navigation link — memoised to
   prevent re-renders when sibling items
   or unrelated state changes occur.
------------------------------------------ */
const NavItem = memo(function NavItem({ item, isActive, badgeCount, onNavigate, onLogoutClick }) {
  const Icon       = iconMap[item.icon];
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

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (item.id === 'logout') {
        if (onLogoutClick) {
          onLogoutClick();
        }
        return;
      }
      onNavigate(item.route);
    }
  }

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

      {badgeCount != null && badgeCount > 0 && (
        <span
          className={`sidebar-badge ${badgeClass}`}
          aria-label={`${badgeCount} items`}
          role="status"
        >
          {badgeCount}
        </span>
      )}
    </a>
  );
});

/* ------------------------------------------
   NavSection
   Renders a labelled group of nav items.
------------------------------------------ */
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

/* ------------------------------------------
   Sidebar — root component
------------------------------------------ */
function Sidebar({ menu = [], activeRoute = '', badgeCounts = {}, isOpen = false, onNavigate, onClose }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  /* Split flat menu into main (scrollable) and bottom (pinned) */
  const mainItems   = menu.filter((item) => item.section !== BOTTOM_SECTION);
  const bottomItems = menu.filter((item) => item.section === BOTTOM_SECTION);

  /* Derive ordered section keys preserving array insertion order */
  const sectionKeys = [...new Set(mainItems.map((item) => item.section))];

  const SupportIcon = iconMap['Headphones'];
  const LogOutIcon = iconMap['LogOut'];

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    removeBackOfficeAuth();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={['sidebar', isOpen ? 'sidebar--open' : ''].join(' ').trim()}
        aria-label="Main navigation"
      >

        {/* ---- Logo ---- */}
        <div className="sidebar-logo" aria-label="Sivels Finance home">
          <img src={logoImg} alt="Sivels Finance Logo" className="sidebar-logo-img" />
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-brand">SIVELS</span>
            <span className="sidebar-logo-sub">FINANCE</span>
          </div>
        </div>

        {/* ---- Scrollable navigation ---- */}
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

        {/* ---- Bottom-pinned area ---- */}
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

          {/* Support widget */}
          <div className="sidebar-support" role="complementary" aria-label="Support">
            <div className="sidebar-support-icon" aria-hidden="true">
              {SupportIcon && <SupportIcon size={18} strokeWidth={1.8} />}
            </div>
            <div className="sidebar-support-text">
              <span className="sidebar-support-label">Need Help?</span>
              <a
                href="mailto:support@sivelsfinance.com"
                className="sidebar-support-link"
                aria-label="Contact support via email"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>

      </aside>

      {showLogoutModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            padding: '1rem',
          }}
          onClick={() => setShowLogoutModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: '420px',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                }}
              >
                {LogOutIcon && <LogOutIcon size={20} />}
              </div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>
                Confirm Logout
              </h3>
            </div>
            <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.925rem', lineHeight: '1.5' }}>
              Are you sure you want to logout?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.875rem',
                  fontWeight: 600,
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
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={handleConfirmLogout}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
