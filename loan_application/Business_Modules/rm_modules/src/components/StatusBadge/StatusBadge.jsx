import { memo } from 'react';
import { STATUS_CONFIG } from '../../config/statusConfig';
import { getRmStatusVariant, getRmWorkflowStatusLabel } from '../../utils/rmWorkflowStatus';
import './StatusBadge.css';

const StatusBadge = memo(function StatusBadge({ status = 'New', label, workflowStatus }) {
  if (workflowStatus) {
    const displayLabel = label || getRmWorkflowStatusLabel(workflowStatus);
    return (
      <span className={`status-badge status-badge--${getRmStatusVariant(workflowStatus)}`}>
        <span className="status-badge-dot" />
        <span className="status-badge-text">{displayLabel}</span>
      </span>
    );
  }

  const config = STATUS_CONFIG[status] || { label: status, variant: 'new' };
  const displayLabel = label || config.label;

  return (
    <span className={`status-badge status-badge--${config.variant}`}>
      <span className="status-badge-dot" />
      <span className="status-badge-text">{displayLabel}</span>
    </span>
  );
});

export default StatusBadge;
