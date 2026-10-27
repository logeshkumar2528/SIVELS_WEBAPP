import { useState } from 'react';
import { Search, X, Loader2, UserRound, AlertCircle } from 'lucide-react';

const CUSTOMER_CODE_REGEX = /^CU[A-Z0-9]+$/;

export function ApplicationSearch({ onSearch, onClear, isLoading, currentCustomerCode = '' }) {
  const [customerCodeInput, setCustomerCodeInput] = useState(currentCustomerCode);
  const [validationError, setValidationError] = useState('');

  const handleInputChange = (e) => {
    const rawVal = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    setCustomerCodeInput(rawVal);
    if (validationError) {
      setValidationError('');
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const cleanCustomerCode = customerCodeInput.trim().toUpperCase();

    if (!cleanCustomerCode) {
      setValidationError('Please enter a customer code.');
      return;
    }

    if (!CUSTOMER_CODE_REGEX.test(cleanCustomerCode)) {
      setValidationError('Please enter a valid customer code beginning with CU.');
      return;
    }

    setValidationError('');
    onSearch(cleanCustomerCode);
  };

  const handleClear = () => {
    setCustomerCodeInput('');
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
          <UserRound className="app360-search-icon" size={20} />
          <input
            type="text"
            className={`app360-search-input ${validationError ? 'has-error' : ''}`}
            placeholder="Enter customer code (e.g. CU000018)..."
            value={customerCodeInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            maxLength={20}
            autoFocus
            disabled={isLoading}
            aria-label="Customer Code Search"
          />
          {customerCodeInput && !isLoading && (
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
            disabled={isLoading || !customerCodeInput.trim()}
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
