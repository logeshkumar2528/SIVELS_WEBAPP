import './MasterFilter.css';

export function MasterFilter({ value, onChange, options }) {
  return (
    <div className="master-filter">
      <select
        className="master-filter-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filter status"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
