import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import './Select.css';

export default function Select({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select an option", 
  icon,
  className = "",
  disabled = false,
  error = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (triggerRef.current && !triggerRef.current.contains(event.target)) {
        // If they clicked inside the portal dropdown, we handle it in the onClick of the li
        // But we need to check if the click was inside the portal.
        // Actually, easiest is to let the li onClick close it, and if they click elsewhere, close it.
      }
    }
    
    // Better click outside logic that works with portals:
    const handleDocumentClick = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest('.aw-custom-select-dropdown')) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleDocumentClick);
      
      const handleScroll = (e) => {
        if (e.target instanceof Element && e.target.closest('.aw-custom-select-dropdown')) return;
        setIsOpen(false);
      };
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleScroll);
      
      return () => {
        document.removeEventListener("mousedown", handleDocumentClick);
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleScroll);
      };
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      // Dropdown max-height is 240px + 4px gap = ~244px
      // Open upwards if there's not enough space below AND there is more space above
      const openUp = spaceBelow < 244 && spaceAbove > spaceBelow;
      
      setRect({
        bottom: r.bottom,
        top: r.top,
        left: r.left,
        width: r.width,
        openUp
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div 
        ref={triggerRef}
        className={`aw-custom-select-trigger ${error ? 'has-error' : ''} ${isOpen ? 'is-open' : ''} ${icon ? 'has-icon' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
        onClick={handleToggle}
      >
        {icon && <span className="aw-custom-select-icon">{icon}</span>}
        <span className={`aw-custom-select-value ${!selectedOption ? 'is-placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`aw-custom-select-chevron ${isOpen ? 'open' : ''}`} size={16} />
      </div>

      {isOpen && rect && createPortal(
        <div 
          className={`aw-custom-select-dropdown ${rect.openUp ? 'open-up' : 'open-down'}`}
          style={{
            position: 'fixed',
            ...(rect.openUp 
                ? { bottom: `${window.innerHeight - rect.top + 4}px` } 
                : { top: `${rect.bottom + 4}px` }),
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            zIndex: 99999
          }}
        >
          <ul className="aw-custom-select-options">
            {placeholder && (
              <li 
                className={`aw-custom-select-option ${value === '' ? 'selected' : ''} placeholder-option`}
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
              >
                {placeholder}
              </li>
            )}
            {options.map((option, index) => (
              <li 
                key={index} 
                className={`aw-custom-select-option ${option.value === value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}
