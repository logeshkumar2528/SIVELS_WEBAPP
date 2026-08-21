import './Checkbox.css';
import { forwardRef } from 'react';

const Checkbox = forwardRef(({
  label,
  className = '',
  ...props
}, ref) => {
  return (
    <label className={`checkbox-wrapper ${className}`}>
      <input
        type="checkbox"
        ref={ref}
        className="checkbox-input"
        {...props}
      />
      <span className="checkbox-custom"></span>
      {label && <span className="checkbox-label">{label}</span>}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;
