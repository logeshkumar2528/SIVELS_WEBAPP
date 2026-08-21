import { memo } from 'react';
import './SectionHeader.css';

const SectionHeader = memo(function SectionHeader({ breadcrumb, title, subtitle, badge, action }) {
  return (
    <div className="section-header">
      <div className="section-header-left">
        {breadcrumb && <div className="section-header-breadcrumb">{breadcrumb}</div>}
        <div className="section-header-title-row">
          <h2 className="section-header-title">{title}</h2>
          {badge && <span className="section-header-badge">{badge}</span>}
        </div>
        {subtitle && <p className="section-header-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="section-header-right">{action}</div>}
    </div>
  );
});

export default SectionHeader;
