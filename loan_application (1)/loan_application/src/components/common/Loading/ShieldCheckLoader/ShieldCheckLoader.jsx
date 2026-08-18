import "./ShieldCheckLoader.css";

/**
 * ShieldCheckLoader
 * A shield that pops in while a checkmark draws inside — used for the
 * "success" phase shown after a verification completes.
 *
 * Props:
 *  - label : string — caption text shown below the shield
 */
export default function ShieldCheckLoader({ label = "Verified" }) {
  return (
    <div className="scl-wrap" role="status" aria-live="polite">
      <svg className="scl-shield" width="60" height="60" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          className="scl-body"
          d="M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          className="scl-check"
          d="M8.5 12 l2.4 2.4 L15.6 9.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="scl-caption">{label}</div>
    </div>
  );
}
