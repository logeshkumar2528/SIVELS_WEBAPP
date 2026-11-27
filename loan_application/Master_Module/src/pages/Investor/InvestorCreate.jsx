import { useEffect, useMemo, useRef, useState } from 'react';
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
import { getDocumentUrl, getProfileImageUrl } from '../../../../Core/src/utils/profileImageHelper';
import { DocumentPreviewModal, DocumentUploadCard, fetchDocumentBlobUrl, isPdfUrl } from '../../components/DocumentUpload/DocumentUploadSection';
import { getAadhaarPath, getPanPath } from '../Dashboard/Dashboard';

const initial = { investorCode: '', fullName: '', dateOfBirth: '', genderId: '', countryId: '', stateId: '', districtId: '', cityId: '', address: '', pincode: '', mobileNumber: '', emailAddress: '', branch: '', dateJoined: '', accountNumber: '', ifscCode: '' };
const rows = (v) => Array.isArray(v) ? v : (v?.data || v?.value || []);
const idOf = (x, key) => x?.[key] ?? x?.id ?? x?.[key[0].toUpperCase() + key.slice(1)];
const nameOf = (x, key, fallback = 'name') => x?.[key] ?? x?.[fallback] ?? x?.name;
const fileBaseName = (path, fallback) => {
  if (!path) return fallback;
  return String(path).split('/').pop().split('\\').pop() || fallback;
};

