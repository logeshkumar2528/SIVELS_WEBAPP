import { Search, X } from 'lucide-react';
import './MasterSearch.css';

export function MasterSearch({ value, onChange, placeholder = 'Search...' }) {
  const handleClear = () => {
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className="master-search">
      <Search className="master-search-icon" size={18} aria-hidden="true" />
      <input
        type="text"
        className="master-search-input"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
      />
      {value && (
        <button
          type="button"
          className="master-search-clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
