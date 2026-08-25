import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const StepAddress = ({ formData, handleChange, masters, onNext, onBack }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onNext();
  };

  const getFilteredStates = (countryId) => {
    if (!countryId) return [];
    return masters.states.filter(s => String(s.countryId) === String(countryId) || !s.countryId);
  };

  const getFilteredDistricts = (stateId) => {
    if (!stateId) return [];
    return masters.districts.filter(d => String(d.stateId) === String(stateId) || !d.stateId);
  };

  const getFilteredCities = (districtId) => {
    if (!districtId) return [];
    return masters.cities.filter(c => String(c.districtId) === String(districtId) || !c.districtId);
  };

  const currentStates = getFilteredStates(formData.currentCountry);
  const currentDistricts = getFilteredDistricts(formData.currentState);
  const currentCities = getFilteredCities(formData.currentDistrict);

  const permanentStates = getFilteredStates(formData.permanentCountry);
  const permanentDistricts = getFilteredDistricts(formData.permanentState);
  const permanentCities = getFilteredCities(formData.permanentDistrict);

  return (
    <form onSubmit={handleSubmit}>
      <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', color: '#1e293b' }}>Current Address</h4>
      <div className="std-grid-cols-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Country</label>
          <select name="currentCountry" value={formData.currentCountry} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
            <option value="">Select Country</option>
            {masters.countries.map((c, i) => (
              <option key={i} value={c.id || c.countryId}>{c.name || c.countryName}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>State</label>
          <select name="currentState" value={formData.currentState} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} disabled={!formData.currentCountry}>
            <option value="">Select State</option>
            {currentStates.map((s, i) => (
              <option key={i} value={s.id || s.stateId}>{s.name || s.stateName}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>District</label>
          <select name="currentDistrict" value={formData.currentDistrict} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} disabled={!formData.currentState}>
            <option value="">Select District</option>
            {currentDistricts.map((d, i) => (
              <option key={i} value={d.id || d.districtId}>{d.name || d.districtName}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>City</label>
          <select name="currentCity" value={formData.currentCity} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} disabled={!formData.currentDistrict}>
            <option value="">Select City</option>
            {currentCities.map((c, i) => (
              <option key={i} value={c.id || c.cityId}>{c.name || c.cityName}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem', gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Address Line</label>
          <textarea name="currentAddress" value={formData.currentAddress} onChange={handleChange} rows={3} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Street address, building, etc." />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <input 
          type="checkbox" 
          id="sameAsCurrent" 
          name="sameAsCurrent" 
          checked={formData.sameAsCurrent} 
          onChange={handleChange} 
          style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
        />
        <label htmlFor="sameAsCurrent" style={{ margin: 0, fontWeight: 500, cursor: 'pointer', color: '#1e293b' }}>
          Permanent address is the same as current address
        </label>
      </div>

      {!formData.sameAsCurrent && (
        <>
          <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', color: '#1e293b' }}>Permanent Address</h4>
          <div className="std-grid-cols-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Country</label>
              <select name="permanentCountry" value={formData.permanentCountry} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                <option value="">Select Country</option>
                {masters.countries.map((c, i) => (
                  <option key={i} value={c.id || c.countryId}>{c.name || c.countryName}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>State</label>
              <select name="permanentState" value={formData.permanentState} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} disabled={!formData.permanentCountry}>
                <option value="">Select State</option>
                {permanentStates.map((s, i) => (
                  <option key={i} value={s.id || s.stateId}>{s.name || s.stateName}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>District</label>
              <select name="permanentDistrict" value={formData.permanentDistrict} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} disabled={!formData.permanentState}>
                <option value="">Select District</option>
                {permanentDistricts.map((d, i) => (
                  <option key={i} value={d.id || d.districtId}>{d.name || d.districtName}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>City</label>
              <select name="permanentCity" value={formData.permanentCity} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} disabled={!formData.permanentDistrict}>
                <option value="">Select City</option>
                {permanentCities.map((c, i) => (
                  <option key={i} value={c.id || c.cityId}>{c.name || c.cityName}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem', gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Address Line</label>
              <textarea name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} rows={3} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Street address, building, etc." />
            </div>
          </div>
        </>
      )}

      <div className="form-actions">
        <button type="button" className="std-btn std-btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <button type="submit" className="std-btn std-btn-primary">
          Save & Next <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
};

export default StepAddress;
