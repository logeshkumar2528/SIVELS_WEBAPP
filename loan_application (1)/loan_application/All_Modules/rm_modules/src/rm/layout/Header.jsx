import React from "react";
import { Menu, Bell, ChevronDown, ChevronRight } from "lucide-react";

export default function Header({ title, breadcrumbs }) {
  return (
    <header className="topbar">
      <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {title && (
          <div className="header-titles" style={{ display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: "var(--text-dark)" }}>{title}</h2>
            {breadcrumbs && (
              <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px", fontWeight: "500" }}>
                {breadcrumbs.map((bc, i) => (
                  <React.Fragment key={i}>
                    <span style={{ color: i === breadcrumbs.length - 1 ? "var(--sivels-green-accent)" : "inherit" }}>
                      {bc}
                    </span>
                    {i < breadcrumbs.length - 1 && <ChevronRight size={10} />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="topbar-right">
        <button className="icon-btn notif-btn">
          <Bell size={20} />
          <span className="notif-dot">8</span>
          <span className="notif-label">Notifications</span>
        </button>
        <div className="topbar-divider" />
        <div className="user-chip">
          <div className="avatar" />
          <div className="user-info">
            <span className="user-name">Ramesh Kumar</span>
            <span className="user-id">RM ID : RM0001</span>
          </div>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}
