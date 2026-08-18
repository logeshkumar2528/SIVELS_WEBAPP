import { useFormContext } from 'react-hook-form';
import Input from '../../../components/common/Input/Input';

const EmploymentInformation = () => {
  const { register, watch, formState: { errors } } = useFormContext();
  const employmentType = watch('employmentType');

  return (
    <div>
      <div style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, color: '#1e293b' }}>
          Employment Details
        </h2>
      </div>
      
      <div className="form-grid-3" style={{ gap: '24px 20px' }}>
        <Input 
          label="Company/Business Name" 
          required 
          placeholder="Company Name" 
          {...register('companyName')} 
          error={errors.companyName?.message} 
        />

        <Input 
          label="Designation" 
          required 
          placeholder="e.g. Senior Manager" 
          {...register('designation')} 
          error={errors.designation?.message} 
        />



        <Input 
          type="number" 
          label="Monthly Salary (INR)" 
          required={employmentType === 'salaried'} 
          placeholder="0" 
          {...register('monthlySalary')} 
          error={errors.monthlySalary?.message} 
        />

        <Input 
          type="number" 
          label="Annual Income (INR)" 
          required 
          placeholder="0" 
          {...register('annualIncome')} 
          error={errors.annualIncome?.message} 
        />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label className="input-label" style={{ display: 'block', marginBottom: '8px' }}>
            Employment Type <span className="required-asterisk">*</span>
          </label>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', height: '42px', padding: '0 0.75rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input type="radio" value="salaried" {...register('employmentType')} style={{ accentColor: '#2563eb', width: '1rem', height: '1rem' }} />
              Salaried
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input type="radio" value="business" {...register('employmentType')} style={{ accentColor: '#2563eb', width: '1rem', height: '1rem' }} />
              Business
            </label>
          </div>
          {errors.employmentType && <span className="error-message" style={{ display: 'block', marginTop: '0.2rem' }}>{errors.employmentType.message}</span>}
        </div>

        {employmentType === 'business' && (
          <Input 
            type="number" 
            label="Annual Turnover (INR)" 
            required 
            placeholder="0" 
            {...register('annualTurnover')} 
            error={errors.annualTurnover?.message} 
          />
        )}
      </div>
    </div>
  );
};

export default EmploymentInformation;
