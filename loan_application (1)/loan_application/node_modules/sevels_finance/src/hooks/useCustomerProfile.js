import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';

// Zod Validation Schema
const customerProfileSchema = z.object({
  // Personal Info
  dob: z.string().min(1, { message: 'Date of Birth is required' }),
  gender: z.string().min(1, { message: 'Gender is required' }),
  maritalStatus: z.string().min(1, { message: 'Marital Status is required' }),
  nationality: z.string().min(1, { message: 'Nationality is required' }),
  occupation: z.string().min(1, { message: 'Occupation is required' }),
  employmentType: z.enum(['salaried', 'business'], { required_error: 'Employment Type is required' }),
  companyName: z.string().min(1, { message: 'Company Name is required' }),
  monthlySalary: z.string().optional(),
  annualIncome: z.string().min(1, { message: 'Annual Income is required' }),
  annualTurnover: z.string().optional(),
  
  // Address Info
  currentAddress: z.string().min(1, { message: 'Current Address is required' }),
  currentPinCode: z.string().min(6, { message: 'Valid PIN code is required' }),
  currentCity: z.string().min(1, { message: 'City is required' }),
  currentState: z.string().min(1, { message: 'State is required' }),
  sameAsCurrentAddress: z.boolean().default(false),
  permanentAddress: z.string().min(1, { message: 'Permanent Address is required' }),
  permanentPinCode: z.string().min(6, { message: 'Valid PIN code is required' }),
  permanentCity: z.string().min(1, { message: 'City is required' }),
  permanentState: z.string().min(1, { message: 'State is required' }),
  communicationAddress: z.string().min(1, { message: 'Communication Address preference is required' }),

  // Bank Info
  bankAccountNumber: z.string().min(5, { message: 'Valid Account Number is required' }),
  ifscCode: z.string().min(11, { message: 'Valid IFSC code is required' }),

  // Nominee Info
  nomineeName: z.string().min(1, { message: 'Nominee Name is required' }),
  nomineeRelationship: z.string().min(1, { message: 'Relationship is required' }),
  nominee1Number: z.string().min(10, { message: 'Valid 10-digit number required' }),
  nominee2Name: z.string().min(1, { message: 'Nominee Name is required' }),
  nominee2Relationship: z.string().min(1, { message: 'Relationship is required' }),
  nominee2Number: z.string().min(10, { message: 'Valid 10-digit number required' }),
}).superRefine((data, ctx) => {
  if (data.employmentType === 'salaried' && !data.monthlySalary) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Monthly Salary is required for salaried employees',
      path: ['monthlySalary'],
    });
  }
  if (data.employmentType === 'business' && !data.annualTurnover) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Annual Turnover is required for business',
      path: ['annualTurnover'],
    });
  }
});

export const useCustomerProfile = () => {
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Load from sessionStorage if exists
  const savedData = sessionStorage.getItem('customerProfileDraft');
  const defaultValues = savedData ? JSON.parse(savedData) : {
    employmentType: 'salaried',
    sameAsCurrentAddress: false,
    communicationAddress: 'current'
  };

  const methods = useForm({
    resolver: zodResolver(customerProfileSchema),
    mode: 'onChange',
    defaultValues
  });

  const { watch, getValues } = methods;

  // Calculate rough completion percentage based on watched values
  const watchedValues = watch();
  
  useEffect(() => {
    let filledFields = 0;
    const totalRequiredFields = 22; // rough estimate based on schema
    
    Object.keys(watchedValues).forEach(key => {
      const val = watchedValues[key];
      if (val && val.toString().trim() !== '' && typeof val !== 'boolean') {
        filledFields++;
      }
    });

    const percentage = Math.min(Math.round((filledFields / totalRequiredFields) * 100), 100);
    setCompletionPercentage(percentage);
  }, [watchedValues]);

  const saveDraft = () => {
    const currentValues = getValues();
    sessionStorage.setItem('customerProfileDraft', JSON.stringify(currentValues));
    alert('Draft saved successfully to local storage!');
  };

  return {
    methods,
    completionPercentage,
    saveDraft
  };
};
