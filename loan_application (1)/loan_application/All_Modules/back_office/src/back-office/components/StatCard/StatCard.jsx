/**
 * StatCard
 * --------------------
 * Purpose:
 *   Reusable metric display card used across every page in the Back Office module.
 *
 * Responsibilities:
 *   - Render a single KPI: icon, title, value, description, trend indicator.
 *   - Support 5 visual variants that tint the icon background.
 *   - Render a skeleton loading state when data is not yet available.
 *   - Act as an interactive button when `onClick` is provided.
 *   - Never contain business logic — only render what is passed as props.
 *
 * Props:
 *   icon           {ReactElement}         — Pre-resolved icon element (e.g. <FilePlusIcon size={22} />)
 *                                           Parent resolves via iconMap — StatCard never imports icons.
 *   title          {string}               — Metric label (e.g. "New Applications")
 *   value          {string|number}        — Primary displayed value (e.g. "24", "₹2,00,000")
 *   description    {string}               — Optional secondary text below value
 *   trend          {string}               — Trend text (e.g. "20% vs yesterday")
 *   trendDirection {'up'|'down'|'neutral'}— Controls trend colour and icon
 *   variant        {'default'|'success'|'warning'|'danger'|'info'}
 *                                         — Controls icon background tint
 *   onClick        {Function}             — Makes the card a button; omit for static display
 *   loading        {boolean}              — Renders skeleton shimmer when true
 *
 * Checklist:
 *   ✅ Reusable       — zero business logic, all data via props
 *   ✅ Responsive     — fluid width, stacks gracefully
 *   ✅ Accessible     — role="button" + tabIndex + aria-label when clickable; aria-busy on load
 *   ✅ Memoized       — wrapped in React.memo
 *   ✅ No business logic
 *   ✅ Uses variables.css
 *   ✅ Props documented
 *   ✅ One responsibility
 *   ✅ Future-proof    — new variants only need a CSS class + variable
 *   ✅ No duplicate CSS
 */

import { memo } from 'react';
import iconMap from '../../config/iconMap';
import './StatCard.css';

/* ==========================================
   TREND ICON MAP
   Generic UI arrows — not business-specific.
   Resolved once at module level, not per render.
========================================== */
const TREND_ICON_MAP = {
  up:      iconMap['TrendingUp'],
  down:    iconMap['TrendingDown'],
  neutral: null,
};

/* ==========================================
   SKELETON — Loading placeholder
========================================== */
function StatCardSkeleton({ variant }) {
  return (
    <>
      <div
        className={`stat-card-icon-wrap stat-card-icon-wrap--${variant} stat-card-icon-wrap--skeleton`}
        aria-hidden="true"
      />
      <div className="stat-card-body">
        <div className="stat-card-skeleton stat-card-skeleton--title" />
        <div className="stat-card-skeleton stat-card-skeleton--value" />
        <div className="stat-card-skeleton stat-card-skeleton--trend" />
      </div>
    </>
  );
}

/* ==========================================
   STAT CARD — Main component
========================================== */
const StatCard = memo(function StatCard({
  icon,
  title          = '',
  value          = '',
  description    = '',
  trend          = '',
  trendDirection = 'neutral',
  variant        = 'default',
  onClick,
  loading        = false,
}) {
  const isClickable = typeof onClick === 'function';
  const TrendIcon   = TREND_ICON_MAP[trendDirection] ?? null;

  const classNames = [
    'stat-card',
    `stat-card--${variant}`,
    isClickable        ? 'stat-card--clickable' : '',
    loading            ? 'stat-card--loading'   : '',
  ].filter(Boolean).join(' ');

  /* ------------------------------------------
     Interaction handlers
     Only fire when clickable and not loading
  ------------------------------------------ */
  function handleClick() {
    if (isClickable && !loading) onClick();
  }

  function handleKeyDown(e) {
    if (!isClickable || loading) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <div
      className={classNames}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `${title}: ${value}` : undefined}
      aria-busy={loading ? 'true' : undefined}
      aria-live={loading ? 'polite' : undefined}
    >

      {/* ---- Loading skeleton ---- */}
      {loading ? (
        <StatCardSkeleton variant={variant} />
      ) : (
        <>

          {/* ---- Icon ---- */}
          {icon && (
            <div
              className={`stat-card-icon-wrap stat-card-icon-wrap--${variant}`}
              aria-hidden="true"
            >
              {icon}
            </div>
          )}

          {/* ---- Body ---- */}
          <div className="stat-card-body">

            <p className="stat-card-title">{title}</p>

            <p className="stat-card-value" aria-label={`${title} count: ${value}`}>
              {value}
            </p>

            {description && (
              <p className="stat-card-description">{description}</p>
            )}

            {trend && (
              <p
                className={[
                  'stat-card-trend',
                  `stat-card-trend--${trendDirection}`,
                ].join(' ')}
                aria-label={`Trend: ${trendDirection === 'up' ? 'up' : trendDirection === 'down' ? 'down' : ''} ${trend}`}
              >
                {TrendIcon && (
                  <span className="stat-card-trend-icon" aria-hidden="true">
                    <TrendIcon size={12} strokeWidth={2.5} />
                  </span>
                )}
                <span>{trend}</span>
              </p>
            )}

          </div>

        </>
      )}

    </div>
  );
});

export default StatCard;
