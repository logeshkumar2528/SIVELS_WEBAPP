import React from 'react';

export function MasterStatusCheckbox({ isActive, onChange, disabled }) {
  return (
    <div className="form-group-checkbox" style={{ display: 'flex', gap: 'var(--spacing-xl)' }}>
      <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <input
          type="checkbox"
          checked={isActive === true}
          onChange={() => {
            if (isActive !== true) onChange(true);
          }}
          disabled={disabled}
        />
        <span>Active</span>
      </label>

      <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <input
          type="checkbox"
          checked={isActive === false}
          onChange={() => {
            if (isActive !== false) onChange(false);
          }}
          disabled={disabled}
        />
        <span>Inactive</span>
      </label>
    </div>
  );
}
