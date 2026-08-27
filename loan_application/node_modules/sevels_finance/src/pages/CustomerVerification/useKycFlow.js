import { useState } from 'react';
import { MOCK_AADHAAR, MOCK_PAN } from './mockData';

/* Two-phase overlay timing: conic loading, then shield-check success. */
const LOADING_DURATION = 3000;
const SUCCESS_DURATION = 2000;

/* Per-step captions for the loading and success phases. */
const STEP_MESSAGES = {
  digiLocker: { loading: 'Connecting to DigiLocker...', success: 'Connected securely' },
  otp: { loading: 'Verifying OTP...', success: 'OTP Verified' },
  aadhaar: { loading: 'Fetching Aadhaar...', success: 'Aadhaar Verified' },
  pan: { loading: 'Verifying PAN...', success: 'PAN Verified' },
};

/**
 * Owns the entire KYC workflow state so the UI components stay presentational.
 * Each verification exposes a status: 'locked' | 'pending' | 'verifying' | 'verified'.
 * Backend calls can later replace the setTimeout blocks without touching the UI.
 */
export const useKycFlow = () => {
  const [aadhaarStatus, setAadhaarStatus] = useState('pending');
  const [panStatus, setPanStatus] = useState('locked');
  const [creditScoreStatus, setCreditScoreStatus] = useState('locked');

  const [aadhaarData, setAadhaarData] = useState(null);
  const [panData, setPanData] = useState(null);
  const [creditScoreData, setCreditScoreData] = useState(null);

  const [activeModal, setActiveModal] = useState(null);
  const [mobileNumber, setMobileNumber] = useState('');
  const [loadingPhase, setLoadingPhase] = useState(null); // 'loading' | 'success' | null
  const [loadingMessage, setLoadingMessage] = useState('');

  /* Runs the loading overlay (conic) then the success overlay (shield),
     then reveals the result via onComplete. */
  const runStep = (messages, onComplete) => {
    setLoadingPhase('loading');
    setLoadingMessage(messages.loading);
    window.setTimeout(() => {
      setLoadingPhase('success');
      setLoadingMessage(messages.success);
      window.setTimeout(() => {
        setLoadingPhase(null);
        setLoadingMessage('');
        onComplete();
      }, SUCCESS_DURATION);
    }, LOADING_DURATION);
  };

  const closeModal = () => setActiveModal(null);
  const openDigiLocker = () => setActiveModal('digilocker');

  const submitMobileNumber = (number) => {
    setMobileNumber(number);
    setActiveModal(null);
    runStep(STEP_MESSAGES.digiLocker, () => setActiveModal('otp'));
  };

  const verifyOtp = () => {
    setActiveModal(null);
    runStep(STEP_MESSAGES.otp, () => setActiveModal('consent'));
  };

  const allowConsent = () => {
    setActiveModal(null);
    setAadhaarStatus('verifying');
    runStep(STEP_MESSAGES.aadhaar, () => {
      setAadhaarData(MOCK_AADHAAR);
      setAadhaarStatus('verified');
      setPanStatus('pending');
    });
  };

  const verifyPan = (panNumber) => {
    setPanStatus('verifying');
    runStep(STEP_MESSAGES.pan, () => {
      setPanData({ ...MOCK_PAN, number: panNumber });
      setPanStatus('verified');
      fetchCreditScore();
    });
  };

  const fetchCreditScore = () => {
    setCreditScoreStatus('verifying');
    setLoadingPhase('orbit');
    setLoadingMessage('Connecting to Credit Bureau...');
    
    window.setTimeout(() => {
      setLoadingMessage('Fetching Credit Score...');
      window.setTimeout(() => {
        setLoadingMessage('Calculating Eligibility...');
        window.setTimeout(() => {
          setLoadingPhase(null);
          setLoadingMessage('');
          setCreditScoreData({
            score: 782,
            maxLoan: '₹5,00,000',
            interestRate: '10.5%',
            category: 'Excellent'
          });
          setCreditScoreStatus('verified');
        }, 1500);
      }, 1500);
    }, 1500);
  };

  const isKycComplete =
    aadhaarStatus === 'verified' && panStatus === 'verified' && creditScoreStatus === 'verified';

  return {
    aadhaarStatus,
    panStatus,
    creditScoreStatus,
    aadhaarData,
    panData,
    creditScoreData,
    activeModal,
    mobileNumber,
    loadingPhase,
    loadingMessage,
    isKycComplete,
    openDigiLocker,
    closeModal,
    submitMobileNumber,
    verifyOtp,
    allowConsent,
    verifyPan,
  };
};
