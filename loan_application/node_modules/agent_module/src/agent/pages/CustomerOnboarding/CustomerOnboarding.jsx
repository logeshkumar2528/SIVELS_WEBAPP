import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, CheckCircle2 } from 'lucide-react';
import Stepper from './components/Stepper';
import StepCustomerDetails from './components/StepCustomerDetails';
import StepEmployment from './components/StepEmployment';
import StepAddress from './components/StepAddress';
import StepReview from './components/StepReview';
import { masterService } from '../../../../../../Core/src/services/masterService';
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService';
import './CustomerOnboarding.css';

const steps = [
  { id: 1, label: 'Customer' },
  { id: 2, label: 'Employment' },
  { id: 3, label: 'Address' },
  { id: 4, label: 'Review' }
];

const CustomerOnboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', isError: false });
  const [submitted, setSubmitted] = useState(false);

  // Master Data
  const [masters, setMasters] = useState({
    titles: [],
    genders: [],
    maritalStatuses: [],
    employmentTypes: [],
    countries: [],
    states: [],
    districts: [],
    cities: []
  });

  const [formData, setFormData] = useState({
    // Step 1: Customer Details
    title: '',
    firstName: '',
    lastName: '',
    mobileNumber: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    
    // Step 2: Employment
    employmentTypeId: '',
    employerName: '',
    designation: '',
    salary: '',
    gstNumber: '',
    annualTurnover: '',
    natureOfBusiness: '',
    
    // Step 3: Address
    currentCountry: '',
    currentState: '',
    currentDistrict: '',
    currentCity: '',
    currentAddress: '',
    sameAsCurrent: true,
    permanentCountry: '',
    permanentState: '',
    permanentDistrict: '',
    permanentCity: '',
    permanentAddress: '',
  });

  useEffect(() => {
    fetchMasters();
  }, []);

  const fetchMasters = async () => {
    try {
      const [titles, genders, maritalStatuses, empTypes, countries, states, districts, cities] = await Promise.all([
        masterService.getTitles().catch(() => []),
        masterService.getGenders().catch(() => []),
        masterService.getMaritalStatuses().catch(() => []),
        masterService.getEmploymentTypes().catch(() => []),
        masterService.getCountries().catch(() => []),
        masterService.getStates().catch(() => []),
        masterService.getDistricts().catch(() => []),
        masterService.getCities().catch(() => [])
      ]);
      
      const extractArray = (res) => Array.isArray(res) ? res : (res?.data || []);
      
      setMasters({
        titles: extractArray(titles),
        genders: extractArray(genders),
        maritalStatuses: extractArray(maritalStatuses),
        employmentTypes: extractArray(empTypes),
        countries: extractArray(countries),
        states: extractArray(states),
        districts: extractArray(districts),
        cities: extractArray(cities)
      });
    } catch (err) {
      console.error("Failed to fetch masters", err);
    }
  };

  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => setToast({ show: false, message: '', isError: false }), 3000);
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Map back to API contract
      const payload = {
        mobileNumber: formData.mobileNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus,
        email: formData.email,
        currentAddress: formData.currentAddress,
        permanentAddress: formData.sameAsCurrent ? formData.currentAddress : formData.permanentAddress,
        employerName: formData.employerName,
        designation: formData.designation,
        salary: formData.salary ? Number(formData.salary) : 0,
        gstNumber: formData.gstNumber,
        annualTurnover: formData.annualTurnover,
        natureOfBusiness: formData.natureOfBusiness
      };

      await agentCustomerService.registerCustomer(payload);
      setSubmitted(true);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('duplicate')) {
        showToast('A customer with this mobile number already exists.', true);
      } else {
        showToast(err.message || 'Failed to register customer', true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="std-page">
        <div className="onboarding-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <CheckCircle2 size={64} color="#166534" style={{ margin: '0 auto 1rem' }} />
          <h2>Customer Created Successfully</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            {formData.firstName} {formData.lastName} ({formData.mobileNumber}) has been added to your customers.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="std-btn std-btn-secondary" onClick={() => navigate('/Agent/dashboard')}>
              Go to Dashboard
            </button>
            <button className="std-btn std-btn-primary" onClick={() => {
              setFormData({
                title: '', firstName: '', lastName: '', mobileNumber: '', email: '', dateOfBirth: '',
                gender: '', maritalStatus: '', employmentTypeId: '', employerName: '', designation: '',
                salary: '', gstNumber: '', annualTurnover: '', natureOfBusiness: '',
                currentCountry: '', currentState: '', currentDistrict: '', currentCity: '', currentAddress: '',
                sameAsCurrent: true, permanentCountry: '', permanentState: '', permanentDistrict: '',
                permanentCity: '', permanentAddress: '',
              });
              setCurrentStep(1);
              setSubmitted(false);
            }}>
              Add Another Customer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="std-page">
      <div className="onboarding-container">
        <div className="std-header">
          <h2>Add New Customer</h2>
        </div>
        
        <div className="onboarding-card">
          <Stepper steps={steps} currentStep={currentStep} />
          
          {currentStep === 1 && (
            <StepCustomerDetails 
              formData={formData} 
              handleChange={handleChange} 
              masters={masters} 
              onNext={handleNext} 
            />
          )}
          
          {currentStep === 2 && (
            <StepEmployment 
              formData={formData} 
              handleChange={handleChange} 
              masters={masters} 
              onNext={handleNext} 
              onBack={handleBack} 
            />
          )}
          
          {currentStep === 3 && (
            <StepAddress 
              formData={formData} 
              handleChange={handleChange} 
              masters={masters} 
              onNext={handleNext} 
              onBack={handleBack} 
            />
          )}
          
          {currentStep === 4 && (
            <StepReview 
              formData={formData} 
              masters={masters} 
              onEditStep={setCurrentStep}
              onSubmit={handleSubmit}
              onBack={handleBack}
              loading={loading}
            />
          )}
        </div>
      </div>

      {toast.show && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          backgroundColor: toast.isError ? '#fee2e2' : '#dcfce7',
          color: toast.isError ? '#991b1b' : '#166534',
          padding: '1rem 1.5rem', borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 10000
        }}>
          <CheckCircle2 size={20} />
          <div>
            <div style={{ fontWeight: 600 }}>{toast.isError ? 'Error' : 'Success'}</div>
            <div style={{ fontSize: '0.875rem' }}>{toast.message}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOnboarding;
