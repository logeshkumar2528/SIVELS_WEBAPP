const STATUS_LABELS = {
  locked: 'Locked',
  pending: 'Pending',
  verifying: 'Verifying',
  verified: 'Verified',
};

const StatusBadge = ({ status = 'pending' }) => (
  <span className={`status-pill status-pill--${status}`}>
    {STATUS_LABELS[status] ?? STATUS_LABELS.pending}
  </span>
);

export default StatusBadge;
