import './Select.css';
import { forwardRef, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(({
  label,
  error,
  icon: Icon,
  options = [],
  className = '',
  placeholder = 'Select an option',
  required = false,
  value,
  onChange,
  name,
  dropdownPosition = 'bottom',
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');
  const containerRef = useRef(null);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    setInternalValue(val);
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { name, value: val } });
    }
  };

  const selectedOption = options.find(opt => opt.value === internalValue);

  return (
    <div className={`input-wrapper ${className}`} ref={containerRef}>
      {label && (
        <label className="input-label">
          {label} {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      <div 
        className={`input-container custom-select-container ${error ? 'error' : ''} ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {Icon && (
          <div className="input-icon">
            <Icon size={18} />
          </div>
        )}
        
        {/* Hidden native select for form submission and validation */}
        <select
          ref={ref}
          name={name}
          value={internalValue}
          onChange={(e) => handleSelect(e.target.value)}
          required={required}
          className="hidden-native-select"
          style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}
          {...props}
        >
          <option value="" disabled hidden>{placeholder}</option>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>

        <div className={`input-field select-field ${Icon ? 'with-icon' : ''} ${!internalValue ? 'placeholder-shown' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </div>
        
        <div className={`select-arrow ${isOpen ? 'open' : ''}`}>
          <ChevronDown size={16} />
        </div>
        
        {isOpen && (
          <div className={`custom-select-dropdown ${dropdownPosition === 'top' ? 'dropdown-top' : ''}`} onClick={(e) => e.stopPropagation()}>
            {options.map((opt) => (
              <div 
                key={opt.value} 
                className={`custom-select-option ${internalValue === opt.value ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt.value);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <span className="error-message">{error}</span>}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
