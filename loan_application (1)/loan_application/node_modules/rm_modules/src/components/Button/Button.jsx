import { memo } from 'react';
import './Button.css';

const Button = memo(function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const { className: userClassName, ...restProps } = props;
  const classNames = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    userClassName || '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled}
      onClick={onClick}
      {...restProps}
    >
      {icon && iconPosition === 'left' && <span className="btn-icon">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="btn-icon">{icon}</span>}
    </button>
  );
});

export default Button;
