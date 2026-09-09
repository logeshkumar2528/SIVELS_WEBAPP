import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckSquare2, Landmark, MapPin, MapPinned, Save, ShieldCheck, UserRound, Building2, LoaderCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  createAMS,
  getAMSById,
  getAMSDistrictsByAmsId,
  updateAMS,
  uploadAMSPAN,
  uploadAMSAadhaar,
  uploadAMSProfile,
  extractAmsId,
  saveAMSDistrictMapping,
} from '../../api/amsApi';
import { getBankBranches } from '../../api/masters/bankBranchApi';
import { masterService } from '../../../../Core/src/services/masterService';
import { getCurrentUserId } from '../../utils/authHelper';
import { generateUserCode } from '../../utils/codeGenerator';
import { DocumentUploadCard, DocumentPreviewModal, fetchDocumentBlobUrl, isPdfUrl } from '../../components/DocumentUpload/DocumentUploadSection';
import { getProfileImageUrl } from '../../utils/profileImageHelper';
import { getFileUrl, isPdfFile, getAadhaarPath, getPanPath, getDocumentUrl } from '../Dashboard/Dashboard';
import '../RelationshipManager/RelationshipManagerCreate.css';
import './AMSCreate.css';

const createInitialForm = () => ({
  amsCode: '',
  fullName: '',
  dateOfBirth: '',
  genderId: '',
  address: '',
  stateId: '',
  cityId: '',
  pincode: '',
  mobileNumber: '',
  emailAddress: '',
  branch: '',
  dateJoined: new Date().toISOString().slice(0, 10),
  accountNumber: '',
  ifscCode: '',
});

const FIELD_GROUPS = [
  {
    title: 'Personal details',
    description: 'Basic information used to identify the area management specialist.',
    icon: UserRound,
    fields: [
      ['amsCode', 'AMS Code', 'text'],
      ['fullName', 'Full Name', 'text'],
      ['dateOfBirth', 'Date of Birth', 'date'],
      ['genderId', 'Gender', 'select'],
    ],
  },
  {
    title: 'Location & contact',
    description: 'Where the AMS works and how they can be reached.',
    icon: MapPin,
    fields: [
      ['address', 'Address', 'text', true],
      ['stateId', 'State', 'select'],
      ['cityId', 'City', 'select'],
      ['pincode', 'Pincode', 'text'],
      ['mobileNumber', 'Mobile Number', 'tel'],
      ['emailAddress', 'Email Address', 'email'],
      ['branch', 'Branch', 'select'],
      ['dateJoined', 'Date Joined', 'date'],
    ],
  },
  {
    title: 'Banking details',
    description: 'Payment details for the area management specialist.',
    icon: Landmark,
    fields: [
      ['accountNumber', 'Account Number', 'text'],
      ['ifscCode', 'IFSC Code', 'text'],
    ],
  },
];

