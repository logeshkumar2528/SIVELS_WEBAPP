import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import './DatePicker.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Generate years from 1900 to current year + 10
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1900 + 11 }, (_, i) => 1900 + i).reverse();

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} - ${month} - ${year}`;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select Date Range",
  className = "",
  disabled = false,
  error = false,
  max
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);
  
  const initialDate = value && !isNaN(new Date(value).getTime()) ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);

  useEffect(() => {
    if (value && !isNaN(new Date(value).getTime())) {
      setViewDate(new Date(value));
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentClick = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest('.agent-datepicker-dropdown')) return;
      setIsOpen(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScroll = (e) => {
      if (e.target instanceof Element && e.target.closest('.agent-datepicker-dropdown')) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      // Dropdown needs ~340px
      const openUp = spaceBelow < 340 && spaceAbove > spaceBelow;
      
      setRect({
        bottom: r.bottom,
        top: r.top,
        left: r.left,
        width: r.width,
        openUp
      });
      
      if (value && !isNaN(new Date(value).getTime())) {
        setViewDate(new Date(value));
      } else {
        setViewDate(new Date());
      }
    }
    setIsOpen(!isOpen);
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleMonthChange = (e) => {
    setViewDate(new Date(viewDate.getFullYear(), parseInt(e.target.value), 1));
  };

  const handleYearChange = (e) => {
    setViewDate(new Date(parseInt(e.target.value), viewDate.getMonth(), 1));
  };

  const handleDateSelect = (day) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const offset = selected.getTimezoneOffset();
    selected.setMinutes(selected.getMinutes() - offset);
    onChange(selected.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const offset = today.getTimezoneOffset();
    today.setMinutes(today.getMinutes() - offset);
    onChange(today.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const renderCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    
    const maxDate = max ? new Date(max) : null;
    if (maxDate) maxDate.setHours(23, 59, 59, 999);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const selectedDate = value && !isNaN(new Date(value).getTime()) ? new Date(value) : null;
    if (selectedDate) selectedDate.setHours(0,0,0,0);

    const days = [];

    // Prev month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="agent-datepicker-day muted disabled">
          {daysInPrevMonth - i}
        </div>
      );
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      currentDate.setHours(0,0,0,0);
      
      const isToday = currentDate.getTime() === today.getTime();
      const isSelected = selectedDate && currentDate.getTime() === selectedDate.getTime();
      const isDisabled = maxDate && currentDate > maxDate;

      days.push(
        <div 
          key={`day-${i}`} 
          className={`agent-datepicker-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
          onClick={() => !isDisabled && handleDateSelect(i)}
        >
          {i}
        </div>
      );
    }

    // Next month days to complete grid (42 cells max)
    const totalCells = days.length;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <div key={`next-${i}`} className="agent-datepicker-day muted disabled">
          {i}
        </div>
      );
    }

    return days;
  };

  return (
    <div className={`agent-datepicker-container ${disabled ? 'is-disabled' : ''}`}>
      <div 
        ref={triggerRef}
        className={`agent-datepicker-trigger ${error ? 'has-error' : ''} ${isOpen ? 'is-open' : ''} ${className}`}
        onClick={handleToggle}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <CalendarIcon className="agent-datepicker-icon" size={16} />
        <span className={`agent-datepicker-value ${!value ? 'is-placeholder' : ''}`}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
      </div>

      {isOpen && rect && createPortal(
        <div 
          className={`agent-datepicker-dropdown ${rect.openUp ? 'open-up' : 'open-down'}`}
          style={{
            position: 'fixed',
            ...(rect.openUp 
                ? { bottom: `${window.innerHeight - rect.top + 4}px` } 
                : { top: `${rect.bottom + 4}px` }),
            left: `${rect.left}px`,
            zIndex: 99999
          }}
        >
          <div className="agent-datepicker-header">
            <button onClick={handlePrevMonth} type="button" aria-label="Previous Month">
              <ChevronLeft size={16} />
            </button>
            
            <div className="agent-datepicker-month-year">
              <select 
                className="agent-datepicker-select" 
                value={viewDate.getMonth()} 
                onChange={handleMonthChange}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select 
                className="agent-datepicker-select" 
                value={viewDate.getFullYear()} 
                onChange={handleYearChange}
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button onClick={handleNextMonth} type="button" aria-label="Next Month">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="agent-datepicker-grid">
            {DAYS.map(day => (
              <div key={day} className="agent-datepicker-day-name">{day}</div>
            ))}
            {renderCalendarDays()}
          </div>

          <div className="agent-datepicker-footer">
            <button type="button" onClick={handleClear}>Clear</button>
            <button type="button" onClick={handleToday}>Today</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
