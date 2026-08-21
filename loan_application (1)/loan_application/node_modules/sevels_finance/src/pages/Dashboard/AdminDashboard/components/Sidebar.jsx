import {
  LayoutDashboard,
  BarChart3,
  FileBarChart,
  Database,
  Users,
  Megaphone,
  Store,
  Bell,
  Settings,
  Trash2,
  LogOut,
  HelpCircle,
  X,
} from "lucide-react";

// Same collapse-toggle glyph used on the Customer Dashboard sidebar.
const SidebarLayoutIcon = ({ size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
    <line x1="14" y1="3" x2="14" y2="21" />
    <line x1="16.5" y1="8" x2="18.5" y2="8" strokeWidth="2.5" />
    <line x1="16.5" y1="12" x2="18.5" y2="12" strokeWidth="2.5" />
    <line x1="16.5" y1="16" x2="18.5" y2="16" strokeWidth="2.5" />
  </svg>
);

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", view: "dashboard" },
  { icon: BarChart3, label: "Statistics", view: "statistics" },
  { icon: FileBarChart, label: "Reports", view: "reports" },
  { icon: Database, label: "Loan Master", view: "loanMaster" },
  { icon: Users, label: "Borrowers", view: "borrowers" },
  { icon: Megaphone, label: "Collections", view: "collections" },
];

const bottomNavItems = [
  { icon: Store, label: "Investors", view: "investors" },
  { icon: Bell, label: "Notifications", view: "notifications" },
  { icon: Settings, label: "Settings", view: "settings" },
  { icon: Trash2, label: "Archive", view: "archive" },
];

export default function Sidebar({ open, onClose, activeView, onNavigate, collapsed, onToggleCollapse }) {
  function handleNavClick(view) {
    onNavigate(view);
    onClose(); // collapse the off-canvas sidebar on mobile after picking a section
  }

  return (
    <>
      {open && <div className="ldash-backdrop" onClick={onClose} aria-hidden="true" />}

      <aside className={`ldash-sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <div className="ldash-brand">
          {/* Left side intentionally left empty — drop your company logo/icon here */}
          <div className="ldash-brand-logo-slot" />

          <button
            className="ldash-sidebar-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <SidebarLayoutIcon size={20} />
          </button>

          <button className="ldash-sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <nav className="ldash-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={activeView === item.view ? "ldash-nav-item active" : "ldash-nav-item"}
                onClick={() => handleNavClick(item.view)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={17} strokeWidth={1.8} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          {!collapsed && <p className="ldash-nav-divider">More</p>}

          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={activeView === item.view ? "ldash-nav-item active" : "ldash-nav-item"}
                onClick={() => handleNavClick(item.view)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={17} strokeWidth={1.8} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="ldash-sidebar-footer">
          <button className="ldash-nav-item" title={collapsed ? "Log Out" : undefined}>
            <LogOut size={17} strokeWidth={1.8} />
            {!collapsed && <span>Log Out</span>}
          </button>
          <button className="ldash-nav-item" title={collapsed ? "Help" : undefined}>
            <HelpCircle size={17} strokeWidth={1.8} />
            {!collapsed && <span>Help</span>}
          </button>
        </div>
      </aside>
    </>
  );
}