import { Search, Menu } from "lucide-react";

export default function Topbar({ onMenuClick, title = "Dashboard" }) {
  return (
    <header className="ldash-topbar">
      <button className="ldash-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} strokeWidth={1.8} />
      </button>

      <h1 className="ldash-title">{title}</h1>

      <div className="ldash-profile">
        <div>
          <p className="ldash-profile-name">Anjali Krishnan</p>
          <p className="ldash-profile-role">Head of Operations</p>
        </div>
        <div className="ldash-avatar">AK</div>
      </div>
    </header>
  );
}