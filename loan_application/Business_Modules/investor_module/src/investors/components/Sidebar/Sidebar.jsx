import { memo } from 'react';
import iconMap from '../../config/iconMap';
import logoImg from '../../../../../../Core/Logo_img/Logo.png';
import './Sidebar.css';

const BOTTOM_SECTION = 'BOTTOM';

const NavItem = memo(function NavItem({ item, isActive, badgeCount, onNavigate }) {
  const Icon = iconMap[item.icon];

  function handleClick(e) {
    e.preventDefault();
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
        {Icon && <Icon size={17} strokeWidth={1.8} />}
      </span>

      <span className="sidebar-nav-label">{item.label}</span>

      {badgeCount != null && badgeCount > 0 && (
        <span className="sidebar-badge" role="status">
          {badgeCount}
        </span>
      )}
    </a>
  );
});

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

function Sidebar({ menu = [], activeRoute = '', badgeCounts = {}, isOpen = false, onNavigate, onClose }) {
  const mainItems = menu.filter((item) => item.section !== BOTTOM_SECTION);
  const bottomItems = menu.filter((item) => item.section === BOTTOM_SECTION);
  const sectionKeys = [...new Set(mainItems.map((item) => item.section))];
  const SupportIcon = iconMap['Headphones'];

  return (
    <>
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
        <div className="sidebar-logo">
          <img src={logoImg} alt="Sivels Finance Logo" className="sidebar-logo-img" />
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-brand">SIVELS</span>
            <span className="sidebar-logo-sub">FINANCE</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Investor navigation">
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

          <div className="sidebar-support">
            <div className="sidebar-support-icon" aria-hidden="true">
              {SupportIcon && <SupportIcon size={18} strokeWidth={1.8} />}
            </div>
            <div className="sidebar-support-text">
              <span className="sidebar-support-label">Need Help?</span>
              <a
                href="mailto:support@sivelsfinance.com"
                className="sidebar-support-link"
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
