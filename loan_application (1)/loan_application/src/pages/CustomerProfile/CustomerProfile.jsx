import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import PersonalInformation from './components/PersonalInformation';
import AddressInformation from './components/AddressInformation';
import EmploymentInformation from './components/EmploymentInformation';
import BankInformation from './components/BankInformation';
import NomineeInformation from './components/NomineeInformation';
import { CheckCircle2 } from 'lucide-react';
import { useCustomerProfile } from '../../hooks/useCustomerProfile';
import './CustomerProfile.css';

const TABS = [
  { id: 'personal', label: '1. Personal' },
  { id: 'address', label: '2. Address' },
  { id: 'employment', label: '3. Employment' },
  { id: 'bank', label: '4. Bank' },
  { id: 'nominee', label: '5. Nominee' },
];

const CustomerProfile = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const navigate = useNavigate();
  
  const { methods, completionPercentage, saveDraft } = useCustomerProfile();
  const { handleSubmit, formState: { isValid, isSubmitting } } = methods;

  const onSubmit = async (data) => {
    console.log('Form Data (Proceed to KYC):', data);
    alert('Profile is complete! Redirecting to KYC...');
    navigate('/kyc');
  };


  const renderActiveTab = () => {
    switch (activeTab) {
      case 'personal': 
        return <PersonalInformation />;
      case 'employment':
        return <EmploymentInformation />;
      case 'address': return <AddressInformation />;
      case 'bank': return <BankInformation />;
      case 'nominee': return <NomineeInformation />;
      default: return <PersonalInformation />;
    }
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '20px'
  };

  return (
    <div style={{ width: '100%', maxWidth: '1320px', margin: '0 auto' }}>
      
      {/* Sticky Header Section */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#f8fafc', paddingTop: '1rem', paddingLeft: 'clamp(1rem, 4vw, 2.5rem)', paddingRight: 'clamp(1rem, 4vw, 2.5rem)' }}>
        
        {/* Top Progress Bar */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', width: '100%', maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#16a34a' }}>
              <CheckCircle2 size={18} />
              <span>Register</span>
            </div>
            <div style={{ flex: 1, height: '2px', backgroundColor: '#16a34a', margin: '0 1rem', maxWidth: '100px' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#2563eb' }}>
              <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '9999px', border: '2px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>2</div>
              <span>Profile</span>
            </div>
            <div style={{ flex: 1, height: '2px', backgroundColor: '#e2e8f0', margin: '0 1rem', maxWidth: '100px' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#94a3b8' }}>
              <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '9999px', border: '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>3</div>
              <span>KYC</span>
            </div>
          </div>
        </div>



        {/* Internal Tabs */}
        <div style={{ ...cardStyle, display: 'flex', overflowX: 'auto' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              style={{
                flex: 1,
                padding: '0.75rem',
                textAlign: 'center',
                fontSize: '0.875rem',
                fontWeight: activeTab === tab.id ? '600' : '500',
                color: activeTab === tab.id ? '#2563eb' : '#64748b',
                background: activeTab === tab.id ? '#eff6ff' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? '#2563eb' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        
      </div>

      {/* Main Form Section */}
      <div style={{ paddingLeft: 'clamp(1rem, 4vw, 2.5rem)', paddingRight: 'clamp(1rem, 4vw, 2.5rem)' }}>
        <div style={{ ...cardStyle, padding: '16px', marginBottom: '16px' }}>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              
              <div>
                {renderActiveTab()}
              </div>

            </form>
          </FormProvider>
        </div>
      </div>

    </div>
  );
};

export default CustomerProfile;


