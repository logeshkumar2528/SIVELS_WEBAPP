import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingOverlay from './LoadingOverlay';

/* How long the page-transition loader stays visible. */
const TRANSITION_DURATION = 1000;

/**
 * Global page-transition loader. Shows the rising-bars overlay on every route
 * change and on the initial load / refresh, for TRANSITION_DURATION. Mount once
 * inside the Router.
 */
const RouteTransitionLoader = () => {
  const { pathname } = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = window.setTimeout(() => setIsLoading(false), TRANSITION_DURATION);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return <LoadingOverlay isOpen={isLoading} variant="bars" message="Loading" />;
};

export default RouteTransitionLoader;
