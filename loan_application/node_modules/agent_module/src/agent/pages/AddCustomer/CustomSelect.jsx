import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import './CustomSelect.css'

export default function CustomSelect({
  name,
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  disabled = false,
  error = false,
  icon: Icon = null,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownRect, setDropdownRect] = useState(null)
  const triggerRef = useRef(null)

  // Find the selected option object
  const selectedOption = options.find(
    (opt) => String(opt.value) === String(value)
  )

  // Handle document click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) {
        return
      }
      if (e.target instanceof Element && e.target.closest('.agent-custom-select-dropdown')) {
        return
      }
      setIsOpen(false)
    }

    const handleScrollOrResize = (e) => {
      if (e.target instanceof Element && e.target.closest('.agent-custom-select-dropdown')) {
        return
      }
      setIsOpen(false)
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const toggleDropdown = () => {
    if (disabled) return
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      // Open upwards if not enough room below (less than 220px) and more room above
      const openUp = spaceBelow < 220 && spaceAbove > spaceBelow

      setDropdownRect({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        openUp
      })
    }
    setIsOpen((prev) => !prev)
  }

  const handleSelect = (optionValue) => {
    if (onChange) {
      onChange({ target: { name, value: optionValue } })
    }
    setIsOpen(false)
  }

  return (
    <div className={`agent-custom-select-wrapper ${disabled ? 'disabled' : ''}`}>
      <div
        ref={triggerRef}
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        className={`agent-custom-select-trigger ${isOpen ? 'is-open' : ''} ${error ? 'is-invalid' : ''} ${Icon ? 'with-icon' : ''}`}
        onClick={toggleDropdown}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleDropdown()
          }
        }}
      >
        {Icon && (
          <span className="compact-input-icon">
            <Icon size={16} strokeWidth={1.8} />
          </span>
        )}
        <span className={`agent-custom-select-label ${!selectedOption ? 'is-placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`agent-custom-select-chevron ${isOpen ? 'open' : ''}`}>
          <ChevronDown size={16} strokeWidth={2} />
        </span>
      </div>

      {/* Hidden native select for form accessibility */}
      <select
        name={name}
        value={value || ''}
        tabIndex={-1}
        aria-hidden="true"
        required={required}
        onChange={(e) => {
          if (onChange) onChange(e)
        }}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
          margin: 0
        }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {isOpen && dropdownRect && createPortal(
        <div
          className={`agent-custom-select-dropdown ${dropdownRect.openUp ? 'open-up' : 'open-down'}`}
          style={{
            position: 'fixed',
            ...(dropdownRect.openUp
              ? { bottom: `${window.innerHeight - dropdownRect.top + 4}px` }
              : { top: `${dropdownRect.bottom + 4}px` }),
            left: `${dropdownRect.left}px`,
            width: `${dropdownRect.width}px`,
            zIndex: 99999
          }}
        >
          <ul className="agent-custom-select-options" role="listbox">
            {options.length === 0 ? (
              <li className="agent-custom-select-empty">
                {placeholder}
              </li>
            ) : (
              options.map((option, index) => {
                const isSelected = String(option.value) === String(value)
                return (
                  <li
                    key={index}
                    role="option"
                    aria-selected={isSelected}
                    className={`agent-custom-select-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                  </li>
                )
              })
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  )
}
