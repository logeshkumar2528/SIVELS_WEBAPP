import React from "react";
import { Nav, Button } from "react-bootstrap";
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  User,
  LogOut,
  IndianRupee,
} from "../icons/icons";

const navItems = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { key: "new-investment", icon: PlusCircle, label: "New Investment" },
  { key: "customer-allocation", icon: Users, label: "Customer Allocation" },
  { key: "profile", icon: User, label: "Profile" },
];

export default function Sidebar({ activeKey, onNavigate, onLogout, onSupport }) {
  return (
    <aside className="investor-sidebar d-flex flex-column">
      <div className="d-flex align-items-center gap-2 px-3 py-4">
        <div className="brand-mark d-flex align-items-center justify-content-center">
          <IndianRupee size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="lh-sm">
          <p className="text-white fw-semibold mb-0 small">SIVELS</p>
          <p className="brand-sub mb-0">FINANCE</p>
        </div>
      </div>

      <Nav className="flex-column gap-1 px-2 flex-grow-1" aria-label="Investor navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeKey;
          return (
            <Nav.Link
              key={item.key}
              onClick={() => onNavigate(item.key, item.label)}
              className={`sidebar-link d-flex align-items-center gap-2 ${
                isActive ? "sidebar-link-active" : ""
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              <span>{item.label}</span>
            </Nav.Link>
          );
        })}
      </Nav>

      <div className="px-2 pb-3">
        <Nav.Link
          onClick={onLogout}
          className="sidebar-link d-flex align-items-center gap-2"
        >
          <LogOut size={17} strokeWidth={2} />
          <span>Logout</span>
        </Nav.Link>

        <div className="support-box mt-3 p-3">
          <p className="text-white small fw-medium mb-1">Need Help?</p>
          <Button
            variant="link"
            size="sm"
            className="p-0 text-decoration-none support-link"
            onClick={onSupport}
          >
            Contact Support
          </Button>
        </div>
      </div>
    </aside>
  );
}