export default function InvestorCreate({ investorId = null, onSuccessRedirect = '/dashboard' }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [master, setMaster] = useState({ genders: [], countries: [], states: [], districts: [], cities: [], branches: [] });
  const [files, setFiles] = useState({ aadhar: null, pan: null, profile: null });
  const [existingFiles, setExistingFiles] = useState({ aadhar: '', pan: '', profile: '', aadharName: '', panName: '' });
  const [previewUrls, setPreviewUrls] = useState({ aadhar: null, pan: null, profile: null });
  const [previewDoc, setPreviewDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isActive, setIsActive] = useState(true);
  const blobUrlsRef = useRef([]);

  useEffect(() => {
    let active = true;

    Promise.all([
      getGenders(),
      getCountries(),
      getStates(),
      getDistricts(),
      getCities(),
      getBankBranches(),
      investorId ? getInvestor(investorId) : Promise.resolve(null),
      investorId ? Promise.resolve(null) : getInvestors(),
    ])
      .then(([g, co, s, d, c, b, existing]) => {
        if (!active) return;
        setMaster({ genders: rows(g), countries: rows(co), states: rows(s), districts: rows(d), cities: rows(c), branches: rows(b) });

        if (!existing) return;

        const raw = existing?.data || existing?.value || existing;
        const r = Array.isArray(raw)
          ? raw[0]
          : (raw?.value?.[0] || raw?.data || raw);
        if (!r || typeof r !== 'object') return;

        // Same pattern as Agent + Investor profile:
        // build document URLs from entity id (Investor API often omits stored path fields).
        const realInvestorId = r.investorId || r.InvestorId || r.id || r.Id || investorId;
        const aadhaarPath = getAadhaarPath(r)
          || r.aadhaarDocumentPath
          || r.aadharDocumentPath
          || r.aadhaarPath
          || r.aadharPath
          || r.aadhaarCardPath
          || '';
        const panPath = getPanPath(r)
          || r.panCardPath
          || r.panDocumentPath
          || r.panPath
          || '';

        setExistingFiles({
          aadhar: realInvestorId
            ? (getDocumentUrl('Investor', realInvestorId, 'aadhaar', aadhaarPath) || '')
            : '',
          pan: realInvestorId
            ? (getDocumentUrl('Investor', realInvestorId, 'pan', panPath) || '')
            : '',
          profile: realInvestorId ? getProfileImageUrl('Investor', realInvestorId) : '',
          aadharName: fileBaseName(aadhaarPath, 'Aadhaar Card'),
          panName: fileBaseName(panPath, 'PAN Card'),
        });
        setIsActive(r.isActive !== false && r.IsActive !== false);
        setForm((current) => ({
          ...current,
          ...r,
          dateOfBirth: String(r.dateOfBirth || r.DateOfBirth || '').slice(0, 10),
          dateJoined: String(r.dateJoined || r.DateJoined || '').slice(0, 10),
          genderId: r.genderId ?? r.GenderId ?? '',
          countryId: r.countryId ?? r.CountryId ?? '',
          stateId: r.stateId ?? r.StateId ?? '',
          districtId: r.districtId ?? r.DistrictId ?? '',
          cityId: r.cityId ?? r.CityId ?? '',
        }));
      })
      .catch(() => {
        if (!active) return;
        setError('Unable to load investor master data.');
        toast.error('Unable to load investor master data.');
      });

    return () => {
      active = false;
    };
  }, [investorId]);

  useEffect(() => () => {
    blobUrlsRef.current.forEach((url) => {
      try {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    blobUrlsRef.current = [];
  }, []);

  const openExistingDocument = async (title, url, isPdfInitial = false) => {
    if (!url) return;
    setPreviewDoc({ name: title, title, url, isPdf: isPdfInitial, loading: true });
    try {
      const blobResult = await fetchDocumentBlobUrl(url);
      if (blobResult?.url) {
        if (blobResult.isBlob) blobUrlsRef.current.push(blobResult.url);
        setPreviewDoc({
          name: title,
          title,
          url: blobResult.url,
          isPdf: blobResult.isPdf,
          loading: false,
        });
        return;
      }
    } catch {
      // fall through to direct URL
    }
    setPreviewDoc({ name: title, title, url, isPdf: isPdfInitial, loading: false });
  };

  const closePreview = () => {
    blobUrlsRef.current.forEach((url) => {
      try {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    blobUrlsRef.current = [];
    setPreviewDoc(null);
  };
  const states = useMemo(() => master.states.filter(x => !form.countryId || String(idOf(x, 'countryId')) === String(form.countryId)), [master.states, form.countryId]);
  const districts = useMemo(() => master.districts.filter(x => !form.stateId || String(idOf(x, 'stateId')) === String(form.stateId)), [master.districts, form.stateId]);
  const cities = useMemo(() => master.cities.filter(x => (!form.stateId || String(idOf(x, 'stateId')) === String(form.stateId)) && (!form.districtId || String(idOf(x, 'districtId')) === String(form.districtId))), [master.cities, form.stateId, form.districtId]);
  const change = (key, value) => setForm(p => ({ ...p, [key]: value, ...(key === 'countryId' ? { stateId: '', districtId: '', cityId: '' } : {}), ...(key === 'stateId' ? { districtId: '', cityId: '' } : {}), ...(key === 'districtId' ? { cityId: '' } : {}) }));
  const handleDocumentUpload = (key) => (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreviewUrls((current) => {
      if (current[key]) URL.revokeObjectURL(current[key]);
      return { ...current, [key]: URL.createObjectURL(file) };
    });
    setFiles((current) => ({ ...current, [key]: file }));
  };
  const handleDocumentRemove = (key) => () => {
    setPreviewUrls((current) => {
      if (current[key]) URL.revokeObjectURL(current[key]);
      return { ...current, [key]: null };
    });
    setFiles((current) => ({ ...current, [key]: null }));
  };
  const submit = async (e) => {
    e.preventDefault();
    const required = ['investorCode', 'fullName', 'mobileNumber', 'emailAddress', 'countryId', 'stateId', 'districtId', 'cityId', 'pincode', 'branch'];
    if (required.some(k => !String(form[k] || '').trim())) return toast.error('Please complete all required investor fields.');
    setSaving(true);
    try {
      const payload = { ...form, genderId: Number(form.genderId || 0), countryId: Number(form.countryId), stateId: Number(form.stateId), districtId: Number(form.districtId), cityId: Number(form.cityId), isActive };
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
      <section className="rm-section">
        <div className="rm-section-heading">
          <Building2 size={19} />
          <div>
            <h2>Required documents</h2>
            <p>Upload identification documents and investor photograph.</p>
          </div>
        </div>
        <div className="doc-upload-grid">
          <DocumentUploadCard
            title="Aadhaar Card"
            subtitle={
              investorId && existingFiles.aadhar && !files.aadhar
                ? 'Existing document uploaded. Select new file to replace.'
                : 'Upload clear image of Aadhaar Card'
            }
            note="JPG, PNG or PDF (Max. 10MB)"
            accept=".pdf,.jpg,.jpeg,.png"
            icon="document"
            file={files.aadhar}
            previewUrl={previewUrls.aadhar}
            isPdf={files.aadhar ? isPdfUrl(files.aadhar.name) : isPdfUrl(existingFiles.aadharName || existingFiles.aadhar)}
            isExisting={!files.aadhar && Boolean(existingFiles.aadhar)}
            existingUrl={existingFiles.aadhar}
            existingFileName={existingFiles.aadharName || 'Aadhaar Card'}
            onUpload={handleDocumentUpload('aadhar')}
            onRemove={handleDocumentRemove('aadhar')}
            onView={() => setPreviewDoc({ name: files.aadhar?.name || 'Aadhaar Card', url: previewUrls.aadhar, isPdf: isPdfUrl(files.aadhar?.name) })}
            onViewExisting={() => openExistingDocument(
              existingFiles.aadharName || 'Aadhaar Card',
              existingFiles.aadhar,
              isPdfUrl(existingFiles.aadharName || existingFiles.aadhar),
            )}
          />
          <DocumentUploadCard
            title="PAN Card"
            subtitle={
              investorId && existingFiles.pan && !files.pan
                ? 'Existing document uploaded. Select new file to replace.'
                : 'Upload clear image of PAN Card'
            }
            note="JPG, PNG or PDF (Max. 10MB)"
            accept=".pdf,.jpg,.jpeg,.png"
            icon="document"
            file={files.pan}
            previewUrl={previewUrls.pan}
            isPdf={files.pan ? isPdfUrl(files.pan.name) : isPdfUrl(existingFiles.panName || existingFiles.pan)}
            isExisting={!files.pan && Boolean(existingFiles.pan)}
            existingUrl={existingFiles.pan}
            existingFileName={existingFiles.panName || 'PAN Card'}
            onUpload={handleDocumentUpload('pan')}
            onRemove={handleDocumentRemove('pan')}
            onView={() => setPreviewDoc({ name: files.pan?.name || 'PAN Card', url: previewUrls.pan, isPdf: isPdfUrl(files.pan?.name) })}
            onViewExisting={() => openExistingDocument(
              existingFiles.panName || 'PAN Card',
              existingFiles.pan,
              isPdfUrl(existingFiles.panName || existingFiles.pan),
            )}
          />
          <DocumentUploadCard
            title="Profile Image"
            subtitle={
              investorId && existingFiles.profile && !files.profile
                ? 'Existing photo uploaded. Select new image to replace.'
                : 'Upload clear image of Profile Image'
            }
            note="JPG, PNG (Max. 5MB)"
            accept=".jpg,.jpeg,.png"
            icon="camera"
            file={files.profile}
            previewUrl={previewUrls.profile}
            isProfile
            isExisting={!files.profile && Boolean(existingFiles.profile)}
            existingUrl={existingFiles.profile}
            existingFileName="Profile Photo"
            onUpload={handleDocumentUpload('profile')}
            onRemove={handleDocumentRemove('profile')}
            onView={() => setPreviewDoc({ name: files.profile?.name || 'Profile Image', url: previewUrls.profile, isPdf: false })}
            onViewExisting={() => setPreviewDoc({ name: 'Profile Photo', url: existingFiles.profile, isPdf: false })}
          />
        </div>
      </section>
      <label className="rm-active">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={saving} />
        <span>
          <strong>Active investor</strong>
          <small>Allow this investor to remain active in the directory.</small>
        </span>
      </label>
      {error && <p className="form-error-msg">{error}</p>}<div className="form-actions"><button type="button" className="masters-btn-secondary" onClick={() => navigate('/investors')} disabled={saving}><ArrowLeft size={17} /> Cancel</button><button className="masters-btn-primary" disabled={saving || !master.genders.length} type="submit">{saving ? <><LoaderCircle className="rm-spinner" size={17} /> {investorId ? 'Updating...' : 'Saving...'}</> : <><Save size={17} /> {investorId ? 'Update investor' : 'Create investor'}</>}</button></div>
    </form>
    <DocumentPreviewModal isOpen={Boolean(previewDoc)} onClose={closePreview} doc={previewDoc} />
  </div>;
}
