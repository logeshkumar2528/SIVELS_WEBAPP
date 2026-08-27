import "./ConicRingLoader.css";

/**
 * ConicRingLoader
 * A smooth rotating conic-gradient ring — used for the "loading" phase.
 *
 * Props:
 *  - label : string — caption text shown below the ring
 */
export default function ConicRingLoader({ label = "Loading" }) {
  return (
    <div className="crl-wrap" role="status" aria-live="polite">
      <div className="crl-ring" />

      <div className="crl-caption">
        {label}
        <span className="crl-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </div>
    </div>
  );
}
