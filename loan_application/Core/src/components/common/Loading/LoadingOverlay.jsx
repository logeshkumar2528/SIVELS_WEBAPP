import React from 'react';
import ReactDOM from 'react-dom';
import LighthouseLoader from './LighthouseLoader/LighthouseLoader';
import ConicRingLoader from './ConicRingLoader/ConicRingLoader';
import ShieldCheckLoader from './ShieldCheckLoader/ShieldCheckLoader';
import RisingBarsLoader from './RisingBarsLoader/RisingBarsLoader';
import OrbitingCoinsLoader from './OrbitingCoinsLoader/OrbitingCoinsLoader';
import ScanPulseLoader from './ScanPulseLoader/ScanPulseLoader';
import './LoadingOverlay.css';

const LOADERS = {
  lighthouse: LighthouseLoader,
  loading: LighthouseLoader, // Default primary brand loader
  conic: ConicRingLoader,
  success: ShieldCheckLoader,
  shield: ShieldCheckLoader,
  bars: RisingBarsLoader,
  orbit: OrbitingCoinsLoader,
  pulse: ScanPulseLoader,
};

/**
 * LoadingOverlay
 * 
 * Fullscreen or container-scoped modal overlay that centers the active loader.
 * Preserves backwards compatibility for all existing legacy variants while
 * defaulting to the official Sivels LighthouseLoader.
 *
 * Props:
 *  - isOpen       : boolean — Renders overlay when true
 *  - message      : string  — Dynamic primary loading message
 *  - subMessage   : string  — Optional secondary clarification text
 *  - progress     : number  — Optional numeric progress (0–100)
 *  - showProgress : boolean — Whether progress is displayed (default: true if progress defined)
 *  - variant      : 'lighthouse' | 'loading' | 'bars' | 'orbit' | 'shield' | 'pulse' | 'conic'
 *  - fullscreen   : boolean — Whether overlay covers entire viewport (default: true)
 *  - usePortal    : boolean — Mount to document.body via Portal to prevent CSS clipping (default: true)
 */
const LoadingOverlay = ({
  isOpen,
  message = 'Loading...',
  subMessage,
  progress,
  showProgress,
  variant = 'lighthouse',
  fullscreen = true,
  usePortal = true,
}) => {
  if (!isOpen) return null;

  const ActiveLoader = LOADERS[variant] || LighthouseLoader;

  const overlayContent = (
    <div
      className={`loading-overlay ${fullscreen ? 'loading-overlay--fullscreen' : 'loading-overlay--container'}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-overlay__panel">
        <ActiveLoader
          message={message}
          subMessage={subMessage}
          progress={progress}
          showProgress={showProgress}
          label={message} // Compatibility with legacy loaders expecting 'label'
        />
      </div>
    </div>
  );

  // Mount at document.body level when fullscreen to guarantee no CSS overflow/stacking context clipping
  if (fullscreen && usePortal && typeof document !== 'undefined' && document.body) {
    return ReactDOM.createPortal(overlayContent, document.body);
  }

  return overlayContent;
};

export default LoadingOverlay;
