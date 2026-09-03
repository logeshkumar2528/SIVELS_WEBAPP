import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  ChevronDown, Menu, X, Search, Check, Database,
  Percent, Type, Users, Network, FileText,
  CreditCard, Package, Target, Repeat, User, Heart, Building, 
  Map, Building2, Briefcase, Landmark, Globe, MapPin, Link, 
  Layers, ShieldCheck, Home, Key, GraduationCap, Star, Contact, Shield, TrendingUp, LogOut
} from 'lucide-react';
import './Navbar.css';

const MASTERS_MENU = [
  { label: 'Interest Type', path: '/masters/interest-type', icon: Percent },
  { label: 'Title', path: '/masters/title', icon: Type },
  { label: 'Relationship', path: '/masters/relationship', icon: Users },
  { label: 'Sourcing Channel', path: '/masters/sourcing-channel', icon: Network },
  { label: 'Document Type', path: '/masters/document-type', icon: FileText },
  { label: 'Loan Type', path: '/masters/loan-type', icon: CreditCard },
  { label: 'Loan Product', path: '/masters/loan-product', icon: Package },
  { label: 'Loan Purpose', path: '/masters/loan-purpose', icon: Target },
  { label: 'Loan Transaction Type', path: '/masters/loan-transaction-type', icon: Repeat },
  { label: 'Gender', path: '/masters/gender', icon: User },
  { label: 'Marital Status', path: '/masters/marital-status', icon: Heart },
  { label: 'Bank Branch', path: '/masters/bank-branch', icon: Building },
  { label: 'State', path: '/masters/state', icon: Map },
  { label: 'City', path: '/masters/city', icon: Building2 },
  { label: 'Employment Type', path: '/masters/employment-type', icon: Briefcase },
  { label: 'Bank', path: '/masters/bank', icon: Landmark },
  { label: 'Country', path: '/masters/country', icon: Globe },
  { label: 'District', path: '/masters/district', icon: MapPin },
  { label: 'Employment Doc Mapping', path: '/masters/employment-type-document-mapping', icon: Link },
  { label: 'Loan Product Variation', path: '/masters/loan-product-variation', icon: Layers },
  { label: 'Verification', path: '/masters/verification', icon: ShieldCheck },
  { label: 'Property', path: '/masters/property', icon: Home },
  { label: 'Property Usage', path: '/masters/property-usage', icon: Key },
  { label: 'Education', path: '/masters/education', icon: GraduationCap },
  { label: 'Religion', path: '/masters/religion', icon: Star },
  { label: 'Caste', path: '/masters/caste', icon: Contact },
  { label: 'Loan Product Collateral', path: '/masters/loan-product-collateral', icon: Shield },
  { label: 'Rate Of Interest', path: '/masters/rate-of-interest', icon: TrendingUp }
];

export function Navbar() {
  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const location = useLocation();
  const handleLogout = () => {
    localStorage.removeItem('sivels_currentUser');
    localStorage.removeItem('sivels_permissions');
    localStorage.removeItem('sivels_roles');
    window.location.href = '/login';
  };

  const isMastersActive = location.pathname.startsWith('/masters');
  const activeMaster = MASTERS_MENU.find(m => location.pathname.includes(m.path));

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMastersOpen(false);
        setSearchTerm(''); // Reset search on close
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMastersOpen(false);
        setSearchTerm('');
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
    setSearchTerm('');
  };

  const filteredMasters = MASTERS_MENU.filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              className={`nav-link dropdown-toggle master-dropdown-trigger ${isMastersActive || isMastersOpen ? 'active' : ''}`}
              onClick={() => setIsMastersOpen(!isMastersOpen)}
              aria-expanded={isMastersOpen}
            >
              <div className="master-trigger-content">
                <Database size={18} className="master-trigger-icon" />
                <span>Masters</span>
              </div>
              <ChevronDown size={16} />
            </button>
            
            {isMastersOpen && (
              <div className="nav-dropdown-menu master-mega-menu">
                <div className="master-search-container">
                  <Search size={16} className="master-search-icon" />
                  <input 
                    type="text" 
                    className="master-search-input"
                    placeholder="Search master data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="master-list-grid">
                  {filteredMasters.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.includes(item.path);
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={`dropdown-item ${isActive ? 'active' : ''}`}
                        onClick={closeMenus}
                      >
                        <div className="dropdown-item-left">
                          {Icon && <Icon size={16} className="dropdown-item-icon" />}
                          <span>{item.label}</span>
                        </div>
                        {isActive && <Check size={16} className="dropdown-item-check" />}
                      </NavLink>
                    );
                  })}
                  {filteredMasters.length === 0 && (
                    <div className="master-no-results">No masters found matching your search.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <button className="navbar-logout" onClick={handleLogout}><LogOut size={17} /> <span>Logout</span></button>
      </div>
    </nav>
  );
}

