import { useFormContext } from 'react-hook-form';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';

const NomineeInformation = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div>
      <div style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, color: '#1e293b' }}>
          Nominee & Emergency Contact
        </h2>
      </div>
      
      <div className="form-grid-3" style={{ gap: '24px 20px' }}>
        {/* ROW 1 */}
        <Input 
          label="Nominee 1 Name" 
          required 
          placeholder="Full Name" 
          {...register('nomineeName')} 
          error={errors.nomineeName?.message} 
        />

        <Select 
          label="Relationship (Nominee 1)" 
          required 
          options={[
            { value: 'spouse', label: 'Spouse' },
            { value: 'parent', label: 'Parent' },
            { value: 'child', label: 'Child' },
            { value: 'sibling', label: 'Sibling' },
            { value: 'other', label: 'Other' }
          ]} 
          {...register('nomineeRelationship')} 
          error={errors.nomineeRelationship?.message} 
        />

        <Input 
          type="tel"
          label="Nominee 1 Number" 
          required 
          placeholder="10-digit number" 
          {...register('nominee1Number')} 
          error={errors.nominee1Number?.message} 
        />

        {/* ROW 2 */}
        <Input 
          label="Nominee 2 Name" 
          required 
          placeholder="Full Name" 
          {...register('nominee2Name')} 
          error={errors.nominee2Name?.message} 
        />

        <Select 
          label="Relationship (Nominee 2)" 
          required 
          options={[
            { value: 'spouse', label: 'Spouse' },
            { value: 'parent', label: 'Parent' },
            { value: 'child', label: 'Child' },
            { value: 'sibling', label: 'Sibling' },
            { value: 'other', label: 'Other' }
          ]} 
          {...register('nominee2Relationship')} 
          error={errors.nominee2Relationship?.message} 
        />

        <Input 
          type="tel" 
          label="Nominee 2 Number" 
          required 
          placeholder="10-digit number" 
          {...register('nominee2Number')} 
          error={errors.nominee2Number?.message} 
        />
      </div>
    </div>
  );
};

export default NomineeInformation;

