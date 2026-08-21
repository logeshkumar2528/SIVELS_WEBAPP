import { memo } from 'react';
import STATUS_CONFIG from '../../config/statusConfig';
import './StatusBadge.css';

const StatusBadge = memo(function StatusBadge({ status = 'Active' }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    textVar: 'var(--color-status-new-text)',
    bgVar: 'var(--color-status-new-bg)',
  };

  return (
    <span
      className="status-badge"
      style={{
        color: config.textVar,
        backgroundColor: config.bgVar,
      }}
    >
      {config.label}
    </span>
  );
});

export default StatusBadge;
