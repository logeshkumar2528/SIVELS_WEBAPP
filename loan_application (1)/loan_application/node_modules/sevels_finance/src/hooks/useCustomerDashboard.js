import { useState, useEffect } from 'react';

const MOCK_CUSTOMER_DATA = {
  id: 1,
  firstName: "",
  role: "CUSTOMER",
  profileCompleted: false,
  kycCompleted: false,
  notifications: 0,
};

export const useCustomerDashboard = () => {
  const [customerState, setCustomerState] = useState(MOCK_CUSTOMER_DATA);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In the future, this would be an API call:
    // const data = await customerApiService.getDashboard();
    
    // For now, we simulate fetching and use sessionStorage to allow 
    // simulating cross-page state persistence (e.g., if they completed profile)
    const storedState = sessionStorage.getItem('customerDashboardState');
    
    if (storedState) {
      setCustomerState(JSON.parse(storedState));
    } else {
      // Initialize sessionStorage with mock data if not present
      sessionStorage.setItem('customerDashboardState', JSON.stringify(MOCK_CUSTOMER_DATA));
      setCustomerState(MOCK_CUSTOMER_DATA);
    }
    
    // Check if the Profile hook saved draft data, this is just a mock logic 
    // to simulate profile completion for testing the flow
    const profileDraft = sessionStorage.getItem('customerProfileDraft');
    if (profileDraft) {
      try {
        const draft = JSON.parse(profileDraft);
        // Extremely simple mock check: if they have a company name or dob, mark complete
        if (draft.dob || draft.companyName) {
          const updatedState = { ...MOCK_CUSTOMER_DATA, profileCompleted: true };
          sessionStorage.setItem('customerDashboardState', JSON.stringify(updatedState));
          setCustomerState(updatedState);
        }
      } catch (e) {
        console.error("Error parsing profile draft", e);
      }
    }

    setIsLoading(false);
  }, []);

  const updateCustomerState = (updates) => {
    const newState = { ...customerState, ...updates };
    setCustomerState(newState);
    sessionStorage.setItem('customerDashboardState', JSON.stringify(newState));
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });

  const profileCompletionPercent = customerState.profileCompleted ? 100 : 25; // Mock calculation

  return {
    customerState,
    isLoading,
    currentDate,
    profileCompletionPercent,
    updateCustomerState
  };
};
