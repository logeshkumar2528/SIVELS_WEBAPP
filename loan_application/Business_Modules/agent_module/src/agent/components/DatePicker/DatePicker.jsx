import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import './DatePicker.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
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

function toDateStr(year, month, day) {
  const y = String(year);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatSingleDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(monthIdx) && !isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = MONTH_NAMES_SHORT[monthIdx];
      return `${dayStr} ${monthStr} ${year}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = MONTH_NAMES_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${dayStr} ${monthStr} ${year}`;
}

function formatRangeDisplay(value, tempStart) {
  if (tempStart) {
    return `${formatSingleDate(tempStart)} - Select end date`;
  }
  if (value && typeof value === 'object') {
    const { startDate, endDate } = value;
    if (startDate && endDate) {
      return `${formatSingleDate(startDate)} - ${formatSingleDate(endDate)}`;
    }
    if (startDate) {
      return `${formatSingleDate(startDate)}`;
    }
    return '';
  }
  if (typeof value === 'string' && value) {
    return formatSingleDate(value);
  }
  return '';
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
  const [tempStart, setTempStart] = useState(null);
  const triggerRef = useRef(null);

  // Determine initial view date from value
  const getInitialDate = () => {
    let dateVal = null;
    if (value && typeof value === 'object') {
      dateVal = value.startDate || value.endDate;
    } else if (typeof value === 'string' && value) {
      dateVal = value;
    }
    if (dateVal && !isNaN(new Date(dateVal).getTime())) {
      return new Date(dateVal);
    }
    return new Date();
  };

  const [viewDate, setViewDate] = useState(getInitialDate);

  useEffect(() => {
    let dateVal = null;
    if (value && typeof value === 'object') {
      dateVal = value.startDate || value.endDate;
    } else if (typeof value === 'string' && value) {
      dateVal = value;
    }
    if (dateVal && !isNaN(new Date(dateVal).getTime())) {
      setViewDate(new Date(dateVal));
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      setTempStart(null);
      return;
    }

    const handleDocumentClick = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest('.agent-datepicker-dropdown')) return;
      setIsOpen(false);
      setTempStart(null);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setTempStart(null);
      }
    };

    const handleScroll = (e) => {
      if (e.target instanceof Element && e.target.closest('.agent-datepicker-dropdown')) return;
      setIsOpen(false);
      setTempStart(null);
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

      setTempStart(null);
      setViewDate(getInitialDate());
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
    setViewDate(new Date(viewDate.getFullYear(), parseInt(e.target.value, 10), 1));
  };

  const handleYearChange = (e) => {
    setViewDate(new Date(parseInt(e.target.value, 10), viewDate.getMonth(), 1));
  };

  const handleDateSelect = (day) => {
    const clickedDateStr = toDateStr(viewDate.getFullYear(), viewDate.getMonth(), day);

    if (!tempStart) {
      // First click: select start date and keep calendar open
      setTempStart(clickedDateStr);
    } else {
      // Second click: determine start and end date
      let startDate = tempStart;
      let endDate = clickedDateStr;
      if (clickedDateStr < tempStart) {
        startDate = clickedDateStr;
        endDate = tempStart;
      }
      onChange && onChange({ startDate, endDate });
      setTempStart(null);
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setTempStart(null);
    onChange && onChange({ startDate: '', endDate: '' });
    setIsOpen(false);
  };

  const handleToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
    onChange && onChange({ startDate: todayStr, endDate: todayStr });
    setTempStart(null);
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
    const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    // Resolve active range boundaries
    let rangeStart = null;
    let rangeEnd = null;

    if (tempStart) {
      rangeStart = tempStart;
      rangeEnd = null;
    } else if (value && typeof value === 'object') {
      rangeStart = value.startDate || null;
      rangeEnd = value.endDate || null;
    } else if (typeof value === 'string' && value) {
      rangeStart = value;
      rangeEnd = value;
    }

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
      const currentDateStr = toDateStr(year, month, i);
      const currentDate = new Date(year, month, i);
      const isDisabled = maxDate && currentDate > maxDate;

      const isToday = currentDateStr === todayStr;
      const isRangeStart = rangeStart && currentDateStr === rangeStart;
      const isRangeEnd = rangeEnd && currentDateStr === rangeEnd;
      const isInRange = rangeStart && rangeEnd && currentDateStr > rangeStart && currentDateStr < rangeEnd;

      let dayClasses = ['agent-datepicker-day'];
      if (isToday) dayClasses.push('today');
      if (isDisabled) dayClasses.push('disabled');

      if (isRangeStart && isRangeEnd) {
        dayClasses.push('selected', 'range-start', 'range-end', 'single-range');
      } else if (isRangeStart) {
        dayClasses.push('selected', 'range-start');
      } else if (isRangeEnd) {
        dayClasses.push('selected', 'range-end');
      } else if (isInRange) {
        dayClasses.push('in-range');
      }

      days.push(
        <div
          key={`day-${i}`}
          className={dayClasses.join(' ')}
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

  const displayText = formatRangeDisplay(value, tempStart);

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
        <span className={`agent-datepicker-value ${!displayText ? 'is-placeholder' : ''}`}>
          {displayText || placeholder}
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
