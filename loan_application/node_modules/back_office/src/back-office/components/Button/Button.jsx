/**
 * Button
 * --------------------
 * Purpose:
 *   Reusable action button for all interactive elements across the module.
 *
 * Responsibilities:
 *   - Render a styled button with optional left icon.
 *   - Support 5 variants: primary, secondary, ghost, outline, danger.
 *   - Support 3 sizes: sm, md, lg.
 *   - Render a loading spinner state.
 *   - Emit onClick — no business logic.
 *
 * Props:
 *   label     {string}      — Button text; required for accessibility
 *   variant   {'primary'|'secondary'|'ghost'|'outline'|'danger'} — Visual style
 *   size      {'sm'|'md'|'lg'}  — Size modifier
 *   icon      {ReactElement}    — Optional left icon element (pre-resolved by parent)
 *   onClick   {Function}        — Click handler
 *   disabled  {boolean}         — Disabled state
 *   loading   {boolean}         — Shows spinner, disables interaction
 *   type      {'button'|'submit'|'reset'} — HTML button type (default 'button')
 *   fullWidth {boolean}         — Stretches button to 100% width
 */

import { memo } from 'react';
import './Button.css';

const Button = memo(function Button({
  label,
  variant   = 'primary',
  size      = 'md',
  icon,
  onClick,
  disabled  = false,
  loading   = false,
  type      = 'button',
  fullWidth = false,
}) {
  const isDisabled = disabled || loading;

  const classNames = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    loading   ? 'btn--loading' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classNames}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      aria-busy={loading ? 'true' : undefined}
      aria-disabled={isDisabled ? 'true' : undefined}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : (
        <>
          {icon && (
            <span className="btn-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="btn-label">{label}</span>
        </>
      )}
    </button>
  );
});

export default Button;
