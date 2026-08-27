import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import './Navbar.css';

const MASTERS_MENU = [
  { label: 'Interest Type', path: '/masters/interest-type' },
  { label: 'Title', path: '/masters/title' },
  { label: 'Relationship', path: '/masters/relationship' },
  { label: 'Sourcing Channel', path: '/masters/sourcing-channel' },
  { label: 'Document Type', path: '/masters/document-type' },
  { label: 'Status Role', path: '/masters/status-role' },
  { label: 'Status', path: '/masters/status' },
  { label: 'Loan Type', path: '/masters/loan-type' },
  { label: 'Loan Product', path: '/masters/loan-product' },
  { label: 'Loan Purpose', path: '/masters/loan-purpose' },
  { label: 'Loan Transaction Type', path: '/masters/loan-transaction-type' },
  { label: 'Gender', path: '/masters/gender' },
  { label: 'Marital Status', path: '/masters/marital-status' },
  { label: 'Bank Branch', path: '/masters/bank-branch' },
  { label: 'State', path: '/masters/state' },
  { label: 'City', path: '/masters/city' },
  { label: 'Employment Type', path: '/masters/employment-type' },
  { label: 'Bank', path: '/masters/bank' },
  { label: 'Country', path: '/masters/country' },
  { label: 'District', path: '/masters/district' },
  { label: 'Employment Doc Mapping', path: '/masters/employment-type-document-mapping' },
  { label: 'Loan Product Variation', path: '/masters/loan-product-variation' }
];

export function Navbar() {
  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  const isMastersActive = location.pathname.startsWith('/masters');

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMastersOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMastersOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const closeMenus = () => {
    setIsMastersOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="top-navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <div className="navbar-brand">
            Sivels Finance
          </div>
        </div>

        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`navbar-navigation ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMenus}
          >
            Dashboard
          </NavLink>

          <div className="nav-dropdown-container" ref={dropdownRef}>
            <button 
              className={`nav-link dropdown-toggle ${isMastersActive || isMastersOpen ? 'active' : ''}`}
              onClick={() => setIsMastersOpen(!isMastersOpen)}
              aria-expanded={isMastersOpen}
            >
              Masters <ChevronDown size={16} />
            </button>
            
            {isMastersOpen && (
              <div className="nav-dropdown-menu">
                {MASTERS_MENU.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                    onClick={closeMenus}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
