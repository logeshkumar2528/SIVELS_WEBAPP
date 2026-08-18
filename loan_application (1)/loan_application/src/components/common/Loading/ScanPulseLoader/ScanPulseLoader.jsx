import "./ScanPulseLoader.css";

/**
 * ScanPulseLoader
 * A ₹ core with radar-style pulse rings expanding outward — used for
 * verification / scanning loading states (e.g. KYC processing).
 *
 * Props:
 *  - label      : string — caption text shown below the animation
 *  - coreSymbol : string — symbol shown in the center core (default "₹")
 */
export default function ScanPulseLoader({ label = "Loading", coreSymbol = "₹" }) {
  return (
    <div className="spl-wrap" role="status" aria-live="polite">
      <div className="spl-stage">
        <span className="spl-ring" />
        <span className="spl-ring" />
        <span className="spl-core">{coreSymbol}</span>
      </div>

      <div className="spl-caption">
        {label}
        <span className="spl-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </div>
    </div>
  );
}
