import './Textarea.css';
import { forwardRef } from 'react';

const Textarea = forwardRef(({
  label,
  error,
  className = '',
  rows = 3,
  required = false,
  ...props
}, ref) => {
  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label className="input-label">
          {label} {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      <div className={`input-container textarea-container ${error ? 'error' : ''}`}>
        <textarea
          ref={ref}
          className="input-field textarea-field"
          rows={rows}
          required={required}
          {...props}
        />
      </div>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
