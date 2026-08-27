import { useFormContext } from 'react-hook-form';
import Input from '../../../components/common/Input/Input';

const BankInformation = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div>
      <div style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, color: '#1e293b' }}>
          Bank Information
        </h2>
      </div>
      
      <div className="form-grid-3" style={{ gap: '24px 20px' }}>
        <Input 
          label="Bank Account Number" 
          required 
          placeholder="Account Number" 
          {...register('bankAccountNumber')} 
          error={errors.bankAccountNumber?.message} 
        />

        <Input 
          label="IFSC Code" 
          required 
          placeholder="e.g. HDFC0001234" 
          {...register('ifscCode')} 
          error={errors.ifscCode?.message} 
        />

      </div>
    </div>
  );
};

export default BankInformation;

