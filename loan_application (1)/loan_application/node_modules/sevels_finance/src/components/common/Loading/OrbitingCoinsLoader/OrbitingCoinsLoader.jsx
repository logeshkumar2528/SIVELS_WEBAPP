import React from "react";
import "./OrbitingCoinsLoader.css";

/**
 * OrbitingCoinsLoader
 * A ₹ core with two coins orbiting around it — used for review /
 * verification loading states (e.g. loan application processing).
 *
 * Props:
 *  - label   : string  — caption text shown below the animation
 *  - coreSymbol : string — symbol shown in the center core (default "₹")
 */
export default function OrbitingCoinsLoader({
  label = "Reviewing application",
  coreSymbol = "₹",
}) {
  return (
    <div className="ocl-wrap" role="status" aria-live="polite">
      <div className="ocl-orbit-stage">
        <div className="ocl-orbit-core">{coreSymbol}</div>
        <div className="ocl-orbit-path">
          <div className="ocl-orbit-coin" />
        </div>
        <div className="ocl-orbit-path ocl-rev">
          <div className="ocl-orbit-coin" />
        </div>
      </div>

      <div className="ocl-caption">
        {label}
        <span className="ocl-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </div>
    </div>
  );
}
