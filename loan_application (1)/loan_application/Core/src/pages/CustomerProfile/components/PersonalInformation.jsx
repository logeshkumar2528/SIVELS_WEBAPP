import { useFormContext } from 'react-hook-form';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';

const PersonalInformation = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div>
      <div style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, color: '#1e293b' }}>
          Personal Information
        </h2>
      </div>
      
      <div className="form-grid-3" style={{ gap: '24px 20px' }}>
        <Input 
          type="date" 
          label="Date of Birth" 
          required 
          {...register('dob')} 
          error={errors.dob?.message} 
        />

        <Select 
          label="Gender" 
          required 
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' }
          ]} 
          {...register('gender')} 
          error={errors.gender?.message} 
        />

        <Select 
          label="Marital Status" 
          required 
          options={[
            { value: 'single', label: 'Single' },
            { value: 'married', label: 'Married' },
            { value: 'divorced', label: 'Divorced' },
            { value: 'widowed', label: 'Widowed' }
          ]} 
          {...register('maritalStatus')} 
          error={errors.maritalStatus?.message} 
        />

        <Input 
          label="Nationality" 
          required 
          placeholder="e.g. Indian" 
          {...register('nationality')} 
          error={errors.nationality?.message} 
        />



        <Input 
          label="Occupation" 
          required 
          placeholder="e.g. Software Engineer" 
          {...register('occupation')} 
          error={errors.occupation?.message} 
        />
      </div>
    </div>
  );
};

export default PersonalInformation;