export default function AMSCreate() {
  const navigate = useNavigate();
  const { amsId: amsIdParam } = useParams();
  const editAmsId = amsIdParam || null;
  const isEditMode = Boolean(editAmsId);
  const [form, setForm] = useState(createInitialForm);
  const [selectedDistrictIds, setSelectedDistrictIds] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submittingStep, setSubmittingStep] = useState('');
  const [createdAmsId, setCreatedAmsId] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(isEditMode);

  // Master data states
  const [genders, setGenders] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingMasterData, setLoadingMasterData] = useState(true);

  // Document states
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [aadhaarPreviewUrl, setAadhaarPreviewUrl] = useState(null);
  const [isAadhaarPdf, setIsAadhaarPdf] = useState(false);

  const [panFile, setPanFile] = useState(null);
  const [panPreviewUrl, setPanPreviewUrl] = useState(null);
  const [isPanPdf, setIsPanPdf] = useState(false);

  const [profileImage, setProfileImage] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState(null);

  // Existing document states (for Edit Mode)
  const [existingAadhaarUrl, setExistingAadhaarUrl] = useState(null);
  const [existingAadhaarFileName, setExistingAadhaarFileName] = useState(null);
  const [isExistingAadhaarPdf, setIsExistingAadhaarPdf] = useState(false);

  const [existingPanUrl, setExistingPanUrl] = useState(null);
  const [existingPanFileName, setExistingPanFileName] = useState(null);
  const [isExistingPanPdf, setIsExistingPanPdf] = useState(false);

  const [existingProfileUrl, setExistingProfileUrl] = useState(null);
  const [profileVersion, setProfileVersion] = useState(() => Date.now());

  const [previewDoc, setPreviewDoc] = useState(null);
  const blobUrlsRef = useRef([]);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      blobUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingMasterData(true);

    const normalize = (res) => {
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.value)) return res.value;
      if (Array.isArray(res?.data?.value)) return res.data.value;
      return [];
    };

    Promise.all([
      masterService.getGenders(),
      masterService.getStates(),
      masterService.getCities(),
      masterService.getDistricts(),
      getBankBranches(),
    ])
      .then(([genderRes, stateRes, cityRes, districtRes, branchRes]) => {
        if (!active) return;
        setGenders(normalize(genderRes));
        setStates(normalize(stateRes));
        setCities(normalize(cityRes));
        setDistricts(normalize(districtRes));
        setBranches(normalize(branchRes));
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load master options:', err);
          toast.error('Unable to load master options. Please refresh and try again.');
        }
      })
      .finally(() => {
        if (active) setLoadingMasterData(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode) return undefined;

    let active = true;
    setLoadingRecord(true);

    const extractDistrictIds = (response) => {
      const rows = Array.isArray(response)
        ? response
        : response?.data?.value || response?.data || response?.value || [];

      return rows
        .map((row) => {
          if (typeof row === 'number' || typeof row === 'string') return Number(row);
          return Number(
            row?.districtId ??
            row?.DistrictId ??
            row?.id ??
            row?.districtID ??
            row?.DistrictID
          );
        })
        .filter(Boolean);
    };

    const loadRecord = async () => {
      try {
        const [recordResponse, districtResponse] = await Promise.allSettled([
          getAMSById(editAmsId),
          getAMSDistrictsByAmsId(editAmsId),
        ]);

        const recordValue =
          recordResponse.status === 'fulfilled'
            ? recordResponse.value
            : null;
        const record = Array.isArray(recordValue)
          ? recordValue[0]
          : recordValue?.data?.value?.[0] || recordValue?.data || recordValue?.value?.[0] || recordValue;

        if (!active || !record) {
          throw new Error('AMS record not found.');
        }

        setForm({
          amsCode: record.amsCode || record.AmsCode || record.code || '',
          fullName: record.fullName || record.FullName || record.name || '',
          dateOfBirth: record.dateOfBirth ? String(record.dateOfBirth).slice(0, 10) : '',
          genderId: record.genderId ?? record.GenderId ?? '',
          address: record.address || record.Address || '',
          stateId: record.stateId ?? record.StateId ?? '',
          cityId: record.cityId ?? record.CityId ?? '',
          pincode: record.pincode || record.Pincode || '',
          mobileNumber: record.mobileNumber || record.MobileNumber || record.phone || '',
          emailAddress: record.emailAddress || record.EmailAddress || record.email || '',
          branch: record.branch || record.Branch || record.branchName || '',
          dateJoined: record.dateJoined ? String(record.dateJoined).slice(0, 10) : new Date().toISOString().slice(0, 10),
          accountNumber: record.accountNumber || record.AccountNumber || '',
          ifscCode: record.ifscCode || record.IfscCode || '',
        });
        setIsActive(record.isActive !== false && record.IsActive !== false);

        const mappedDistrictIds =
          districtResponse.status === 'fulfilled'
            ? extractDistrictIds(districtResponse.value)
            : extractDistrictIds(record.districtIds || record.districts || record.amsDistricts || []);

        if (mappedDistrictIds.length > 0) {
          setSelectedDistrictIds(mappedDistrictIds);
        } else {
          const fallbackDistricts = Array.isArray(record.districts || record.districtNames || record.amsDistricts)
            ? (record.districts || record.districtNames || record.amsDistricts)
            : [];
          setSelectedDistrictIds(
            fallbackDistricts
              .map((district) => {
                if (typeof district === 'number' || typeof district === 'string') return Number(district);
                return Number(district?.districtId ?? district?.DistrictId ?? district?.id);
              })
              .filter(Boolean)
          );
        }
        const aadhaarPath = getAadhaarPath(record) || record.aadhaarDocumentPath || record.aadhaarPath || record.aadhaarCardPath || '';
        const panPath = getPanPath(record) || record.panCardPath || record.panDocumentPath || record.panPath || '';
        const profilePath = record.profileImagePath || record.profilePath || record.profilePicturePath || '';

        if (aadhaarPath) {
          const url = getDocumentUrl('AMS', editAmsId, 'aadhar', aadhaarPath);
          setExistingAadhaarUrl(url);
          setExistingAadhaarFileName(aadhaarPath.split('/').pop().split('\\').pop() || 'Aadhaar Card');
          setIsExistingAadhaarPdf(isPdfUrl(aadhaarPath));
        }

        if (panPath) {
          const url = getDocumentUrl('AMS', editAmsId, 'pan', panPath);
          setExistingPanUrl(url);
          setExistingPanFileName(panPath.split('/').pop().split('\\').pop() || 'PAN Card');
          setIsExistingPanPdf(isPdfUrl(panPath));
        }

        if (editAmsId) {
          const freshVersion = Date.now();
          setProfileVersion(freshVersion);
          const directProfileUrl = getProfileImageUrl('AMS', editAmsId, freshVersion);
          setExistingProfileUrl(directProfileUrl);
        }
      } catch (error) {
        if (active) {
          console.error('Failed to load AMS details:', error);
          toast.error(error?.response?.data?.message || error.message || 'Unable to load AMS details.');
        }
      } finally {
        if (active) setLoadingRecord(false);
      }
    };

    loadRecord();
    return () => {
      active = false;
    };
  }, [editAmsId, isEditMode]);

  const handlePreviewExisting = async (title, url, isPdfInitial = false) => {
    const isProfile = String(title || '').toLowerCase().includes('profile') || String(title || '').toLowerCase().includes('photo') || String(title || '').toLowerCase().includes('image');

    const effectiveUrl = isProfile && editAmsId ? getProfileImageUrl('AMS', editAmsId, profileVersion) : url;

    if (!effectiveUrl) return;

    if (isProfile) {
      setPreviewDoc({
        name: title,
        title,
        url: effectiveUrl,
        isPdf: false,
        loading: false,
      });
      return;
    }

    setPreviewDoc({
      name: title,
      title,
      url: effectiveUrl,
      isPdf: isPdfInitial,
      loading: true,
    });

    try {
      const blobResult = await fetchDocumentBlobUrl(effectiveUrl);
      if (blobResult?.url) {
        if (blobResult.isBlob) {
          blobUrlsRef.current.push(blobResult.url);
        }
        setPreviewDoc({
          name: title,
          title,
          url: blobResult.url,
          isPdf: blobResult.isPdf,
          loading: false,
        });
      } else {
        setPreviewDoc({
          name: title,
          title,
          url: effectiveUrl,
          isPdf: isPdfInitial,
          loading: false,
        });
      }
    } catch {
      setPreviewDoc({
        name: title,
        title,
        url: effectiveUrl,
        isPdf: isPdfInitial,
        loading: false,
      });
    }
  };


  const selectedStateId = String(form.stateId || '');

  const visibleCities = useMemo(() => {
    if (!selectedStateId) return [];
    return cities.filter((city) => {
      const cityStateId = city.stateId ?? city.StateId ?? city.stateID;
      return String(cityStateId) === selectedStateId;
    });
  }, [cities, selectedStateId]);

  const visibleDistricts = useMemo(() => {
    if (!selectedStateId) return districts;
    return districts.filter((district) => {
      const districtStateId = district.stateId ?? district.StateId ?? district.stateID;
      return !districtStateId || String(districtStateId) === selectedStateId;
    });
  }, [districts, selectedStateId]);

  const handleStateChange = (newStateId) => {
    setForm((prev) => ({
      ...prev,
      stateId: newStateId,
      cityId: '',
    }));
    // Clear selected districts on state change to prevent cross-state invalid selections
    setSelectedDistrictIds([]);
    setFieldErrors((prev) => ({
      ...prev,
      stateId: '',
      cityId: '',
      districts: '',
    }));
  };

  const handleAadhaarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isAllowedExt = /\.(pdf|jpg|jpeg|png)$/i.test(file.name);
      const isAllowedMime = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ].includes(file.type?.toLowerCase());

      if (!isAllowedExt && !isAllowedMime) {
        toast.error('Please upload Aadhaar card in PDF, JPG, JPEG, or PNG format only.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('Aadhaar card file size must not exceed 10MB.');
        return;
      }

      if (aadhaarPreviewUrl) URL.revokeObjectURL(aadhaarPreviewUrl);
      setAadhaarFile(file);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      setIsAadhaarPdf(isPdf);
      setAadhaarPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveAadhaar = () => {
    if (aadhaarPreviewUrl) URL.revokeObjectURL(aadhaarPreviewUrl);
    setAadhaarFile(null);
    setAadhaarPreviewUrl(null);
    setIsAadhaarPdf(false);
  };

  const handlePanUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isAllowedExt = /\.(pdf|jpg|jpeg|png)$/i.test(file.name);
      const isAllowedMime = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ].includes(file.type?.toLowerCase());

      if (!isAllowedExt && !isAllowedMime) {
        toast.error('Please upload PAN card in PDF, JPG, JPEG, or PNG format only.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('PAN card file size must not exceed 10MB.');
        return;
      }

      if (panPreviewUrl) URL.revokeObjectURL(panPreviewUrl);
      setPanFile(file);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      setIsPanPdf(isPdf);
      setPanPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePan = () => {
    if (panPreviewUrl) URL.revokeObjectURL(panPreviewUrl);
    setPanFile(null);
    setPanPreviewUrl(null);
    setIsPanPdf(false);
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isAllowedExt = /\.(jpg|jpeg|png)$/i.test(file.name);
      const isAllowedMime = ['image/jpeg', 'image/jpg', 'image/png'].includes(
        file.type?.toLowerCase()
      );

      if (!isAllowedExt && !isAllowedMime) {
        toast.error('Please upload Profile Image in JPG, JPEG, or PNG format only.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Profile Image file size must not exceed 5MB.');
        return;
      }

      if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
      setProfileImage(file);
      setProfilePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveProfileImg = () => {
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    setProfileImage(null);
    setProfilePreviewUrl(null);
  };

  const update = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (!isEditMode && (key === 'fullName' || key === 'dateOfBirth' || key === 'mobileNumber')) {
        next.amsCode = generateUserCode(next.fullName, next.dateOfBirth, next.mobileNumber);
      }
      return next;
    });
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  };

  const toggleDistrict = (districtId) => {
    const numericId = Number(districtId);
    setSelectedDistrictIds((current) =>
      current.includes(numericId)
        ? current.filter((item) => item !== numericId)
        : [...current, numericId]
    );
    setFieldErrors((prev) => ({ ...prev, districts: '' }));
  };

  const handleSelectAllDistricts = () => {
    const allVisibleIds = visibleDistricts
      .map((d) => Number(d.districtId ?? d.id))
      .filter(Boolean);
    setSelectedDistrictIds(allVisibleIds);
    setFieldErrors((prev) => ({ ...prev, districts: '' }));
  };

  const handleClearAllDistricts = () => {
    setSelectedDistrictIds([]);
  };

  const validateField = (key, value = form[key]) => {
    const text = String(value || '').trim();
    let message = '';
    const today = new Date().toISOString().slice(0, 10);

    if (!text && key !== 'districts') {
      message = 'This field is required.';
    } else if (key === 'dateOfBirth' && text > today) {
      message = 'Date of birth cannot be in the future.';
    } else if (key === 'mobileNumber' && !/^[6-9]\d{9}$/.test(text)) {
      message = 'Enter a valid 10-digit mobile number.';
    } else if (key === 'emailAddress' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      message = 'Enter a valid email address.';
    } else if (key === 'pincode' && !/^\d{6}$/.test(text)) {
      message = 'Pincode must contain exactly 6 digits.';
    } else if (key === 'accountNumber' && !/^\d{9,18}$/.test(text)) {
      message = 'Account number must contain 9–18 digits.';
    } else if (key === 'ifscCode' && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(text)) {
      message = 'Enter a valid IFSC code (e.g. SBIN0001234).';
    }

    setFieldErrors((current) => ({ ...current, [key]: message }));
    return message;
  };

  const validateAll = () => {
    const requiredKeys = [
      'amsCode',
      'fullName',
      'dateOfBirth',
      'genderId',
      'address',
      'stateId',
      'cityId',
      'pincode',
      'mobileNumber',
      'emailAddress',
      'branch',
      'dateJoined',
      'accountNumber',
      'ifscCode',
    ];

    const errors = {};
    requiredKeys.forEach((key) => {
      const msg = validateField(key, form[key]);
      if (msg) errors[key] = msg;
    });

    if (selectedDistrictIds.length === 0) {
      errors.districts = 'At least one district must be selected.';
    }

    setFieldErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateAll()) {
      toast.error('Please correct the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        amsCode: form.amsCode.trim(),
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth,
        genderId: Number(form.genderId),
        address: form.address.trim(),
        stateId: Number(form.stateId),
        cityId: Number(form.cityId),
        pincode: form.pincode.trim(),
        mobileNumber: form.mobileNumber.trim(),
        emailAddress: form.emailAddress.trim(),
        branch: form.branch.trim(),
        dateJoined: form.dateJoined,
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
        isActive,
        createdBy: getCurrentUserId() || 1,
        modifiedBy: getCurrentUserId() || 1,
        districtIds: selectedDistrictIds,
      };

      let targetAmsId = editAmsId || createdAmsId;

      if (isEditMode) {
        setSubmittingStep('Updating AMS...');
        await updateAMS(targetAmsId, {
          ...payload,
          amsId: Number(targetAmsId),
        });
      } else {
        setSubmittingStep('Creating AMS...');
        const response = await createAMS(payload);
        const extractedId = extractAmsId(response);

        if (!extractedId) {
          throw new Error('AMS saved, but failed to retrieve AMS ID from server response.');
        }

        targetAmsId = extractedId;
        setCreatedAmsId(extractedId);
      }

      // Persist selected district mappings
      if (selectedDistrictIds.length > 0) {
        setSubmittingStep('Saving district mappings...');
        try {
          await saveAMSDistrictMapping(targetAmsId, selectedDistrictIds);
        } catch (err) {
          console.error('Failed to save AMS district mappings:', err);
          const msg = err.response?.data?.message || err.message || 'District mapping failed';
          throw new Error(`AMS was ${isEditMode ? 'updated' : 'created'} successfully, but District Mapping failed: ${msg}`);
        }
      }

      // Sequential document uploads using extracted amsId
      if (aadhaarFile) {
        setSubmittingStep('Uploading Aadhaar Card...');
        try {
          await uploadAMSAadhaar(targetAmsId, aadhaarFile);
        } catch (err) {
          const msg = err.response?.data?.message || err.message || 'Aadhaar upload failed';
          throw new Error(`AMS was ${isEditMode ? 'updated' : 'created'} successfully, but Aadhaar Card upload failed: ${msg}`);
        }
      }

      if (panFile) {
        setSubmittingStep('Uploading PAN Card...');
        try {
          await uploadAMSPAN(targetAmsId, panFile);
        } catch (err) {
          const msg = err.response?.data?.message || err.message || 'PAN upload failed';
          throw new Error(`AMS was ${isEditMode ? 'updated' : 'created'} successfully, but PAN Card upload failed: ${msg}`);
        }
      }

      if (profileImage) {
        setSubmittingStep('Uploading Profile Image...');
        try {
          await uploadAMSProfile(targetAmsId, profileImage);
          const updatedTs = Date.now();
          setProfileVersion(updatedTs);
          if (typeof window !== 'undefined') {
            try {
              window.dispatchEvent(
                new CustomEvent('profile-image-updated', {
                  detail: { role: 'AMS', id: targetAmsId, timestamp: updatedTs },
                })
              );
            } catch {
              // ignore
            }
          }
        } catch (err) {
          const msg = err.response?.data?.message || err.message || 'Profile Image upload failed';
          throw new Error(`AMS was ${isEditMode ? 'updated' : 'created'} successfully, but Profile Image upload failed: ${msg}`);
        }
      }

      toast.success(isEditMode ? 'AMS updated successfully!' : 'AMS created successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error in AMS save flow:', err);
      const message =
        err.response?.data?.message ||
        err.message ||
        `Unable to ${isEditMode ? 'update' : 'create'} AMS. Please check details and try again.`;
      toast.error(message);
    } finally {
      setSaving(false);
      setSubmittingStep('');
    }
  };

  const renderField = ([key, label, type, wide]) => {
    const isInvalid = Boolean(fieldErrors[key]);

    return (
      <label className={`form-group ${wide ? 'rm-field-wide' : ''}`} key={key}>
        <span className="form-label">
          {label} <b className="text-danger">*</b>
        </span>
        {type === 'select' ? (
          <select
            className={`form-input ${isInvalid ? 'rm-invalid' : ''}`}
            value={form[key]}
            onChange={(event) => {
              if (key === 'stateId') {
                handleStateChange(event.target.value);
              } else {
                update(key, event.target.value);
              }
            }}
            onBlur={() => validateField(key)}
            disabled={key === 'cityId' && !form.stateId}
          >
            <option value="">
              {key === 'cityId' && !form.stateId
                ? 'Select state first'
                : `Select ${label.toLowerCase()}`}
            </option>

            {key === 'genderId' &&
              genders.map((g) => {
                const id = g.genderId ?? g.id;
                const name = g.genderName ?? g.name ?? g.description;
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}

            {key === 'stateId' &&
              states.map((s) => {
                const id = s.stateId ?? s.id;
                const name = s.stateName ?? s.name;
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}

            {key === 'cityId' &&
              visibleCities.map((c) => {
                const id = c.cityId ?? c.id;
                const name = c.cityName ?? c.name;
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}

            {key === 'branch' &&
              branches
                .filter((b) => b.isActive !== false)
                .map((b) => {
                  const name = b.branchName ?? b.branch ?? b.name;
                  return (
                    <option key={b.branchId ?? b.id ?? name} value={name}>
                      {name}
                    </option>
                  );
                })}
          </select>
        ) : (
          <input
            className={`form-input ${key === 'amsCode' ? 'rm-code-input' : ''} ${
              type === 'date' ? 'rm-date-input' : ''
            } ${isInvalid ? 'rm-invalid' : ''}`}
            type={type}
            value={form[key]}
            onChange={(event) => update(key, event.target.value)}
            onBlur={() => validateField(key)}
            readOnly={key === 'amsCode' || key === 'dateJoined'}
          />
        )}
        {key === 'amsCode' && <small className="rm-field-hint">Generated automatically</small>}
        {key === 'dateJoined' && <small className="rm-field-hint">Set automatically on creation</small>}
        {isInvalid && <span className="rm-validation-error">{fieldErrors[key]}</span>}
      </label>
    );
  };

  return (
    <div className="masters-page rm-create-page ams-create-page">
      <header className="rm-hero">
        <div className="rm-hero-icon">
          <ShieldCheck size={26} />
        </div>
        <div>
          <span className="rm-eyebrow">TEAM MANAGEMENT</span>
          <h1>{isEditMode ? 'Edit AMS' : 'Create AMS'}</h1>
          <p>
            {isEditMode
              ? 'Update the area management specialist profile, district mapping, and documents.'
              : 'Set up a new area management specialist with the same personal, contact, and banking details as an RM.'}
          </p>
        </div>
      </header>

      {(loadingMasterData || loadingRecord) && (
        <div className="rm-create-card" style={{ display: 'grid', placeItems: 'center', minHeight: '280px' }}>
          <LoaderCircle size={22} className="rm-spinner" />
          <p style={{ marginTop: '10px', color: '#64748b' }}>
            {loadingRecord ? 'Loading AMS details…' : 'Loading master options…'}
          </p>
        </div>
      )}

      {!loadingMasterData && !loadingRecord && (
        <form className="rm-create-card" onSubmit={handleSubmit}>
        {FIELD_GROUPS.map(({ title, description, icon: Icon, fields }) => (
          <section className="rm-section" key={title}>
            <div className="rm-section-heading">
              <Icon size={19} />
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </div>
            <div className="rm-form-grid">{fields.map(renderField)}</div>
          </section>
        ))}

        <section className="rm-section ams-district-section">
          <div className="rm-section-heading">
            <MapPinned size={19} />
            <div>
              <h2>District selection</h2>
              <p>Select multiple districts for this AMS account. This is the only additional field compared with RM.</p>
            </div>
          </div>
          <div className="ams-district-toolbar">
            <strong>{selectedDistrictIds.length} district(s) selected</strong>
            <div className="ams-district-actions">
              <button
                type="button"
                className="ams-chip-button"
                onClick={handleSelectAllDistricts}
                disabled={visibleDistricts.length === 0}
              >
                Select all
              </button>
              <button
                type="button"
                className="ams-chip-button"
                onClick={handleClearAllDistricts}
                disabled={selectedDistrictIds.length === 0}
              >
                Clear all
              </button>
            </div>
          </div>
          {fieldErrors.districts && (
            <span className="rm-validation-error" style={{ marginBottom: '12px', display: 'block' }}>
              {fieldErrors.districts}
            </span>
          )}
          <div className="ams-district-grid" role="list" aria-label="District selection">
            {visibleDistricts.map((district) => {
              const id = Number(district.districtId ?? district.id);
              const name = district.districtName ?? district.name;
              const isSelected = selectedDistrictIds.includes(id);
              return (
                <button
                  type="button"
                  key={id || name}
                  className={`ams-district-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => toggleDistrict(id)}
                >
                  <span>{name}</span>
                  <CheckSquare2 size={17} />
                </button>
              );
            })}
          </div>
          <div className="ams-selection-summary">
            {selectedDistrictIds.length ? (
              selectedDistrictIds.map((id) => {
                const districtObj = districts.find(
                  (d) => Number(d.districtId ?? d.id) === Number(id)
                );
                const name = districtObj ? districtObj.districtName ?? districtObj.name : `District #${id}`;
                return (
                  <span className="ams-summary-pill" key={id}>
                    {name}
                  </span>
                );
              })
            ) : (
              <span className="ams-summary-empty">No districts selected yet.</span>
            )}
          </div>
        </section>

        <section className="rm-section">
          <div className="rm-section-heading">
            <Building2 size={19} />
            <div>
              <h2>Required Documents</h2>
              <p>Upload identification documents and photographs for this AMS specialist.</p>
            </div>
          </div>
          <div className="doc-upload-grid">
            <DocumentUploadCard
              title="Aadhaar Card"
              subtitle="Upload clear image of Aadhaar Card"
              note="JPG, PNG or PDF (Max. 10MB)"
              accept=".pdf,.jpg,.jpeg,.png"
              icon="document"
              file={aadhaarFile}
              previewUrl={aadhaarPreviewUrl || existingAadhaarUrl}
              isPdf={aadhaarFile ? isAadhaarPdf : isExistingAadhaarPdf}
              isExisting={Boolean(!aadhaarFile && existingAadhaarUrl)}
              existingUrl={existingAadhaarUrl}
              existingFileName={existingAadhaarFileName}
              onViewExisting={() => handlePreviewExisting('Aadhaar Card', existingAadhaarUrl, isExistingAadhaarPdf)}
              onUpload={handleAadhaarUpload}
              onRemove={handleRemoveAadhaar}
              onView={() =>
                setPreviewDoc({
                  name: aadhaarFile?.name || 'Aadhaar Card',
                  url: aadhaarPreviewUrl,
                  isPdf: isAadhaarPdf,
                })
              }
            />
            <DocumentUploadCard
              title="PAN Card"
              subtitle="Upload clear image of PAN Card"
              note="JPG, PNG or PDF (Max. 10MB)"
              accept=".pdf,.jpg,.jpeg,.png"
              icon="document"
              file={panFile}
              previewUrl={panPreviewUrl || existingPanUrl}
              isPdf={panFile ? isPanPdf : isExistingPanPdf}
              isExisting={Boolean(!panFile && existingPanUrl)}
              existingUrl={existingPanUrl}
              existingFileName={existingPanFileName}
              onViewExisting={() => handlePreviewExisting('PAN Card', existingPanUrl, isExistingPanPdf)}
              onUpload={handlePanUpload}
              onRemove={handleRemovePan}
              onView={() =>
                setPreviewDoc({
                  name: panFile?.name || 'PAN Card',
                  url: panPreviewUrl,
                  isPdf: isPanPdf,
                })
              }
            />
            <DocumentUploadCard
              title="Profile Image"
              subtitle="Upload clear image of Profile Image"
              note="JPG, PNG (Max. 5MB)"
              accept=".jpg,.jpeg,.png"
              icon="camera"
              file={profileImage}
              previewUrl={profilePreviewUrl || existingProfileUrl}
              isProfile
              isExisting={Boolean(!profileImage && existingProfileUrl)}
              existingUrl={existingProfileUrl}
              existingFileName="Profile Photograph"
              onViewExisting={() => handlePreviewExisting('Profile Image', existingProfileUrl, false)}
              onUpload={handleProfileImageUpload}
              onRemove={handleRemoveProfileImg}
              onView={() =>
                setPreviewDoc({
                  name: profileImage?.name || 'Profile Image',
                  url: profilePreviewUrl,
                  isPdf: false,
                })
              }
            />
          </div>
        </section>

        <label className="rm-active">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={saving}
          />
          <span>
            <strong>Active AMS</strong>
            <small>Allow this AMS to be assigned to applications in the selected districts.</small>
          </span>
        </label>

        <div className="form-actions">
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={() => navigate('/dashboard')}
            disabled={saving}
          >
            <ArrowLeft size={17} /> Cancel
          </button>
          <button type="submit" className="masters-btn-primary" disabled={saving}>
            {saving ? (
              <>
                <LoaderCircle size={17} className="rm-spinner" /> {submittingStep || (isEditMode ? 'Updating AMS...' : 'Creating AMS...')}
              </>
            ) : (
              <>
                <Save size={17} /> {isEditMode ? 'Update AMS' : 'Create AMS'}
              </>
            )}
          </button>
        </div>
        </form>
      )}
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        doc={previewDoc}
      />
    </div>
  );
}
