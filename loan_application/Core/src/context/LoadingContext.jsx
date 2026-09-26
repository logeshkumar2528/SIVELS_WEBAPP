import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import LoadingOverlay from '../components/common/Loading/LoadingOverlay';

const LoadingContext = createContext(null);

// Configuration Constants
const ANTI_FLICKER_DELAY = 200; // ms to wait before making overlay visible
const COMPLETION_HOLD_TIME = 250; // ms to display 100% before fading out
const SIMULATION_INTERVAL = 120; // ms between simulated progress ticks
const MAX_SIMULATED_PROGRESS = 90; // Maximum percentage reached during simulation while pending

/**
 * LoadingProvider
 * 
 * Global loading controller for SIVELS Finance.
 * Implements token-owned operation state, deterministic foreground display stack,
 * isolated per-token simulated and explicit progress, anti-flicker show delay,
 * and final-operation completion transitions.
 */
export const LoadingProvider = ({ children }) => {
  // Visual Overlay State (Reflects the current foreground/top active token)
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessageState] = useState('Processing...');
  const [subMessage, setSubMessageState] = useState(null);
  const [progress, setProgressState] = useState(null);
  const [variant, setVariant] = useState('lighthouse');

  // Active Operations Registry (Map preserving insertion order for token ownership)
  const activeTokensRef = useRef(new Map());
  const antiFlickerTimerRef = useRef(null);
  const simulationIntervalRef = useRef(null);
  const completionTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const nextTokenCounter = useRef(1);

  // Unmount Safety Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (antiFlickerTimerRef.current) clearTimeout(antiFlickerTimerRef.current);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    };
  }, []);

  /**
   * Helper: Retrieve the latest/foreground active token
   * Returns the most recently started active operation
   */
  const getTopToken = useCallback(() => {
    if (activeTokensRef.current.size === 0) return null;
    let lastEntry = null;
    for (const entry of activeTokensRef.current.entries()) {
      lastEntry = entry;
    }
    return lastEntry ? { ...lastEntry[1], id: lastEntry[0] } : null;
  }, []);

  /**
   * Stop simulated progress interval safely
   */
  const clearSimulation = useCallback(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
  }, []);

  /**
   * Ensure centralized simulation scheduler is running for all active simulated tokens
   */
  const ensureSimulationRunning = useCallback(() => {
    if (simulationIntervalRef.current || !isMountedRef.current) return;

    simulationIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current || activeTokensRef.current.size === 0) {
        clearSimulation();
        return;
      }

      let hasAnySimulated = false;

      // Update progress independently for each token that requested simulation
      activeTokensRef.current.forEach((tokenData) => {
        if (tokenData.simulated) {
          hasAnySimulated = true;
          const current = tokenData.progress ?? 10;
          if (current < MAX_SIMULATED_PROGRESS) {
            let increment = 1;
            if (current < 35) increment = 4;
            else if (current < 60) increment = 2.5;
            else if (current < 80) increment = 1.2;
            else increment = 0.4;

            const next = Math.min(MAX_SIMULATED_PROGRESS, current + increment);
            tokenData.progress = Math.round(next * 10) / 10;
          }
        }
      });

      if (!hasAnySimulated) {
        clearSimulation();
        return;
      }

      // Sync visual progress to current top/foreground token
      const top = getTopToken();
      if (top && top.simulated && top.progress !== null) {
        setProgressState(top.progress);
      }
    }, SIMULATION_INTERVAL);
  }, [clearSimulation, getTopToken]);

  /**
   * Set Progress (Token-Scoped or Foreground)
   * 
   * @param {number|null} val - Progress percentage (0–100)
   * @param {string} [targetTokenId] - Specific operation token to update
   */
  const setProgress = useCallback((val, targetTokenId) => {
    if (!isMountedRef.current) return;

    const clamped = (val === null || val === undefined)
      ? null
      : Math.min(100, Math.max(0, Math.round(Number(val) || 0)));

    // 1. Update the target token's own state in the registry
    if (targetTokenId && activeTokensRef.current.has(targetTokenId)) {
      const tokenData = activeTokensRef.current.get(targetTokenId);
      tokenData.progress = clamped;
      tokenData.simulated = false; // Explicit progress disables simulation for this specific token
    } else {
      const top = getTopToken();
      if (top && activeTokensRef.current.has(top.id)) {
        const tokenData = activeTokensRef.current.get(top.id);
        tokenData.progress = clamped;
        tokenData.simulated = false;
      }
    }

    // 2. If the modified token is the currently displayed foreground token, update UI
    const top = getTopToken();
    if (top) {
      if (!targetTokenId || targetTokenId === top.id) {
        setProgressState(top.progress);
      }
    }
  }, [getTopToken]);

  /**
   * Set Message (Token-Scoped or Foreground)
   * 
   * @param {string} [newMessage] - Primary status message
   * @param {string|null} [newSubMessage] - Secondary clarification text
   * @param {string} [targetTokenId] - Specific operation token to update
   */
  const setMessage = useCallback((newMessage, newSubMessage, targetTokenId) => {
    if (!isMountedRef.current) return;

    if (targetTokenId && activeTokensRef.current.has(targetTokenId)) {
      const tokenData = activeTokensRef.current.get(targetTokenId);
      if (newMessage !== undefined) tokenData.message = newMessage;
      if (newSubMessage !== undefined) tokenData.subMessage = newSubMessage;
    } else {
      const top = getTopToken();
      if (top && activeTokensRef.current.has(top.id)) {
        const tokenData = activeTokensRef.current.get(top.id);
        if (newMessage !== undefined) tokenData.message = newMessage;
        if (newSubMessage !== undefined) tokenData.subMessage = newSubMessage;
      }
    }

    const top = getTopToken();
    if (top) {
      if (!targetTokenId || targetTokenId === top.id) {
        if (top.message !== undefined) setMessageState(top.message);
        if (top.subMessage !== undefined) setSubMessageState(top.subMessage);
      }
    }
  }, [getTopToken]);

  /**
   * Show Loader
   * Registers a new operation token with its own isolated metadata and establishes foreground display.
   * 
   * @param {Object} options
   * @param {string} options.message - Primary message (default: 'Processing...')
   * @param {string} options.subMessage - Secondary clarification text (default: null)
   * @param {number} options.progress - Initial explicit progress (0-100)
   * @param {boolean} options.simulated - Whether to simulate progress (default: true if progress not provided)
   * @param {string} options.variant - Loader variant (default: 'lighthouse')
   * @returns {string} Unique operation token to pass to hideLoader()
   */
  const showLoader = useCallback((options = {}) => {
    const tokenId = `op_${nextTokenCounter.current++}_${Date.now()}`;
    const {
      message: msg = 'Processing...',
      subMessage: sub = null,
      progress: initProgress,
      simulated = initProgress === undefined,
      variant: v = 'lighthouse',
    } = options;

    const initialProg = (initProgress !== undefined && initProgress !== null)
      ? Math.min(100, Math.max(0, Math.round(Number(initProgress) || 0)))
      : (simulated ? 10 : null);

    const tokenData = {
      id: tokenId,
      message: msg,
      subMessage: sub,
      progress: initialProg,
      simulated: Boolean(simulated),
      variant: v,
      startTime: Date.now(),
    };

    // Store in token registry (Appends to end of Map, becoming current foreground)
    activeTokensRef.current.set(tokenId, tokenData);

    // Cancel pending completion dismissal if a new operation arrives
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }

    // Set visual state to this newly created foreground token
    setMessageState(tokenData.message);
    setSubMessageState(tokenData.subMessage);
    setProgressState(tokenData.progress);
    setVariant(tokenData.variant);

    // Ensure scheduler is active if simulation is requested
    if (tokenData.simulated) {
      ensureSimulationRunning();
    }

    // If this is the first active operation, initiate anti-flicker delay
    if (activeTokensRef.current.size === 1) {
      if (antiFlickerTimerRef.current) clearTimeout(antiFlickerTimerRef.current);
      antiFlickerTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && activeTokensRef.current.size > 0) {
          setIsOpen(true);
        }
      }, ANTI_FLICKER_DELAY);
    }

    return tokenId;
  }, [ensureSimulationRunning]);

  /**
   * Hide Loader
   * Releases an operation token.
   * If other operations remain active, restores the latest remaining operation's state.
   * If the final operation has completed, triggers the 100% completion transition.
   * 
   * @param {string} [tokenId] - Specific operation token returned by showLoader()
   */
  const hideLoader = useCallback((tokenId) => {
    if (tokenId) {
      if (!activeTokensRef.current.has(tokenId)) {
        return; // Safe no-op for invalid or already-released tokens
      }
      activeTokensRef.current.delete(tokenId);
    } else {
      const top = getTopToken();
      if (top) {
        activeTokensRef.current.delete(top.id);
      } else {
        return;
      }
    }

    // Case 1: Other active operations still exist in the stack
    if (activeTokensRef.current.size > 0) {
      const nextTop = getTopToken();
      if (nextTop) {
        // Deterministically restore the previous active operation's own metadata
        setMessageState(nextTop.message);
        setSubMessageState(nextTop.subMessage);
        setProgressState(nextTop.progress);
        setVariant(nextTop.variant);

        if (nextTop.simulated) {
          ensureSimulationRunning();
        }
      }
      return;
    }

    // Case 2: The FINAL active operation has settled (activeTokens count === 0)
    if (antiFlickerTimerRef.current) {
      clearTimeout(antiFlickerTimerRef.current);
      antiFlickerTimerRef.current = null;
    }
    clearSimulation();

    // If operation completed before the 200ms anti-flicker window expired:
    // Close cleanly with ZERO flicker (overlay was never rendered)
    if (!isOpen) {
      setProgressState(null);
      setSubMessageState(null);
      return;
    }

    // If overlay is currently visible, animate to 100% and hold briefly for smooth finish
    setProgressState(100);

    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    completionTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && activeTokensRef.current.size === 0) {
        setIsOpen(false);
        setProgressState(null);
        setSubMessageState(null);
      }
    }, COMPLETION_HOLD_TIME);
  }, [clearSimulation, ensureSimulationRunning, getTopToken, isOpen]);

  /**
   * withLoading Helper
   * Wraps an asynchronous callback with token-scoped helpers and automatic lifecycle management.
   */
  const withLoading = useCallback(async (asyncFn, options = {}) => {
    const token = showLoader(options);
    try {
      return await asyncFn({
        setProgress: (val) => setProgress(val, token),
        setMessage: (newMsg, newSubMsg) => setMessage(newMsg, newSubMsg, token),
      });
    } finally {
      hideLoader(token);
    }
  }, [showLoader, hideLoader, setProgress, setMessage]);

  const contextValue = {
    isOpen,
    progress,
    message,
    subMessage,
    showLoader,
    hideLoader,
    setProgress,
    setMessage,
    withLoading,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      <LoadingOverlay
        isOpen={isOpen}
        message={message}
        subMessage={subMessage}
        progress={progress}
        variant={variant}
      />
    </LoadingContext.Provider>
  );
};

/**
 * useLoading Hook
 * Consumed by components to trigger global loading sequences.
 */
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a <LoadingProvider>');
  }
  return context;
};

export default LoadingContext;
