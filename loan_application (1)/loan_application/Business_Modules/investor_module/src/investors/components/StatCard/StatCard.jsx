import { memo } from 'react';
import iconMap from '../../config/iconMap';
import './StatCard.css';

const StatCard = memo(function StatCard({
  label,
  value,
  delta,
  positive,
  icon,
  tint = 'var(--color-primary)',
  bg = 'var(--color-primary-light)',
}) {
  const IconComponent = typeof icon === 'string' ? iconMap[icon] : icon;

  return (
    <div className="stat-card">
      {IconComponent && (
        <div className="stat-card-icon-wrap" style={{ background: bg }}>
          <IconComponent size={20} color={tint} />
        </div>
      )}
      <div className="stat-card-content">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        {delta && (
          <div
            className={[
              'stat-card-delta',
              positive === true ? 'stat-card-delta--positive' : '',
              positive === false ? 'stat-card-delta--negative' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {delta}
          </div>
        )}
      </div>
    </div>
  );
});

export default StatCard;
