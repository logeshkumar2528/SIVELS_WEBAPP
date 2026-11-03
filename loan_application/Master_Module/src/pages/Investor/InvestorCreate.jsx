import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Building2, Landmark, LoaderCircle, MapPin, Save, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createInvestor, getInvestor, getInvestors, replaceInvestorProfileImage, updateInvestor, uploadInvestorFile } from '../../api/investorApi';
import { getGenders } from '../../api/masters/genderApi';
import { getCountries } from '../../api/masters/countryApi';
import { getStates } from '../../api/masters/stateApi';
import { getDistricts } from '../../api/masters/districtApi';
import { getCities } from '../../api/masters/cityApi';
import { getBankBranches } from '../../api/masters/bankBranchApi';
import './InvestorCreate.css';
import '../RelationshipManager/RelationshipManagerCreate.css';
import { getProfileImageUrl } from '../../../../Core/src/utils/profileImageHelper';
import { DocumentPreviewModal, DocumentUploadCard } from '../../components/DocumentUpload/DocumentUploadSection';

const initial = { investorCode: '', fullName: '', dateOfBirth: '', genderId: '', countryId: '', stateId: '', districtId: '', cityId: '', address: '', pincode: '', mobileNumber: '', emailAddress: '', branch: '', dateJoined: '', accountNumber: '', ifscCode: '' };
const rows = (v) => Array.isArray(v) ? v : (v?.data || v?.value || []);
const idOf = (x, key) => x?.[key] ?? x?.id ?? x?.[key[0].toUpperCase() + key.slice(1)];
const nameOf = (x, key, fallback = 'name') => x?.[key] ?? x?.[fallback] ?? x?.name;

