import ConicRingLoader from './ConicRingLoader/ConicRingLoader';
import ShieldCheckLoader from './ShieldCheckLoader/ShieldCheckLoader';
import RisingBarsLoader from './RisingBarsLoader/RisingBarsLoader';
import OrbitingCoinsLoader from './OrbitingCoinsLoader/OrbitingCoinsLoader';
import './LoadingOverlay.css';

const LOADERS = {
  loading: ConicRingLoader,
  success: ShieldCheckLoader,
  bars: RisingBarsLoader,
  orbit: OrbitingCoinsLoader,
};

/**
 * LoadingOverlay
 * Fullscreen, interaction-blocking overlay that centers a loader animation.
 *
 * Props:
 *  - isOpen  : boolean — renders the overlay when true
 *  - message : string  — caption passed to the active loader
 *  - variant : 'loading' | 'success' | 'bars' — which animation to show
 */
const LoadingOverlay = ({ isOpen, message, variant = 'loading' }) => {
  if (!isOpen) return null;

  const Loader = LOADERS[variant] ?? ConicRingLoader;

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-overlay__panel">
        <Loader label={message} />
      </div>
    </div>
  );
};

export default LoadingOverlay;
