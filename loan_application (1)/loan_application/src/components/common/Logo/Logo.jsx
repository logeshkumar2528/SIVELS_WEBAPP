import './Logo.css';

import logoImage from '../../../assets/logo.png';

const Logo = () => {
  return (
    <div className="logo-container">
      <img src={logoImage} alt="Sivels Finance Logo" style={{ height: '40px', objectFit: 'contain' }} />
      <span className="logo-text">Sivels Finance</span>
    </div>
  );
};

export default Logo;
