import './Footer.css';

const Footer = () => {
  return (
    <footer className="auth-footer">
      <div className="footer-inner">
        <p className="footer-copy">© 2025 Sivels Finance. All rights reserved.</p>
        <nav className="footer-links" aria-label="Footer">
          <span className="footer-link">Privacy Policy</span>
          <span className="footer-link">Terms of Service</span>
          <span className="footer-link">Support</span>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