export default function InvestorCreate({ investorId = null, onSuccessRedirect = '/dashboard' }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [master, setMaster] = useState({ genders: [], countries: [], states: [], districts: [], cities: [], branches: [] });
  const [files, setFiles] = useState({ aadhar: null, pan: null, profile: null });
  const [existingFiles, setExistingFiles] = useState({ aadhar: '', pan: '', profile: '' });
  const [profilePreviewUrl, setProfilePreviewUrl] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getGenders(), getCountries(), getStates(), getDistricts(), getCities(), getBankBranches(), investorId ? getInvestor(investorId) : Promise.resolve(null), investorId ? Promise.resolve(null) : getInvestors()])
      .then(([g, co, s, d, c, b, existing, allInvestors]) => {
        setMaster({ genders: rows(g), countries: rows(co), states: rows(s), districts: rows(d), cities: rows(c), branches: rows(b) });
        if (!investorId) {
        }
        if (existing) {
          const r = existing?.data || existing?.value || existing;
          setExistingFiles({
            aadhar: r.aadharDocumentPath || r.aadhaarDocumentPath || r.aadharPath || r.aadhaarPath || '',
            pan: r.panCardPath || r.panDocumentPath || r.panPath || '',
            profile: investorId ? getProfileImageUrl('Investor', investorId) : '',
          });
          setForm((current) => ({ ...current, ...r, dateOfBirth: String(r.dateOfBirth || '').slice(0, 10), dateJoined: String(r.dateJoined || '').slice(0, 10), genderId: r.genderId ?? '', countryId: r.countryId ?? '', stateId: r.stateId ?? '', districtId: r.districtId ?? '', cityId: r.cityId ?? '' }));
        }
      })
      .catch(() => { setError('Unable to load investor master data.'); toast.error('Unable to load investor master data.'); });
  }, [investorId]);
  const states = useMemo(() => master.states.filter(x => !form.countryId || String(idOf(x, 'countryId')) === String(form.countryId)), [master.states, form.countryId]);
  const districts = useMemo(() => master.districts.filter(x => !form.stateId || String(idOf(x, 'stateId')) === String(form.stateId)), [master.districts, form.stateId]);
  const cities = useMemo(() => master.cities.filter(x => (!form.stateId || String(idOf(x, 'stateId')) === String(form.stateId)) && (!form.districtId || String(idOf(x, 'districtId')) === String(form.districtId))), [master.cities, form.stateId, form.districtId]);
  const change = (key, value) => setForm(p => ({ ...p, [key]: value, ...(key === 'countryId' ? { stateId: '', districtId: '', cityId: '' } : {}), ...(key === 'stateId' ? { districtId: '', cityId: '' } : {}), ...(key === 'districtId' ? { cityId: '' } : {}) }));
  const handleProfileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    setFiles((current) => ({ ...current, profile: file }));
    setProfilePreviewUrl(URL.createObjectURL(file));
  };
  const handleRemoveProfile = () => {
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    setFiles((current) => ({ ...current, profile: null }));
    setProfilePreviewUrl(null);
  };
  const submit = async (e) => {
    e.preventDefault();
    const required = ['investorCode', 'fullName', 'mobileNumber', 'emailAddress', 'countryId', 'stateId', 'districtId', 'cityId', 'pincode', 'branch'];
    if (required.some(k => !String(form[k] || '').trim())) return toast.error('Please complete all required investor fields.');
    setSaving(true);
    try {
      const payload = { ...form, genderId: Number(form.genderId || 0), countryId: Number(form.countryId), stateId: Number(form.stateId), districtId: Number(form.districtId), cityId: Number(form.cityId), isActive: true };
      const saved = investorId ? await updateInvestor(investorId, payload) : await createInvestor(payload);
      const id = investorId || saved?.investorId || saved?.InvestorId || saved?.data?.investorId || saved?.id;
      if (!id) throw new Error('Investor was created but no investorId was returned.');
      for (const [kind, file] of Object.entries(files)) if (file) {
        if (kind === 'profile' && investorId && existingFiles.profile) await replaceInvestorProfileImage(id, file);
        else await uploadInvestorFile(id, file, kind);
      }
      toast.success(investorId ? 'Investor updated successfully.' : 'Investor created successfully.');
      window.location.assign(onSuccessRedirect);
    } catch (err) { setError(err?.response?.data?.message || err.message || 'Unable to save investor.'); toast.error(err?.response?.data?.message || err.message || 'Unable to save investor.'); } finally { setSaving(false); }
  };
  const select = (key, label, list, idKey, nameKey, disabled = false) => <label className="form-group"><span className="form-label">{label} <b className="text-danger">*</b></span><select className="form-input" value={form[key]} disabled={saving || disabled} onChange={e => change(key, e.target.value)} required><option value="">Select {label.toLowerCase()}</option>{list.map((x, index) => { const optionId = idOf(x, idKey); return <option key={`${idKey}-${String(optionId || 'missing')}-${index}`} value={optionId}>{nameOf(x, nameKey)}</option>; })}</select></label>;
  return <div className="masters-page rm-create-page">
    <header className="rm-hero"><div className="rm-hero-icon"><UserRound size={26} /></div><div><span className="rm-eyebrow">INVESTOR MANAGEMENT</span><h1>{investorId ? 'Edit investor' : 'Create investor'}</h1><p>{investorId ? 'Update personal, location, and banking details for this investor.' : 'Set up a new investor account with personal and banking details.'}</p></div></header>
    <form className="rm-create-card" onSubmit={submit}>
      <section className="rm-section"><div className="rm-section-heading"><UserRound size={19} /><div><h2>Personal details</h2><p>Basic information used to identify the investor.</p></div></div><div className="rm-form-grid">
        <label className="form-group"><span className="form-label">Investor Code <b className="text-danger">*</b></span><input className="form-input" value={form.investorCode} onChange={e => change('investorCode', e.target.value)} placeholder="Enter investor code" required disabled={saving} /></label>
        <label className="form-group"><span className="form-label">Full Name <b className="text-danger">*</b></span><input className="form-input" value={form.fullName} onChange={e => change('fullName', e.target.value)} required disabled={saving} /></label>
        <label className="form-group"><span className="form-label">Date of Birth</span><input className="form-input" type="date" value={form.dateOfBirth} onChange={e => change('dateOfBirth', e.target.value)} disabled={saving} /></label>
        {select('genderId', 'Gender', master.genders, 'genderId', 'genderName')}
      </div></section>
      <section className="rm-section"><div className="rm-section-heading"><MapPin size={19} /><div><h2>Location & contact</h2><p>Where the investor is located and how they can be reached.</p></div></div><div className="rm-form-grid">
        <label className="form-group"><span className="form-label">Address</span><input className="form-input" value={form.address} onChange={e => change('address', e.target.value)} disabled={saving} /></label>{select('countryId', 'Country', master.countries, 'countryId', 'countryName')}{select('stateId', 'State', states, 'stateId', 'stateName', !form.countryId)}{select('districtId', 'District', districts, 'districtId', 'districtName', !form.stateId)}{select('cityId', 'City', cities, 'cityId', 'cityName', !form.districtId)}
        <label className="form-group"><span className="form-label">Pincode <b className="text-danger">*</b></span><input className="form-input" value={form.pincode} onChange={e => change('pincode', e.target.value)} required disabled={saving} /></label><label className="form-group"><span className="form-label">Mobile Number <b className="text-danger">*</b></span><input className="form-input" value={form.mobileNumber} onChange={e => change('mobileNumber', e.target.value)} required disabled={saving} /></label><label className="form-group"><span className="form-label">Email Address <b className="text-danger">*</b></span><input className="form-input" type="email" value={form.emailAddress} onChange={e => change('emailAddress', e.target.value)} required disabled={saving} /></label>
      </div></section>
      <section className="rm-section"><div className="rm-section-heading"><Landmark size={19} /><div><h2>Banking & work details</h2><p>Branch and payment details for the investor.</p></div></div><div className="rm-form-grid">
        <label className="form-group"><span className="form-label">Branch <b className="text-danger">*</b></span><select className="form-input" value={form.branch} disabled={saving} onChange={e => change('branch', e.target.value)}><option value="">Select branch</option>{master.branches.map(x => <option key={idOf(x, 'branchId')} value={nameOf(x, 'branchName')}>{nameOf(x, 'branchName')}</option>)}</select></label><label className="form-group"><span className="form-label">Account Number</span><input className="form-input" value={form.accountNumber} onChange={e => change('accountNumber', e.target.value)} disabled={saving} /></label><label className="form-group"><span className="form-label">IFSC Code</span><input className="form-input" value={form.ifscCode} onChange={e => change('ifscCode', e.target.value)} disabled={saving} /></label><label className="form-group"><span className="form-label">Date Joined</span><input className="form-input" type="date" value={form.dateJoined} onChange={e => change('dateJoined', e.target.value)} disabled={saving} /></label>
      </div></section>
      <section className="rm-section"><div className="rm-section-heading"><Building2 size={19} /><div><h2>Required documents</h2><p>Upload identification documents and investor photograph.</p></div></div><div className="doc-upload-grid">{[['aadhar','Aadhaar','.jpg,.jpeg,.png,.pdf'],['pan','PAN','.jpg,.jpeg,.png,.pdf']].map(([key, label, accept]) => <label className="document-upload-card" key={key}><span className="form-label">{label}</span>{existingFiles[key] && !files[key] ? <span className="investor-existing-file">Existing document saved</span> : null}<input type="file" accept={accept} disabled={saving} onChange={e => setFiles(p => ({ ...p, [key]: e.target.files?.[0] || null }))} />{files[key] ? <small className="investor-replacement-note">New file selected — it will replace the existing document.</small> : existingFiles[key] ? <small className="investor-replacement-note">Choose a file to replace this document.</small> : null}</label>)}<DocumentUploadCard title="Profile Image" subtitle="Upload investor photograph" note="JPG, PNG (Max. 10MB)" accept=".jpg,.jpeg,.png" icon="camera" file={files.profile} previewUrl={profilePreviewUrl} isProfile isExisting={Boolean(existingFiles.profile)} existingUrl={existingFiles.profile} existingFileName="Profile Photograph" onUpload={handleProfileUpload} onRemove={handleRemoveProfile} onView={() => setPreviewDoc({ name: files.profile?.name || 'Profile Image', url: profilePreviewUrl, isPdf: false })} onViewExisting={() => setPreviewDoc({ name: 'Profile Image', url: existingFiles.profile, isPdf: false })} /></div></section>
      {error && <p className="form-error-msg">{error}</p>}<div className="form-actions"><button type="button" className="masters-btn-secondary" onClick={() => navigate('/investors')} disabled={saving}><ArrowLeft size={17} /> Cancel</button><button className="masters-btn-primary" disabled={saving || !master.genders.length} type="submit">{saving ? <><LoaderCircle className="rm-spinner" size={17} /> {investorId ? 'Updating...' : 'Saving...'}</> : <><Save size={17} /> {investorId ? 'Update investor' : 'Create investor'}</>}</button></div>
    </form>
    <DocumentPreviewModal isOpen={Boolean(previewDoc)} onClose={() => setPreviewDoc(null)} doc={previewDoc} />
  </div>;
}
