import "./RisingBarsLoader.css";

/**
 * RisingBarsLoader
 * An equalizer of bars rising and falling — used for page transitions.
 *
 * Props:
 *  - label : string — optional caption shown below the bars
 */
export default function RisingBarsLoader({ label }) {
  return (
    <div className="rbl-wrap" role="status" aria-live="polite">
      <div className="rbl-bars">
        <span />
        <span />
        <span />
        <span />
      </div>

      {label && (
        <div className="rbl-caption">
          {label}
          <span className="rbl-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      )}
    </div>
  );
}
