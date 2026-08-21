import { useFormContext } from 'react-hook-form';
import { useEffect } from 'react';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Textarea from '../../../components/common/Textarea/Textarea';
import Checkbox from '../../../components/common/Checkbox/Checkbox';

const AddressInformation = () => {
  const { register, watch, setValue, formState: { errors } } = useFormContext();
  
  const sameAsCurrent = watch('sameAsCurrentAddress');
  const currentAddress = watch('currentAddress');
  const currentPin = watch('currentPinCode');
  const currentCity = watch('currentCity');
  const currentState = watch('currentState');

  useEffect(() => {
    if (sameAsCurrent) {
      setValue('permanentAddress', currentAddress || '');
      setValue('permanentPinCode', currentPin || '');
      setValue('permanentCity', currentCity || '');
      setValue('permanentState', currentState || '');
    }
  }, [sameAsCurrent, currentAddress, currentPin, currentCity, currentState, setValue]);

  return (
    <div>
      <div style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, color: '#1e293b' }}>
          Address Information
        </h2>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        
        {/* LEFT PANEL - Current Address */}
        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px', marginTop: 0 }}>Current Address</h3>
          
          <div style={{ marginBottom: '8px' }}>
            <Textarea 
              label="Address" 
              required 
              rows={2}
              style={{ maxHeight: '42px', minHeight: '42px', resize: 'none' }}
              placeholder="Street Address, Area" 
              {...register('currentAddress')}
              error={errors.currentAddress?.message}
            />
          </div>

          <div className="form-grid-3" style={{ marginBottom: '8px', gap: '12px 16px' }}>
            <Input 
              label="PIN Code" 
              required 
              placeholder="e.g. 110001" 
              {...register('currentPinCode')} 
              error={errors.currentPinCode?.message} 
            />
            <Input 
              label="City" 
              required 
              placeholder="City" 
              {...register('currentCity')} 
              error={errors.currentCity?.message} 
            />
            <Input 
              label="State" 
              required 
              placeholder="State" 
              {...register('currentState')} 
              error={errors.currentState?.message} 
            />
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
            <Checkbox 
              label="Same as Current Address" 
              {...register('sameAsCurrentAddress')} 
            />
          </div>
        </div>

        {/* RIGHT PANEL - Permanent Address */}
        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px', marginTop: 0 }}>Permanent Address</h3>
          
          <div style={{ marginBottom: '8px' }}>
            <Textarea 
              label="Address" 
              required 
              rows={2}
              style={{ maxHeight: '42px', minHeight: '42px', resize: 'none' }}
              placeholder="Street Address, Area" 
              disabled={sameAsCurrent} 
              {...register('permanentAddress')}
              error={errors.permanentAddress?.message}
            />
          </div>

          <div className="form-grid-3" style={{ gap: '12px 16px' }}>
            <Input 
              label="PIN Code" 
              required 
              placeholder="e.g. 110001" 
              disabled={sameAsCurrent} 
              {...register('permanentPinCode')} 
              error={errors.permanentPinCode?.message} 
            />
            <Input 
              label="City" 
              required 
              placeholder="City" 
              disabled={sameAsCurrent} 
              {...register('permanentCity')} 
              error={errors.permanentCity?.message} 
            />
            <Input 
              label="State" 
              required 
              placeholder="State" 
              disabled={sameAsCurrent} 
              {...register('permanentState')} 
              error={errors.permanentState?.message} 
            />
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 16px' }}>
        <div>
          <Select 
            label="Preferred Communication Address" 
            options={[
              { value: 'current', label: 'Current Address' },
              { value: 'permanent', label: 'Permanent Address' }
            ]}
            required
            dropdownPosition="top"
            {...register('communicationAddress')}
            error={errors.communicationAddress?.message}
          />
        </div>
      </div>

    </div>
  );
};

export default AddressInformation;

