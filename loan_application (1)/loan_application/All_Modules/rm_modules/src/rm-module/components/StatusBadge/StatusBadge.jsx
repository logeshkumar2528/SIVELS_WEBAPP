import { memo } from 'react';
import { STATUS_CONFIG } from '../../config/statusConfig';
import './StatusBadge.css';

const StatusBadge = memo(function StatusBadge({ status = 'New' }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'new' };

  return (
    <span className={`status-badge status-badge--${config.variant}`}>
      <span className="status-badge-dot" />
      {config.label}
    </span>
  );
});

export default StatusBadge;
