import clsx from 'clsx';
import './MasterStatusBadge.css';

export function MasterStatusBadge({ status }) {
  const isActive = status === true || status === 1 || status === '1' || (typeof status === 'string' && status.toLowerCase() === 'active');
  
  return (
    <span
      className={clsx('master-status-badge', {
        'master-status-badge--active': isActive,
        'master-status-badge--inactive': !isActive,
      })}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
