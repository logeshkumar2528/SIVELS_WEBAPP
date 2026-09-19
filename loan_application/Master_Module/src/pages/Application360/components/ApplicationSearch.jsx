import { useState } from 'react';
import { Search, X, Loader2, CreditCard, AlertCircle } from 'lucide-react';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function ApplicationSearch({ onSearch, onClear, isLoading, currentPan = '' }) {
  const [panInput, setPanInput] = useState(currentPan);
  const [validationError, setValidationError] = useState('');

  const handleInputChange = (e) => {
    const rawVal = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setPanInput(rawVal);
    if (validationError) {
      setValidationError('');
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const cleanPan = panInput.trim().toUpperCase();

    if (!cleanPan) {
      setValidationError('Please enter a PAN number.');
      return;
    }

    if (!PAN_REGEX.test(cleanPan)) {
      setValidationError('Please enter a valid 10-character PAN (5 letters, 4 digits, 1 letter).');
      return;
    }

    setValidationError('');
    onSearch(cleanPan);
  };

  const handleClear = () => {
    setPanInput('');
    setValidationError('');
    if (onClear) onClear();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="app360-search-container">
      <form className="app360-search-form" onSubmit={handleSubmit}>
        <div className="app360-search-input-wrapper">
          <CreditCard className="app360-search-icon" size={20} />
          <input
            type="text"
            className={`app360-search-input ${validationError ? 'has-error' : ''}`}
            placeholder="Enter 10-character PAN Number..."
            value={panInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            maxLength={10}
            autoFocus
            disabled={isLoading}
            aria-label="PAN Number Search"
          />
          {panInput && !isLoading && (
            <button
              type="button"
              className="app360-search-clear-btn"
              onClick={handleClear}
              title="Clear search"
              aria-label="Clear search input"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="app360-search-actions">
          <button
            type="submit"
            className="app360-search-btn"
            disabled={isLoading || !panInput.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="app360-spinner" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>Search Application</span>
              </>
            )}
          </button>
        </div>
      </form>

      {validationError && (
        <div className="app360-validation-error">
          <AlertCircle size={14} />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}

export default ApplicationSearch;
