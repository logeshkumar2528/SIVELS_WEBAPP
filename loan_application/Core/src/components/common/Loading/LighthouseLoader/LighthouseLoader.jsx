import React from 'react';
import './LighthouseLoader.css';
import lighthouseEmblem from '../../../../assets/branding/Logo.png';

/**
 * LighthouseLoader
 * 
 * Official SIVELS Finance branded loader component.
 * Features the authoritative lighthouse emblem with subtle breathing pulse,
 * brand typography, numeric percentage, and horizontal gradient progress bar.
 * 
 * Props:
 *  - message      : string  — Primary dynamic loading status message
 *  - subMessage   : string  — Optional secondary clarification text
 *  - progress     : number  — Progress percentage (0–100)
 *  - showProgress : boolean — Whether to display progress bar and percentage
 */
export default function LighthouseLoader({
  message = 'Loading...',
  subMessage,
  progress,
  showProgress = true,
}) {
  // Safely clamp progress to valid integer between 0 and 100
  const hasProgress = progress !== undefined && progress !== null && !isNaN(Number(progress));
  const numericProgress = hasProgress ? Math.min(100, Math.max(0, Math.round(Number(progress)))) : null;
  const isProgressVisible = showProgress && numericProgress !== null;

  return (
    <div
      className="sivels-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* 1. Lighthouse Emblem with subtle breathing animation */}
      <div className="sivels-loader__emblem-wrap">
        <img
          src={lighthouseEmblem}
          alt="Sivels Finance Logo"
          className="sivels-loader__emblem"
        />
      </div>

      {/* 2. Brand Typography */}
      <div className="sivels-loader__brand" aria-hidden="true">
        <span className="sivels-loader__brand-title">SIVELS</span>
        <span className="sivels-loader__brand-subtitle">FINANCE</span>
      </div>

      {/* 3. Numeric Percentage Display */}
      {isProgressVisible && (
        <div
          className="sivels-loader__percentage"
          aria-label={`Progress: ${numericProgress}%`}
        >
          {numericProgress}%
        </div>
      )}

      {/* 4. Smooth Horizontal Progress Bar */}
      {isProgressVisible && (
        <div
          className="sivels-loader__bar-track"
          role="progressbar"
          aria-valuenow={numericProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Loading progress"
        >
          <div
            className="sivels-loader__bar-fill"
            style={{ width: `${numericProgress}%` }}
          />
        </div>
      )}

      {/* 5. Dynamic Primary Message */}
      {message && (
        <div className="sivels-loader__message">
          {message}
        </div>
      )}

      {/* 6. Optional Sub-Message */}
      {subMessage && (
        <div className="sivels-loader__submessage">
          {subMessage}
        </div>
      )}
    </div>
  );
}
