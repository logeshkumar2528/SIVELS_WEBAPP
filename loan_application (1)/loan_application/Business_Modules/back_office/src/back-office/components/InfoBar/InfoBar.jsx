import './InfoBar.css';

/**
 * InfoBar
 * --------------------
 * Reusable horizontal info bar for top of verification pages.
 */
function InfoBar({ fields }) {
  return (
    <div className="info-bar-container" role="region" aria-label="Application details">
      {fields.map((field) => (
        <div key={field.label} className="info-bar-field">
          <span className="info-bar-label">{field.label}</span>
          <span className="info-bar-value">{field.value}</span>
        </div>
      ))}
    </div>
  );
}

export default InfoBar;
