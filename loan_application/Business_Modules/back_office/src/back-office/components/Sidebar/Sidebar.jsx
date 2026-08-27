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

import { memo } from 'react';
import iconMap from '../../config/iconMap';
import logoImg from '../../../../../../Core/Logo_img/Logo.png';
import './Sidebar.css';

/* ==========================================
   BADGE COLOR MAP
   Maps a badgeKey → CSS modifier class.
   Color values live in variables.css.
========================================== */
const BADGE_CLASS_MAP = {
  newApplications:     'sidebar-badge--new',
  inReview:            'sidebar-badge--review',
  returned:            'sidebar-badge--return',
  pendingApplications: 'sidebar-badge--review',
  rejected:            'sidebar-badge--rejected',
  approved:            'sidebar-badge--approved',
  disbursed:           'sidebar-badge--pending',
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
const NavItem = memo(function NavItem({ item, isActive, badgeCount, onNavigate }) {
  const Icon       = iconMap[item.icon];
  const badgeClass = BADGE_CLASS_MAP[item.badgeKey] ?? '';

  function handleClick(e) {
    e.preventDefault();
    onNavigate(item.route);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
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
function NavSection({ sectionTitle, items, activeRoute, badgeCounts, onNavigate }) {
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

  /* Split flat menu into main (scrollable) and bottom (pinned) */
  const mainItems   = menu.filter((item) => item.section !== BOTTOM_SECTION);
  const bottomItems = menu.filter((item) => item.section === BOTTOM_SECTION);

  /* Derive ordered section keys preserving array insertion order */
  const sectionKeys = [...new Set(mainItems.map((item) => item.section))];

  const SupportIcon = iconMap['Headphones'];

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
    </>
  );
}

export default Sidebar;
