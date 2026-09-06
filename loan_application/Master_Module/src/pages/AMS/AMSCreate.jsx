import { useState } from 'react';
import { ArrowLeft, CheckSquare2, Landmark, MapPin, MapPinned, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../RelationshipManager/RelationshipManagerCreate.css';
import './AMSCreate.css';

const DISTRICT_OPTIONS = [
  'Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tirunelveli', 'Tiruppur',
  'Erode', 'Thanjavur', 'Vellore', 'Trichy', 'Hosur', 'Kanchipuram',
];

const generateAmsCode = () => {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const sequencePart = String(Math.floor(1000 + Math.random() * 9000));
  return `AMS${datePart}${sequencePart}`;
};

const createInitialForm = () => ({
  amsCode: generateAmsCode(), fullName: '', dateOfBirth: '', gender: '', address: '',
  state: '', city: '', pincode: '', mobileNumber: '', emailAddress: '', branch: '',
  dateJoined: new Date().toISOString().slice(0, 10), accountNumber: '', ifscCode: '',
});

const FIELD_GROUPS = [
  {
    title: 'Personal details',
    description: 'Basic information used to identify the area management specialist.',
    icon: UserRound,
    fields: [['amsCode', 'AMS Code', 'text'], ['fullName', 'Full Name', 'text'], ['dateOfBirth', 'Date of Birth', 'date'], ['gender', 'Gender', 'select']],
  },
  {
    title: 'Location & contact',
    description: 'Where the AMS works and how they can be reached.',
    icon: MapPin,
    fields: [['address', 'Address', 'text', true], ['state', 'State', 'select'], ['city', 'City', 'select'], ['pincode', 'Pincode', 'text'], ['mobileNumber', 'Mobile Number', 'tel'], ['emailAddress', 'Email Address', 'email'], ['branch', 'Branch', 'select'], ['dateJoined', 'Date Joined', 'date']],
  },
  {
    title: 'Banking details',
    description: 'Payment details for the area management specialist.',
    icon: Landmark,
    fields: [['accountNumber', 'Account Number', 'text'], ['ifscCode', 'IFSC Code', 'text']],
  },
];

const selectOptions = {
  gender: ['Male', 'Female', 'Other'],
  state: ['Tamil Nadu', 'Kerala', 'Karnataka'],
  city: ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
  branch: ['Corporate', 'Chennai Main Branch', 'Coimbatore Branch'],
};

export default function AMSCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState(createInitialForm);
  const [selectedDistricts, setSelectedDistricts] = useState(['Chennai', 'Madurai', 'Tiruppur']);
  const [isActive, setIsActive] = useState(true);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleDistrict = (district) => setSelectedDistricts((current) => (
    current.includes(district) ? current.filter((item) => item !== district) : [...current, district]
  ));

  const renderField = ([key, label, type, wide]) => (
    <label className={`form-group ${wide ? 'rm-field-wide' : ''}`} key={key}>
      <span className="form-label">{label} <b className="text-danger">*</b></span>
      {type === 'select' ? (
        <select className="form-input" value={form[key]} onChange={(event) => update(key, event.target.value)}>
          <option value="">Select {label.toLowerCase()}</option>
          {selectOptions[key].map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input className={`form-input ${key === 'amsCode' ? 'rm-code-input' : ''} ${type === 'date' ? 'rm-date-input' : ''}`} type={type} value={form[key]} onChange={(event) => update(key, event.target.value)} readOnly={key === 'amsCode' || key === 'dateJoined'} />
      )}
      {key === 'amsCode' && <small className="rm-field-hint">Generated automatically</small>}
      {key === 'dateJoined' && <small className="rm-field-hint">Set automatically on creation</small>}
    </label>
  );

  return (
    <div className="masters-page rm-create-page ams-create-page">
      <header className="rm-hero">
        <div className="rm-hero-icon"><ShieldCheck size={26} /></div>
        <div>
          <span className="rm-eyebrow">TEAM MANAGEMENT</span>
          <h1>Create AMS</h1>
          <p>Set up a new area management specialist with the same personal, contact, and banking details as an RM.</p>
        </div>
      </header>

      <form className="rm-create-card" onSubmit={(event) => event.preventDefault()}>
        {FIELD_GROUPS.map(({ title, description, icon: Icon, fields }) => (
          <section className="rm-section" key={title}>
            <div className="rm-section-heading"><Icon size={19} /><div><h2>{title}</h2><p>{description}</p></div></div>
            <div className="rm-form-grid">{fields.map(renderField)}</div>
          </section>
        ))}

        <section className="rm-section ams-district-section">
          <div className="rm-section-heading"><MapPinned size={19} /><div><h2>District selection</h2><p>Select multiple districts for this AMS account. This is the only additional field compared with RM.</p></div></div>
          <div className="ams-district-toolbar">
            <strong>{selectedDistricts.length} district(s) selected</strong>
            <div className="ams-district-actions">
              <button type="button" className="ams-chip-button" onClick={() => setSelectedDistricts(DISTRICT_OPTIONS)}>Select all</button>
              <button type="button" className="ams-chip-button" onClick={() => setSelectedDistricts([])}>Clear all</button>
            </div>
          </div>
          <div className="ams-district-grid" role="list" aria-label="District selection">
            {DISTRICT_OPTIONS.map((district) => {
              const isSelected = selectedDistricts.includes(district);
              return <button type="button" key={district} className={`ams-district-card ${isSelected ? 'is-selected' : ''}`} onClick={() => toggleDistrict(district)}><span>{district}</span><CheckSquare2 size={17} /></button>;
            })}
          </div>
          <div className="ams-selection-summary">
            {selectedDistricts.length ? selectedDistricts.map((district) => <span className="ams-summary-pill" key={district}>{district}</span>) : <span className="ams-summary-empty">No districts selected yet.</span>}
          </div>
        </section>

        <label className="rm-active">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          <span><strong>Active AMS</strong><small>Allow this AMS to be assigned to applications in the selected districts.</small></span>
        </label>

        <div className="form-actions">
          <button type="button" className="masters-btn-secondary" onClick={() => navigate('/dashboard')}><ArrowLeft size={17} /> Cancel</button>
          <button type="submit" className="masters-btn-primary" disabled><Save size={17} /> Create AMS</button>
        </div>
      </form>
    </div>
  );
}
