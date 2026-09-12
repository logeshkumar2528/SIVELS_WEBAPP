import { useFormContext } from 'react-hook-form';
import Input from '../../../components/common/Input/Input';
import { formatIndianAmount } from '../../../utils/amountHelper';

const EmploymentInformation = () => {
  const { register, watch, setValue, formState: { errors } } = useFormContext();
  const employmentType = watch('employmentType');
  const monthlySalary = watch('monthlySalary');
  const annualIncome = watch('annualIncome');
  const annualTurnover = watch('annualTurnover');

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
          type="text" 
          inputMode="numeric"
          label="Monthly Salary (INR)" 
          required={employmentType === 'salaried'} 
          placeholder="0" 
          {...register('monthlySalary')} 
          value={formatIndianAmount(monthlySalary ?? '')}
          onChange={(e) => setValue('monthlySalary', formatIndianAmount(e.target.value), { shouldValidate: true })}
          error={errors.monthlySalary?.message} 
        />

        <Input 
          type="text" 
          inputMode="numeric"
          label="Annual Income (INR)" 
          required 
          placeholder="0" 
          {...register('annualIncome')} 
          value={formatIndianAmount(annualIncome ?? '')}
          onChange={(e) => setValue('annualIncome', formatIndianAmount(e.target.value), { shouldValidate: true })}
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
            type="text" 
            inputMode="numeric"
            label="Annual Turnover (INR)" 
            required 
            placeholder="0" 
            {...register('annualTurnover')} 
            value={formatIndianAmount(annualTurnover ?? '')}
            onChange={(e) => setValue('annualTurnover', formatIndianAmount(e.target.value), { shouldValidate: true })}
            error={errors.annualTurnover?.message} 
          />
        )}
      </div>
    </div>
  );
};

export default EmploymentInformation;
