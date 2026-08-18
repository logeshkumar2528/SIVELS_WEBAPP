import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Step1Details from './Step1Details';
import Step2Documents from './Step2Documents';
import './Register.css';

export default function Register() {
  const { currentStep, setCurrentStep } = useOutletContext();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const handleNext = (stepData) => {
    setFormData(prev => ({ ...prev, ...stepData }));
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleRegister = (stepData) => {
    const finalData = { ...formData, ...stepData };
    console.log("Registering with:", finalData);
    setShowSuccess(true);
  };

  const steps = [
    { id: 1, label: "Basic Details" },
    { id: 2, label: "Document Upload" },
    { id: 3, label: "Account Created" }
  ];

  const stepInfo = {
    1: {
      title: "Create Your Account",
      subtitle: "Fill in the details below to create your account"
    },
    2: {
      title: "Document Verification",
      subtitle: "Upload your documents and verify with Aadhaar OTP"
    }
  };

  const currentStepInfo = stepInfo[currentStep] || stepInfo[1];

  return (
    <>
      <div className="register-container">
        <div className="register-sub-header" style={{ alignItems: 'center' }}>
          <div className="sub-header-title">
            <h2>{currentStepInfo.title}</h2>
            <p>{currentStepInfo.subtitle}</p>
          </div>
        </div>

        <div className="register-content-area">
          {currentStep === 1 ? (
            <Step1Details initialData={formData} onNext={handleNext} />
          ) : (
            <Step2Documents initialData={formData} onBack={handleBack} onRegister={handleRegister} />
          )}
        </div>
      </div>

      {showSuccess && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <CheckCircle size={64} color="var(--color-primary)" style={{ margin: '0 auto 16px auto' }} />
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '12px', fontSize: '24px' }}>Registration Successful!</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', lineHeight: '1.5', fontSize: '14px' }}>
              Your account has been created successfully. Your documents have been submitted for review.
            </p>
            <button 
              className="btn-primary" 
              onClick={() => navigate('/')}
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            >
              Continue to Login
            </button>
          </div>
        </div>
      )}
    </>
  );
}
