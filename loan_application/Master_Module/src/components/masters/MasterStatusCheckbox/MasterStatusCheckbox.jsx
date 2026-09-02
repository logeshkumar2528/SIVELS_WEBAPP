import React from 'react';
import './MasterStatusCheckbox.css';

export function MasterStatusCheckbox({ isActive, onChange, disabled }) {
  return (
    <div className="form-group">
      <label className="form-label">
        Status <span className="text-danger">*</span>
      </label>
      <div className="status-radio-container">
        <label 
          className={`status-radio-card ${isActive === true ? 'active-card' : ''} ${disabled ? 'disabled-card' : ''}`}
        >
          <input
            type="radio"
            className="status-radio-input"
            checked={isActive === true}
            onChange={() => {
              if (!disabled && isActive !== true) onChange(true);
            }}
            disabled={disabled}
            name="status-radio"
          />
          <div className="status-radio-custom">
            <div className="status-radio-custom-dot"></div>
          </div>
          <div className="status-radio-text">
            <span className="status-radio-title">Active</span>
            <span className="status-radio-subtitle">Enable this interest type</span>
          </div>
        </label>

        <label 
          className={`status-radio-card ${isActive === false ? 'active-card' : ''} ${disabled ? 'disabled-card' : ''}`}
        >
          <input
            type="radio"
            className="status-radio-input"
            checked={isActive === false}
            onChange={() => {
              if (!disabled && isActive !== false) onChange(false);
            }}
            disabled={disabled}
            name="status-radio"
          />
          <div className="status-radio-custom">
            <div className="status-radio-custom-dot"></div>
          </div>
          <div className="status-radio-text">
            <span className="status-radio-title">Inactive</span>
            <span className="status-radio-subtitle">Disable this interest type</span>
          </div>
        </label>
      </div>
    </div>
  );
}
