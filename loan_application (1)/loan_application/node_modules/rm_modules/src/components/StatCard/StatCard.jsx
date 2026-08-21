import { memo } from 'react';
import iconMap from '../../config/iconMap';
import './StatCard.css';

const TREND_ICON_MAP = {
  up: iconMap['TrendingUp'],
  down: iconMap['TrendingDown'],
  neutral: null,
};

const StatCard = memo(function StatCard({
  icon,
  title = '',
  value = '',
  description = '',
  trend = '',
  trendDirection = 'neutral',
  variant = 'default',
  onClick,
  loading = false,
}) {
  const isClickable = typeof onClick === 'function';
  const TrendIcon = TREND_ICON_MAP[trendDirection] ?? null;

  const classNames = [
    'stat-card',
    `stat-card--${variant}`,
    isClickable ? 'stat-card--clickable' : '',
    loading ? 'stat-card--loading' : '',
  ].filter(Boolean).join(' ');

  function handleClick() {
    if (isClickable && !loading) onClick();
  }

  return (
    <div
      className={classNames}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {icon && (
        <div className={`stat-card-icon-wrap stat-card-icon-wrap--${variant}`}>
          {icon}
        </div>
      )}
      <div className="stat-card-body">
        <p className="stat-card-title">{title}</p>
        <p className="stat-card-value">{value}</p>
        {description && <p className="stat-card-description">{description}</p>}
        {trend && (
          <p className={`stat-card-trend stat-card-trend--${trendDirection}`}>
            {TrendIcon && (
              <span className="stat-card-trend-icon">
                <TrendIcon size={12} strokeWidth={2.5} />
              </span>
            )}
            <span>{trend}</span>
          </p>
        )}
      </div>
    </div>
  );
});

export default StatCard;
