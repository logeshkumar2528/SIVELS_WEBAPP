/**
 * MainLayout
 * --------------------
 * Purpose:
 *   The structural backbone of the entire Back Office module.
 *   Every page renders inside this layout — never standalone.
 *
 * Responsibilities:
 *   - Render Sidebar, Header, and the page content area.
 *   - Own and control sidebar open/close state (layout state only).
 *   - Derive the active route from the router and pass it to Sidebar.
 *   - Compute today's date string and pass it to Header.
 *   - Handle navigation callback and pass it down to Sidebar.
 *   - Prevent body scroll when the mobile sidebar overlay is open.
 *   - Memoised callbacks prevent unnecessary child re-renders.
 *
 * Props:
 *   title             {string}   — Page heading passed to Header
 *   subtitle          {string}   — Page subheading passed to Header
 *   badgeCounts       {Object}   — Nav badge counts passed to Sidebar
 *   user              {Object}   — { name, role, avatarUrl } passed to Header
 *   notificationCount {number}   — Bell badge count passed to Header
 *   onNotificationsClick {Function} — Notification bell click handler
 *   onUserMenuClick      {Function} — User dropdown click handler
 *   children          {ReactNode} — Page content rendered inside <main>
 *
 * Architecture rules:
 *   - No business state — only sidebarOpen.
 *   - Dashboard must NOT know Sidebar or Header exist.
 *   - Pages render only their own content as `children`.
 *   - useNavigate and useLocation are used here (layout infrastructure only).
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import Sidebar from '../../components/Sidebar/Sidebar';
import Header  from '../../components/Header/Header';
import { NAV_ITEMS } from '../../config/navConfig';
import './MainLayout.css';

/* ==========================================
   DATE HELPER
   Formats today's date for the Header display.
   e.g. "05 Jun 2025"
========================================== */
function formatHeaderDate(date) {
  return date.toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

/* ==========================================
   MAINLAYOUT
========================================== */
function MainLayout({
  title                = '',
  subtitle             = '',
  badgeCounts          = {},
  user                 = { name: '', role: '' },
  notificationCount    = 0,
  onNotificationsClick,
  onUserMenuClick,
  children,
}) {
  /* ------------------------------------------
     Layout state — ONLY sidebarOpen lives here
  ------------------------------------------ */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ------------------------------------------
     Router hooks — layout infrastructure
  ------------------------------------------ */
  const navigate    = useNavigate();
  const { pathname } = useLocation();

  /* ------------------------------------------
     Prevent body scroll when overlay is open
  ------------------------------------------ */
  useEffect(() => {
    document.body.classList.toggle('body--no-scroll', sidebarOpen);
    return () => document.body.classList.remove('body--no-scroll');
  }, [sidebarOpen]);

  /* ------------------------------------------
     Close sidebar on route change (mobile UX)
  ------------------------------------------ */
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  /* ------------------------------------------
     Memoised callbacks
     Prevent re-renders of memoised children
     (Sidebar, Header) when layout re-renders.
  ------------------------------------------ */
  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleNavigate = useCallback((route) => {
    navigate(route);
  }, [navigate]);

  /* ------------------------------------------
     Computed values
  ------------------------------------------ */
  const todayDate = formatHeaderDate(new Date());

  return (
    <div className={['layout', sidebarOpen ? 'layout--sidebar-open' : ''].join(' ').trim()}>

      {/* ========== SIDEBAR ========== */}
      <Sidebar
        menu={NAV_ITEMS}
        activeRoute={pathname}
        badgeCounts={badgeCounts}
        isOpen={sidebarOpen}
        onNavigate={handleNavigate}
        onClose={handleSidebarClose}
      />

      {/* ========== BODY (Header + Content) ========== */}
      <div className="layout-body">

        {/* ---- Sticky Header ---- */}
        <Header
          title={title}
          subtitle={subtitle}
          date={todayDate}
          notificationCount={notificationCount}
          user={user}
          onMenuToggle={handleMenuToggle}
          onNotificationsClick={onNotificationsClick}
          onUserMenuClick={onUserMenuClick}
        />

        {/* ---- Scrollable Page Content ---- */}
        <main
          className="layout-content"
          id="main-content"
          aria-label="Page content"
        >
          {children}
        </main>

      </div>

    </div>
  );
}

export default MainLayout;
