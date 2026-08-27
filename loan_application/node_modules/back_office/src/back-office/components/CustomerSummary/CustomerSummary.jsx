import iconMap from '../../config/iconMap';
import StatusBadge from '../StatusBadge/StatusBadge';
import './CustomerSummary.css';

/**
 * CustomerSummary
 * --------------------
 * Reusable left panel for verification pages.
 */
function CustomerSummary({ data }) {
  const UserIcon = iconMap['User'];

  return (
    <aside className="cs-panel" aria-label="Customer summary">
      <h3 className="cs-panel-title">
        {UserIcon && <UserIcon size={16} strokeWidth={1.8} aria-hidden="true" />}
        Customer Summary
      </h3>

      <div className="cs-avatar-wrap">
        <div className="cs-avatar" aria-hidden="true">
          {data?.name?.charAt(0) || 'U'}
        </div>
        <div className="cs-avatar-info">
          <p className="cs-name">{data?.name}</p>
          <p className="cs-id text-success">{data?.id}</p>
        </div>
      </div>

      <div className="cs-fields">
        {data?.fields?.map((field) => (
          <div key={field.label} className="cs-row">
            <span className="cs-row-label">
              {field.icon && (
                <span className="cs-row-icon">
                  {iconMap[field.icon] && (
                    <span aria-hidden="true">
                      {(() => { const Icon = iconMap[field.icon]; return <Icon size={14} />; })()}
                    </span>
                  )}
                </span>
              )}
              {field.label}
            </span>
            {field.isStatus ? (
              <StatusBadge status={field.value} />
            ) : (
              <span className="cs-row-value">{field.value}</span>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default CustomerSummary;
