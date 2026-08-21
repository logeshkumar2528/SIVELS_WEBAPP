import './Input.css';
import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  type = 'text',
  className = '',
  required = false,
  variant = 'standard',
  ...props
}, ref) => {
  if (variant === 'auth') {
    return (
      <div className={`auth-input-wrapper ${className}`}>
        <div className={`auth-input-container ${error ? 'auth-input-error' : ''}`}>
          {Icon && <div className="auth-input-icon"><Icon size={20} /></div>}
          <input 
            ref={ref}
            type={type}
            className={`auth-input-field ${Icon ? 'with-icon' : ''}`}
            required={required}
            placeholder={props.placeholder || " "}
            {...props}
          />
          {label && (
            <label className="auth-input-label">
              {label} {required && <span className="required-asterisk">*</span>}
            </label>
          )}
        </div>
        {error && <span className="auth-error-message">{error}</span>}
      </div>
    );
  }

  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label className="input-label">
          {label} {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      <div className={`input-container ${error ? 'input-error' : ''}`}>
        {Icon && <div className="input-icon"><Icon size={20} /></div>}
        <input 
          ref={ref}
          type={type}
          className={`input-field ${Icon ? 'with-icon' : ''}`}
          required={required}
          {...props}
        />
      </div>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
