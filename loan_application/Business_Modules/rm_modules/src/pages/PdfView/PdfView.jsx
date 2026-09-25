import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import { ROUTES } from '../../config/routeConfig';
import { getApplicantCount } from '../applicationWizard/flowUtils';
import Button from '../../components/Button/Button';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import { formatDateTime, toIstDateInput } from '../../utils/dateHelper';
import { buildApplicationDisplayId } from '../applicationWizard/flowUtils';
import { isApplicantDocumentTuple } from '../KycDocuments/kycDocumentState';
import { resolveApplicationOwnership } from '../../utils/ownershipHelper';
import './PdfView.css';
import LogoImage from '../../assets/logo/Navbar_logo/Logo.jpg';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

function extractArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.value)) return raw.value;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
}

function mergeNonEmpty(primary = {}, fallback = {}) {
  const result = { ...(fallback || {}) };
  Object.entries(primary || {}).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) {
      if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
        result[k] = mergeNonEmpty(v, fallback?.[k] || {});
      } else {
        result[k] = v;
      }
    }
  });
  return result;
}

function composeFullName(person = {}) {
  return [person.firstName, person.middleName, person.lastName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
}

function isObsoleteMock(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    s === 'anil kumar' ||
    s === 'karthik raja' ||
    s === 'rajesh kumar' ||
    s === 'dineshkumar' ||
    s === 'dinesh kumar' ||
    s === 'sivashanmugam m' ||
    s === 'rm001' ||
    s === '2025-06-06' ||
    s === '06-06-2025'
  );
}

export default function PdfView() {
  const params = useParams();
  const applicationId = params.applicationId || params.customerId;
  const navigate = useNavigate();
  const location = useLocation();
  const { applications, getApplication, loadApplicationFromBackend } = useApplicationDraftStore();
  const appData = applications[applicationId] || getApplication(applicationId) || {};
  const applicationDisplayId = buildApplicationDisplayId(appData, applicationId);
  const pdfRef = useRef();

  const [liveCustomer, setLiveCustomer] = useState(null);
  const [liveRM, setLiveRM] = useState(null);
  const [livePersonal, setLivePersonal] = useState(null);
  const [liveAddress, setLiveAddress] = useState(null);
  const [liveEmployment, setLiveEmployment] = useState(null);
  const [liveBank, setLiveBank] = useState(null);
  const [liveCollateral, setLiveCollateral] = useState(null);
  const [liveKycCoApplicants, setLiveKycCoApplicants] = useState([]);
  const [liveAllKycRecords, setLiveAllKycRecords] = useState([]);
  const [applicantPhotoUrl, setApplicantPhotoUrl] = useState(null);
  const [isApplicantPhotoLoading, setIsApplicantPhotoLoading] = useState(false);
  const [liveApplicantKyc, setLiveApplicantKyc] = useState(null);
  const [coApplicantPhotos, setCoApplicantPhotos] = useState({});
  const [downloadedDocs, setDownloadedDocs] = useState([]);
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [isDocsDownloading, setIsDocsDownloading] = useState(true);
  const [isCoPhotosLoading, setIsCoPhotosLoading] = useState(false);
  const [masterMaps, setMasterMaps] = useState({
    sourcingChannels: {},
    loanProducts: {},
    loanPurposes: {},
    loanVariations: {},
    titles: {},
    genders: {},
    castes: {},
    religions: {},
    maritalStatuses: {},
    relationships: {},
    documentTypes: {},
    verifications: {},
    banks: {},
    properties: {},
    propertyUsages: {},
    employmentTypes: {},
    educations: {},
    industryTypes: {},
    cities: {},
    states: {},
  });

  const blobUrlsRef = useRef([]);

  // Cleanup object URLs on unmount
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

    async function loadAllData() {
      setIsMetadataLoading(true);
      setIsDocsDownloading(true);
      try {
        // Hydrate full application data into draft context first (forceRefresh: true)
        try {
          await loadApplicationFromBackend(applicationId, true);
        } catch (hErr) {
          console.warn('Hydration in PdfView:', hErr);
        }

        const token = localStorage.getItem('authToken');
        const authHeaders = {};
        if (token) authHeaders['Authorization'] = `Bearer ${token}`;

        const fetchMaster = async (endpoint, idField, nameField) => {
          try {
            const res = await fetch(`${API_BASE}/${endpoint}`, { headers: authHeaders });
            if (res.ok) {
              const data = await res.json();
              const rows = extractArray(data);
              const map = {};
              rows.forEach((r) => {
                const id = r[idField] ?? r[idField.charAt(0).toUpperCase() + idField.slice(1)] ?? r[idField.toLowerCase()];
                const name = r[nameField] ?? r[nameField.charAt(0).toUpperCase() + nameField.slice(1)] ?? r[nameField.toLowerCase()];
                if (id !== undefined && id !== null) {
                  map[id] = name;
                  map[String(id)] = name;
                }
              });
              return map;
            }
          } catch {
            return {};
          }
          return {};
        };

        const [
          custRes,
          rmRes,
          sourcingMap,
          prodMap,
          purposeMap,
          variationMap,
          titleMap,
          casteMap,
          genderMap,
          maritalMap,
          relMap,
          religionMap,
          docTypeMap,
          verifMap,
          bankMap,
          propertyMap,
          propertyUsageMap,
          empTypeMap,
          eduMap,
          industryTypeMap,
          cityMap,
          stateMap,
          empDetailsRes,
          addrDetailsRes,
          persInfoRes,
          bankDetailsRes,
          collateralDetailsRes,
          productDetailsRes,
          kycDetailsRes,
          fullDetailsRes,
        ] = await Promise.allSettled([
          fetch(`${API_BASE}/AgentAddCustomer/${applicationId}`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE}/RMMaster`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
          fetchMaster('SourcingChannelMaster', 'sourcingChannelId', 'sourcingChannelName'),
          fetchMaster('LoanProductMaster', 'loanProductId', 'productName'),
          fetchMaster('LoanPurposeMaster', 'loanPurposeId', 'purposeName'),
          fetchMaster('LoanProductVariationMaster', 'loanProductVariationId', 'variationName'),
          fetchMaster('TitleMaster', 'titleID', 'titleName'),
          fetchMaster('masters/CasteMaster', 'casteId', 'casteName'),
          fetchMaster('gender', 'genderId', 'genderName'),
          fetchMaster('marital-status', 'maritalStatusId', 'maritalStatusName'),
          fetchMaster('RelationshipMaster', 'relationshipId', 'relationshipName'),
          fetchMaster('masters/ReligionMaster', 'religionId', 'religionName'),
          fetchMaster('DocumentTypeMaster', 'documentTypeId', 'documentTypeName'),
          fetchMaster('VerificationMaster', 'verificationId', 'verificationName'),
          fetchMaster('masters/bank/active', 'bankId', 'bankName'),
          fetchMaster('PropertyMaster', 'propertyId', 'propertyName'),
          fetchMaster('PropertyUsageMaster', 'propertyUsageId', 'propertyUsageName'),
          fetchMaster('EmploymentType', 'employmentTypeId', 'employmentTypeName'),
          fetchMaster('EducationMaster', 'educationId', 'educationName'),
          fetchMaster('masters/IndustryTypeMaster', 'industryTypeId', 'industryTypeName'),
          fetchMaster('City', 'cityId', 'cityName'),
          fetchMaster('State', 'stateId', 'stateName'),
          fetch(`${API_BASE}/ApplicationEmploymentIncomeDetails`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE}/ApplicationAddressDetails`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE}/ApplicationPersonalInformation`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE}/ApplicationBankExistingLoanDetails`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE}/ApplicationCollateralDetails`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE}/ApplicationProductDetails`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE}/ApplicationKYCDocuments`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE}/ApplicationFullDetails/${applicationId}`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
        ]);

        let resolvedCustomerId = applicationId;

        if (active) {
          let currentCust = null;
          if (custRes.status === 'fulfilled' && custRes.value) {
            const data = custRes.value;
            const record = Array.isArray(data) ? data[0] : (data?.value ? data.value[0] : data);
            if (record) {
              setLiveCustomer(record);
              currentCust = record;
              resolvedCustomerId = record.agentCustomerId || record.AgentCustomerId || applicationId;
            }
          }

          // 1. Process KYC Records First (Sequence-Aware)
          let allKycRecords = [];
          if (fullDetailsRes?.status === 'fulfilled' && fullDetailsRes.value) {
            const rawVal = fullDetailsRes.value?.value || fullDetailsRes.value?.data || fullDetailsRes.value;
            const fullKyc =
              rawVal?.kycDocuments ||
              rawVal?.KycDocuments ||
              rawVal?.applicationKYCDocumentId ||
              rawVal?.applicationKYCDocuments ||
              rawVal?.ApplicationKYCDocuments ||
              rawVal;
            allKycRecords.push(...extractArray(fullKyc));
          }

          if (kycDetailsRes?.status === 'fulfilled' && kycDetailsRes.value) {
            const rawKycList = extractArray(kycDetailsRes.value);
            const prodList = productDetailsRes?.status === 'fulfilled' ? extractArray(productDetailsRes.value) : [];

            const matchedProduct = prodList.find(
              (p) =>
                String(p.agentCustomerId ?? p.AgentCustomerId) === String(resolvedCustomerId) ||
                String(p.agentCustomerId ?? p.AgentCustomerId) === String(applicationId)
            );
            const targetProdId =
              matchedProduct?.applicationProductDetailsId ??
              matchedProduct?.ApplicationProductDetailsId ??
              fullDetailsRes?.value?.productDetails?.applicationProductDetailsId ??
              fullDetailsRes?.value?.productDetails?.ApplicationProductDetailsId ??
              appData.applicationProductDetailsId;

            const filteredKycs = rawKycList.filter((k) =>
              (targetProdId && String(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId) === String(targetProdId)) ||
              (resolvedCustomerId && String(k.agentCustomerId ?? k.AgentCustomerId) === String(resolvedCustomerId)) ||
              (applicationId && String(k.agentCustomerId ?? k.AgentCustomerId) === String(applicationId))
            );

            allKycRecords.push(...filteredKycs);
          }

          let combinedKycList = [];
          let applicantKyc = null;
          let coApplicantKycs = [];

          if (allKycRecords.length > 0) {
            const uniqueKycMap = new Map();
            allKycRecords.forEach((k) => {
              const id = k.applicationKYCDocumentId || k.ApplicationKYCDocumentId || k.kycDocumentId || k.id;
              if (id && !uniqueKycMap.has(String(id))) {
                uniqueKycMap.set(String(id), k);
              }
            });
            combinedKycList = Array.from(uniqueKycMap.values()).sort(
              (a, b) =>
                Number(a.applicantSequence ?? a.ApplicantSequence ?? 0) -
                Number(b.applicantSequence ?? b.ApplicantSequence ?? 0)
            );
            setLiveAllKycRecords(combinedKycList);

            applicantKyc = combinedKycList.find((k) => {
              if (isApplicantDocumentTuple(k)) return false;
              const seq = k.applicantSequence ?? k.ApplicantSequence;
              return seq !== undefined && seq !== null && Number(seq) === 0;
            }) || null;

            if (applicantKyc) {
              setLiveApplicantKyc(applicantKyc);
            }

            const coKycs = combinedKycList.filter((k) => {
              if (isApplicantDocumentTuple(k)) return false;
              const seq = k.applicantSequence ?? k.ApplicantSequence;
              return seq !== undefined && seq !== null && Number(seq) > 0;
            });

            if (coKycs.length > 0) {
              coApplicantKycs = coKycs;
              setLiveKycCoApplicants(coKycs);
            }
          }

          // 2. Personal, Address, Employment, and Bank Relational Matching
          const persList = persInfoRes.status === 'fulfilled' ? extractArray(persInfoRes.value) : [];
          const addrList = addrDetailsRes.status === 'fulfilled' ? extractArray(addrDetailsRes.value) : [];
          const empList = empDetailsRes.status === 'fulfilled' ? extractArray(empDetailsRes.value) : [];
          const bankList = bankDetailsRes.status === 'fulfilled' ? extractArray(bankDetailsRes.value) : [];

          const findPersRow = (targetSeq, targetKyc) => {
            if (!Array.isArray(persList) || persList.length === 0) return null;
            const targetKycId = targetKyc?.applicationKYCDocumentId ?? targetKyc?.ApplicationKYCDocumentId ?? targetKyc?.kycDocumentId;
            if (targetKycId) {
              const matched = persList.find((p) => {
                const pKycId = p.applicationKYCDocumentId ?? p.ApplicationKYCDocumentId ?? p.kycDocumentId;
                return pKycId !== undefined && pKycId !== null && pKycId !== '' && Number(pKycId) === Number(targetKycId);
              });
              if (matched) return matched;
            }
            const matchedBySeq = persList.find((p) => {
              const rawSeq = p.applicantSequence ?? p.ApplicantSequence;
              return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
            });
            if (matchedBySeq) return matchedBySeq;
            if (targetSeq === 0 && persList.length === 1) {
              const only = persList[0];
              const onlySeq = only.applicantSequence ?? only.ApplicantSequence;
              if (onlySeq === undefined || onlySeq === null || Number(onlySeq) === 0) {
                return only;
              }
            }
            return null;
          };

          const claimedPdfAddrIds = new Set();
          const getPdfAddrId = (a) =>
            a?.applicationAddressDetailsId ??
            a?.ApplicationAddressDetailsId ??
            a?.addressDetailsId ??
            a?.AddressDetailsId ??
            a?.id ??
            a?.Id ??
            null;

          const findAddrRow = (targetSeq, resolvedPers, resolvedKyc) => {
            if (!Array.isArray(addrList) || addrList.length === 0) return null;
            const persId = resolvedPers?.personalInformationId ?? resolvedPers?.PersonalInformationId;
            const kycId = resolvedKyc?.applicationKYCDocumentId ?? resolvedKyc?.ApplicationKYCDocumentId ?? resolvedKyc?.kycDocumentId;

            const unclaimedList = addrList.filter((a) => {
              const id = getPdfAddrId(a);
              return !id || !claimedPdfAddrIds.has(Number(id));
            });
            if (unclaimedList.length === 0) return null;

            if (persId) {
              const matchedByPers = unclaimedList.filter((a) => {
                const aPersId = a.personalInformationId ?? a.PersonalInformationId;
                return aPersId !== undefined && aPersId !== null && aPersId !== '' && Number(aPersId) === Number(persId);
              });

              if (matchedByPers.length === 1) {
                const chosen = matchedByPers[0];
                const id = getPdfAddrId(chosen);
                if (id) claimedPdfAddrIds.add(Number(id));
                return chosen;
              }

              if (matchedByPers.length > 1) {
                const matchedBySeq = matchedByPers.find((a) => {
                  const rawSeq = a.applicantSequence ?? a.ApplicantSequence;
                  return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
                });
                if (matchedBySeq) {
                  const id = getPdfAddrId(matchedBySeq);
                  if (id) claimedPdfAddrIds.add(Number(id));
                  return matchedBySeq;
                }
                const sorted = [...matchedByPers].sort((x, y) => (Number(getPdfAddrId(x)) || 0) - (Number(getPdfAddrId(y)) || 0));
                const chosen = sorted[0];
                if (chosen) {
                  const id = getPdfAddrId(chosen);
                  if (id) claimedPdfAddrIds.add(Number(id));
                  return chosen;
                }
              }
            }

            if (kycId) {
              const matched = unclaimedList.find((a) => {
                const aKycId = a.applicationKYCDocumentId ?? a.ApplicationKYCDocumentId;
                return aKycId !== undefined && aKycId !== null && aKycId !== '' && Number(aKycId) === Number(kycId);
              });
              if (matched) {
                const id = getPdfAddrId(matched);
                if (id) claimedPdfAddrIds.add(Number(id));
                return matched;
              }
            }

            const matchedBySeq = unclaimedList.find((a) => {
              const rawSeq = a.applicantSequence ?? a.ApplicantSequence;
              return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
            });
            if (matchedBySeq) {
              const id = getPdfAddrId(matchedBySeq);
              if (id) claimedPdfAddrIds.add(Number(id));
              return matchedBySeq;
            }

            if (targetSeq === 0 && unclaimedList.length > 0) {
              const candidate = unclaimedList.find((a) => {
                const rawSeq = a.applicantSequence ?? a.ApplicantSequence;
                return rawSeq === undefined || rawSeq === null || Number(rawSeq) === 0;
              });
              if (candidate) {
                const id = getPdfAddrId(candidate);
                if (id) claimedPdfAddrIds.add(Number(id));
                return candidate;
              }
            }

            return null;
          };

          const claimedPdfEmpIds = new Set();
          const getPdfEmpId = (e) =>
            e?.applicationEmploymentIncomeDetailsId ??
            e?.ApplicationEmploymentIncomeDetailsId ??
            e?.employmentIncomeDetailsId ??
            e?.EmploymentIncomeDetailsId ??
            e?.id ??
            e?.Id ??
            null;

          const findEmpRow = (targetSeq, resolvedAddr, resolvedPers, personName = '') => {
            if (!Array.isArray(empList) || empList.length === 0) return null;
            const addrId = resolvedAddr?.applicationAddressDetailsId ?? resolvedAddr?.ApplicationAddressDetailsId ?? resolvedAddr?.addressDetailsId;
            const persId = resolvedPers?.personalInformationId ?? resolvedPers?.PersonalInformationId;

            const unclaimedEmps = empList.filter((e) => {
              const id = getPdfEmpId(e);
              return !id || !claimedPdfEmpIds.has(Number(id));
            });
            if (unclaimedEmps.length === 0) return null;

            if (addrId) {
              const matchedByAddr = unclaimedEmps.filter((e) => {
                const eAddrId = e.applicationAddressDetailsId ?? e.ApplicationAddressDetailsId;
                return eAddrId !== undefined && eAddrId !== null && eAddrId !== '' && Number(eAddrId) === Number(addrId);
              });

              if (matchedByAddr.length === 1) {
                const chosen = matchedByAddr[0];
                const id = getPdfEmpId(chosen);
                if (id) claimedPdfEmpIds.add(Number(id));
                return chosen;
              }

              if (matchedByAddr.length > 1) {
                const matchedBySeq = matchedByAddr.find((e) => {
                  const rawSeq = e.applicantSequence ?? e.ApplicantSequence;
                  return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
                });
                if (matchedBySeq) {
                  const id = getPdfEmpId(matchedBySeq);
                  if (id) claimedPdfEmpIds.add(Number(id));
                  return matchedBySeq;
                }

                if (personName && String(personName).trim().length > 2) {
                  const nameLower = String(personName).trim().toLowerCase();
                  const nameParts = nameLower.split(/\s+/).filter((p) => p.length > 2);
                  const matchedByName = matchedByAddr.find((e) => {
                    const bizName = String(e.employerBusinessName || e.EmployerBusinessName || '').toLowerCase();
                    return nameParts.some((part) => bizName.includes(part));
                  });
                  if (matchedByName) {
                    const id = getPdfEmpId(matchedByName);
                    if (id) claimedPdfEmpIds.add(Number(id));
                    return matchedByName;
                  }
                }

                const sorted = [...matchedByAddr].sort((x, y) => (Number(getPdfEmpId(x)) || 0) - (Number(getPdfEmpId(y)) || 0));
                const chosen = sorted[0];
                if (chosen) {
                  const id = getPdfEmpId(chosen);
                  if (id) claimedPdfEmpIds.add(Number(id));
                  return chosen;
                }
              }
            }

            const matchedBySeq = unclaimedEmps.find((e) => {
              const rawSeq = e.applicantSequence ?? e.ApplicantSequence;
              return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
            });
            if (matchedBySeq) {
              const id = getPdfEmpId(matchedBySeq);
              if (id) claimedPdfEmpIds.add(Number(id));
              return matchedBySeq;
            }

            if (persId) {
              const matched = unclaimedEmps.find((e) => {
                const ePersId = e.personalInformationId ?? e.PersonalInformationId;
                return ePersId !== undefined && ePersId !== null && ePersId !== '' && Number(ePersId) === Number(persId);
              });
              if (matched) {
                const id = getPdfEmpId(matched);
                if (id) claimedPdfEmpIds.add(Number(id));
                return matched;
              }
            }

            if (personName && String(personName).trim().length > 2) {
              const nameLower = String(personName).trim().toLowerCase();
              const nameParts = nameLower.split(/\s+/).filter((p) => p.length > 2);
              const matchedByName = unclaimedEmps.find((e) => {
                const bizName = String(e.employerBusinessName || e.EmployerBusinessName || '').toLowerCase();
                return nameParts.some((part) => bizName.includes(part));
              });
              if (matchedByName) {
                const id = getPdfEmpId(matchedByName);
                if (id) claimedPdfEmpIds.add(Number(id));
                return matchedByName;
              }
            }

            if (unclaimedEmps.length > 0) {
              const sorted = [...unclaimedEmps].sort((x, y) => (Number(getPdfEmpId(x)) || 0) - (Number(getPdfEmpId(y)) || 0));
              const chosen = sorted[0];
              if (chosen) {
                const id = getPdfEmpId(chosen);
                if (id) claimedPdfEmpIds.add(Number(id));
                return chosen;
              }
            }

            return null;
          };

          const claimedPdfBankIds = new Set();
          const getPdfBankId = (b) =>
            b?.applicationBankExistingLoanDetailsId ??
            b?.ApplicationBankExistingLoanDetailsId ??
            b?.bankExistingLoansId ??
            b?.id ??
            b?.Id ??
            null;

          const findBankRowsForEmp = (resolvedEmp, targetSeq) => {
            if (!Array.isArray(bankList) || bankList.length === 0) return [];
            const empId =
              resolvedEmp?.applicationEmploymentIncomeDetailsId ??
              resolvedEmp?.ApplicationEmploymentIncomeDetailsId ??
              resolvedEmp?.employmentIncomeDetailsId;

            const unclaimedBanks = bankList.filter((b) => {
              const id = getPdfBankId(b);
              return !id || !claimedPdfBankIds.has(Number(id));
            });
            if (unclaimedBanks.length === 0) return [];

            if (empId) {
              const matched = unclaimedBanks.filter((b) => {
                const bEmpId = b.applicationEmploymentIncomeDetailsId ?? b.ApplicationEmploymentIncomeDetailsId;
                return bEmpId !== undefined && bEmpId !== null && bEmpId !== '' && Number(bEmpId) === Number(empId);
              });
              if (matched.length > 0) {
                matched.forEach((b) => {
                  const id = getPdfBankId(b);
                  if (id) claimedPdfBankIds.add(Number(id));
                });
                return matched;
              }
            }

            const matchedBySeq = unclaimedBanks.filter((b) => {
              const rawSeq = b.applicantSequence ?? b.ApplicantSequence;
              return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
            });
            if (matchedBySeq.length > 0) {
              matchedBySeq.forEach((b) => {
                const id = getPdfBankId(b);
                if (id) claimedPdfBankIds.add(Number(id));
              });
              return matchedBySeq;
            }

            if (targetSeq === 0 && unclaimedBanks.length === 1) {
              const only = unclaimedBanks[0];
              const onlySeq = only.applicantSequence ?? only.ApplicantSequence;
              if (onlySeq === undefined || onlySeq === null || Number(onlySeq) === 0) {
                const id = getPdfBankId(only);
                if (id) claimedPdfBankIds.add(Number(id));
                return [only];
              }
            }

            return [];
          };

          const transformPers = (p) => {
            if (!p) return null;
            return {
              personalInformationId: p.personalInformationId ?? p.PersonalInformationId ?? null,
              relationshipWithApplicant: p.relationshipId ?? p.RelationshipId ?? '',
              title: p.titleId ?? p.TitleId ?? '',
              firstName: p.firstName ?? p.FirstName ?? '',
              middleName: p.middleName ?? p.MiddleName ?? '',
              lastName: p.lastName ?? p.LastName ?? '',
              fatherOrSpouseName: p.fatherSpouseName ?? p.FatherSpouseName ?? p.fatherOrSpouseName ?? '',
              mothersMaidenName: p.mothersMaidenName ?? p.MothersMaidenName ?? '',
              dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : '',
              religion: p.religionId ?? p.ReligionId ?? '',
              category: p.casteId ?? p.CasteId ?? '',
              gender: p.genderId ?? p.GenderId ?? '',
              maritalStatus: p.maritalStatusId ?? p.MaritalStatusId ?? '',
              mobileNo: p.mobileNumber ?? p.MobileNumber ?? p.mobileNo ?? '',
              emailId: p.emailId ?? p.EmailId ?? '',
            };
          };

          const transformAddr = (a) => {
            if (!a) return null;
            const addressLine1 = a.addressLine1 ?? a.AddressLine1 ?? '';
            const addressLine2 = a.addressLine2 ?? a.AddressLine2 ?? '';
            const landmark = a.landmark ?? a.Landmark ?? '';
            const city = a.cityId ?? a.CityId ?? a.city ?? a.City ?? '';
            const state = a.stateId ?? a.StateId ?? a.state ?? a.State ?? '';
            const pincode = a.pincode ?? a.Pincode ?? a.postalCode ?? a.PostalCode ?? a.pinCode ?? a.PinCode ?? '';
            const rawMailing = a.mailingAsCurrent ?? a.MailingAsCurrent ?? a.mailingSameAsCurrent ?? a.MailingSameAsCurrent;
            const mailingSameAsCurrent = rawMailing !== undefined && rawMailing !== null && rawMailing !== ''
              ? (rawMailing === true || rawMailing === 1 || String(rawMailing).toLowerCase() === 'yes' ? 'Yes' : 'No')
              : 'No';
            return {
              addressLine1,
              addressLine2,
              landmark,
              city,
              cityId: city,
              state,
              stateId: state,
              pincode,
              mailingSameAsCurrent,
              current: {
                addressLine1,
                addressLine2,
                landmark,
                city,
                cityId: city,
                state,
                stateId: state,
                pincode,
              },
            };
          };

          const transformEmp = (e) => {
            if (!e) return null;
            return {
              applicationEmploymentIncomeDetailsId: e.applicationEmploymentIncomeDetailsId ?? e.ApplicationEmploymentIncomeDetailsId ?? e.employmentIncomeDetailsId ?? null,
              employmentIncomeDetailsId: e.applicationEmploymentIncomeDetailsId ?? e.ApplicationEmploymentIncomeDetailsId ?? e.employmentIncomeDetailsId ?? null,
              employerBusinessName: e.employerBusinessName || e.EmployerBusinessName || '',
              employerName: e.employerBusinessName || e.EmployerBusinessName || '',
              designationNatureOfBusiness: e.designationNatureOfBusiness || e.DesignationNatureOfBusiness || '',
              designation: e.designationNatureOfBusiness || e.DesignationNatureOfBusiness || '',
              employmentNature: e.employmentTypeId ?? e.EmploymentTypeId ?? '',
              employmentType: e.employmentTypeId ?? e.EmploymentTypeId ?? '',
              employmentTypeId: e.employmentTypeId ?? e.EmploymentTypeId ?? '',
              qualification: e.educationId ?? e.EducationId ?? '',
              educationId: e.educationId ?? e.EducationId ?? '',
              industryType: e.industryType || e.IndustryType || '',
              totalExperienceYears: e.totalExperience ?? e.TotalExperience ?? '',
              totalExperience: e.totalExperience ?? e.TotalExperience ?? '',
              grossMonthlyIncome: e.grossMonthlyIncome ?? e.GrossMonthlyIncome ?? '',
              otherIncomeMonthly: e.otherMonthlyIncome ?? e.OtherMonthlyIncome ?? '',
              otherMonthlyIncome: e.otherMonthlyIncome ?? e.OtherMonthlyIncome ?? '',
              netMonthlyIncome: e.netMonthlyIncome ?? e.NetMonthlyIncome ?? '',
              grossAnnualIncome: e.grossAnnualIncome ?? e.GrossAnnualIncome ?? '',
            };
          };

          const transformBank = (b) => {
            if (!b) return null;
            const bankName = b.bankId ?? b.BankId ?? b.bankName ?? b.BankName ?? '';
            const branch = b.bankBranchId ?? b.BankBranchId ?? b.branch ?? b.Branch ?? '';
            const accountNumber = b.accountNumber ?? b.AccountNumber ?? '';
            const accountHolderName = b.accountHolderName ?? b.AccountHolderName ?? '';
            const rawLoans = b.noOfActiveLoans ?? b.NoOfActiveLoans;
            const noOfActiveLoans = rawLoans !== undefined && rawLoans !== null && rawLoans !== '' ? String(rawLoans) : '';
            const rawCards = b.noOfActiveCreditCards ?? b.NoOfActiveCreditCards;
            const noOfActiveCreditCards = rawCards !== undefined && rawCards !== null && rawCards !== '' ? String(rawCards) : '';
            const isPrimaryBank = b.isPrimaryBank ?? b.IsPrimaryBank ?? false;
            return {
              applicationBankExistingLoanDetailsId: b.applicationBankExistingLoanDetailsId ?? b.ApplicationBankExistingLoanDetailsId ?? null,
              bankName,
              bankId: bankName,
              branch,
              bankBranchId: branch,
              accountNumber,
              accountHolderName,
              noOfActiveLoans,
              noOfActiveCreditCards,
              isPrimaryBank,
            };
          };

          const liveApplicantPers = findPersRow(0, applicantKyc);
          const liveApplicantAddr = findAddrRow(0, liveApplicantPers, applicantKyc);
          const applicantName = composeFullName(liveApplicantPers) || liveCustomer?.customerName || '';
          const liveApplicantEmp = findEmpRow(0, liveApplicantAddr, liveApplicantPers, applicantName);
          const liveApplicantBanks = findBankRowsForEmp(liveApplicantEmp, 0);
          const livePrimaryBank = liveApplicantBanks.find((b) => b.isPrimaryBank === true || b.IsPrimaryBank === true) || liveApplicantBanks[0] || null;
          const liveOtherBank = liveApplicantBanks.find((b) => (b.isPrimaryBank === false || b.IsPrimaryBank === false) && b !== livePrimaryBank) || liveApplicantBanks[1] || null;

          const totalCoCount = Math.max(
            coApplicantKycs.length,
            Number(appData.coApplicantsCount || getApplicantCount(appData)) || 0
          );

          const liveCoPersList = [];
          const liveCoAddrList = [];
          const liveCoEmpList = [];
          const liveCoBanksList = [];

          for (let i = 0; i < totalCoCount; i++) {
            const coKyc = coApplicantKycs[i] || null;
            const coPers = findPersRow(i + 1, coKyc);
            const coAddr = findAddrRow(i + 1, coPers, coKyc);
            const coName = composeFullName(coPers);
            const coEmp = findEmpRow(i + 1, coAddr, coPers, coName);
            const coBanks = findBankRowsForEmp(coEmp, i + 1);
            const coPrimary = coBanks.find((b) => b.isPrimaryBank === true || b.IsPrimaryBank === true) || coBanks[0] || null;
            const coOther = coBanks.find((b) => (b.isPrimaryBank === false || b.IsPrimaryBank === false) && b !== coPrimary) || coBanks[1] || null;

            liveCoPersList.push(transformPers(coPers) || {});
            liveCoAddrList.push(transformAddr(coAddr) || {});
            liveCoEmpList.push(transformEmp(coEmp) || {});
            liveCoBanksList.push({
              primaryBank: transformBank(coPrimary) || {},
              otherBank: transformBank(coOther) || {},
            });
          }

          if (liveApplicantPers || liveCoPersList.length > 0) {
            setLivePersonal({
              applicant: transformPers(liveApplicantPers) || {},
              coApplicants: liveCoPersList,
            });
          }

          if (liveApplicantAddr || liveCoAddrList.length > 0) {
            setLiveAddress({
              applicant: transformAddr(liveApplicantAddr) || {},
              coApplicants: liveCoAddrList,
            });
          }

          if (liveApplicantEmp || liveCoEmpList.length > 0) {
            setLiveEmployment({
              applicant: transformEmp(liveApplicantEmp) || {},
              coApplicants: liveCoEmpList,
            });
          }

          if (livePrimaryBank || liveOtherBank || liveCoBanksList.length > 0) {
            setLiveBank({
              applicant: {
                primaryBank: transformBank(livePrimaryBank) || {},
                otherBank: transformBank(liveOtherBank) || {},
              },
              primaryBank: transformBank(livePrimaryBank) || {},
              otherBank: transformBank(liveOtherBank) || {},
              coApplicants: liveCoBanksList,
            });
          }

          // 3. Collateral details
          if (collateralDetailsRes.status === 'fulfilled' && collateralDetailsRes.value) {
            const rawColList = extractArray(collateralDetailsRes.value);
            const prodList = productDetailsRes.status === 'fulfilled' ? extractArray(productDetailsRes.value) : [];

            // 1. Find product details record for this customer
            const matchedProduct = prodList.find(
              (p) =>
                String(p.agentCustomerId ?? p.AgentCustomerId) === String(resolvedCustomerId) ||
                String(p.agentCustomerId ?? p.AgentCustomerId) === String(applicationId)
            );
            const targetProdId =
              matchedProduct?.applicationProductDetailsId ??
              matchedProduct?.ApplicationProductDetailsId ??
              appData.applicationProductDetailsId;

            // 2. Filter collateral records for this product
            let matchedCollaterals = [];
            if (targetProdId) {
              matchedCollaterals = rawColList.filter(
                (c) => String(c.applicationProductDetailsId ?? c.ApplicationProductDetailsId) === String(targetProdId)
              );
            }

            if (matchedCollaterals.length === 0 && appData.applicationCollateralDetailsId) {
              matchedCollaterals = rawColList.filter(
                (c) => String(c.applicationCollateralDetailsId ?? c.ApplicationCollateralDetailsId) === String(appData.applicationCollateralDetailsId)
              );
            }

            if (matchedCollaterals.length > 0) {
              const liveList = matchedCollaterals.map((c) => ({
                applicationCollateralDetailsId: c.applicationCollateralDetailsId ?? c.ApplicationCollateralDetailsId,
                typeOfProperty: c.propertyId ?? c.PropertyId ?? c.typeOfProperty ?? c.propertyType ?? '',
                usage: c.propertyUsageId ?? c.PropertyUsageId ?? c.usage ?? c.propertyUsage ?? '',
                locationAddress: c.locationAddress || c.LocationAddress || c.propertyAddress || c.PropertyAddress || '',
                estimatedValue: c.estimatedValue ?? c.EstimatedValue ?? '',
                propertyName: c.propertyName ?? c.PropertyName ?? '',
                propertyUsageName: c.propertyUsageName ?? c.PropertyUsageName ?? '',
              }));
              setLiveCollateral(liveList);
            }
          }

          // Resolve RM & Ownership strictly from backend ApplicationFullDetails
          let resolvedOwnership = null;
          if (fullDetailsRes?.status === 'fulfilled' && fullDetailsRes.value) {
            const rawVal = fullDetailsRes.value?.value || fullDetailsRes.value?.data || fullDetailsRes.value;
            const fullRmName = rawVal?.rmName ?? rawVal?.RmName ?? rawVal?.customer?.rmName ?? rawVal?.customer?.RmName ?? null;
            const fullRmCode = rawVal?.rmCode ?? rawVal?.RmCode ?? rawVal?.customer?.rmCode ?? rawVal?.customer?.RmCode ?? null;
            const fullCustomerSource = rawVal?.customerSource ?? rawVal?.CustomerSource ?? rawVal?.customer?.customerSource ?? null;
            const fullAgentName = rawVal?.agentName ?? rawVal?.AgentName ?? rawVal?.customer?.agentName ?? null;
            const fullAgentId = rawVal?.agentId ?? rawVal?.AgentId ?? rawVal?.customer?.agentId ?? null;

            if (fullRmName || fullRmCode) {
              resolvedOwnership = {
                name: fullRmName || '',
                employeeId: fullRmCode || '',
                customerSource: fullCustomerSource || '',
                agentName: fullAgentName || '',
                agentId: fullAgentId ?? null,
              };
            }
          }

          // Secondary fallback to RMMaster only if ApplicationFullDetails didn't include rmName/rmCode
          if (!resolvedOwnership && rmRes.status === 'fulfilled' && rmRes.value) {
            const data = rmRes.value;
            const rows = extractArray(data);
            const rmIdFromRecord = Number(
              currentCust?.rmId ||
              currentCust?.RMId ||
              0
            );
            if (rmIdFromRecord > 0) {
              const matched = rows.find((r) => Number(r.rmId || r.RMId || r.id) === rmIdFromRecord);
              if (matched) {
                resolvedOwnership = {
                  name: matched.fullName || matched.name || '',
                  employeeId: matched.rmCode || matched.employeeId || `RM${String(matched.rmId).padStart(4, '0')}`,
                  customerSource: currentCust?.customerSource || '',
                  agentName: currentCust?.agentName || '',
                  agentId: currentCust?.agentId ?? null,
                };
              }
            }
          }

          if (resolvedOwnership) {
            setLiveRM(resolvedOwnership);
          }

          setMasterMaps({
            sourcingChannels: sourcingMap.status === 'fulfilled' ? sourcingMap.value : {},
            loanProducts: prodMap.status === 'fulfilled' ? prodMap.value : {},
            loanPurposes: purposeMap.status === 'fulfilled' ? purposeMap.value : {},
            loanVariations: variationMap.status === 'fulfilled' ? variationMap.value : {},
            titles: titleMap.status === 'fulfilled' ? titleMap.value : {},
            genders: genderMap.status === 'fulfilled' ? genderMap.value : {},
            castes: casteMap.status === 'fulfilled' ? casteMap.value : {},
            religions: religionMap.status === 'fulfilled' ? religionMap.value : {},
            maritalStatuses: maritalMap.status === 'fulfilled' ? maritalMap.value : {},
            relationships: relMap.status === 'fulfilled' ? relMap.value : {},
            documentTypes: docTypeMap.status === 'fulfilled' ? docTypeMap.value : {},
            verifications: verifMap.status === 'fulfilled' ? verifMap.value : {},
            banks: bankMap.status === 'fulfilled' ? bankMap.value : {},
            properties: propertyMap.status === 'fulfilled' ? propertyMap.value : {},
            propertyUsages: propertyUsageMap.status === 'fulfilled' ? propertyUsageMap.value : {},
            employmentTypes: empTypeMap.status === 'fulfilled' ? empTypeMap.value : {},
            educations: eduMap.status === 'fulfilled' ? eduMap.value : {},
            industryTypes: industryTypeMap.status === 'fulfilled' ? industryTypeMap.value : {},
            cities: cityMap.status === 'fulfilled' ? cityMap.value : {},
            states: stateMap.status === 'fulfilled' ? stateMap.value : {},
          });
          setIsMetadataLoading(false);
        }

        // Fetch and download actual uploaded customer documents
        try {
          const headers = {};
          const token = localStorage.getItem('authToken');
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const candidateIds = [resolvedCustomerId, applicationId, appData.agentCustomerId].filter(Boolean);
          const uniqueCandidateIds = [...new Set(candidateIds)];

          let activeDocs = [];

          for (const candId of uniqueCandidateIds) {
            try {
              const res = await fetch(`${API_BASE}/AgentCustomerDocument/bycustomer/${candId}`, { headers });
              if (res.ok) {
                const docData = await res.json();
                const docList = Array.isArray(docData) ? docData : (docData?.data || docData?.value || docData?.items || []);
                const filtered = docList.filter((d) => d.isActive !== false);
                if (filtered.length > 0) {
                  activeDocs = filtered;
                  break;
                }
              }
            } catch {
              // try next
            }
          }

          if (activeDocs.length > 0) {
            // Group documents by person key + document type so Applicant and Co-Applicant don't collide
            const docsByType = {};
            activeDocs.forEach((d) => {
              const seq = d.applicantSequence !== undefined && d.applicantSequence !== null ? String(d.applicantSequence) : '0';
              const kycId = d.applicationKYCDocumentId || d.kycDocumentId || '';
              const personKey = seq !== '0' ? `seq_${seq}` : (kycId ? `kyc_${kycId}` : 'applicant');
              const typeKey = `${personKey}_${String(d.documentTypeId || d.documentTypeName || 'other').toLowerCase()}`;
              if (!docsByType[typeKey]) docsByType[typeKey] = [];
              docsByType[typeKey].push(d);
            });

            // For each document type, select the latest uploaded active version
            const selectedDocs = [];
            Object.keys(docsByType).forEach((typeKey) => {
              const list = docsByType[typeKey];
              list.sort((a, b) => {
                const timeA = new Date(a.createdAt || 0).getTime();
                const timeB = new Date(b.createdAt || 0).getTime();
                if (timeA !== timeB) return timeA - timeB;
                return (a.agentCustomerDocumentId || 0) - (b.agentCustomerDocumentId || 0);
              });

              // Latest uploaded document is the active accepted document
              selectedDocs.push(list[list.length - 1]);
            });

            const loaded = await Promise.all(
              selectedDocs.map(async (doc) => {
                const docId = doc.agentCustomerDocumentId || doc.id;
                const fileName = doc.fileName || '';
                const ext = fileName.split('.').pop()?.toLowerCase();
                const isPdf = ext === 'pdf';

                try {
                  const dlRes = await fetch(`${API_BASE}/AgentCustomerDocument/download/${docId}`, { headers });
                  if (dlRes.ok) {
                    const rawBlob = await dlRes.blob();
                    let mimeType = 'application/octet-stream';
                    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                    else if (ext === 'png') mimeType = 'image/png';
                    else if (ext === 'pdf') mimeType = 'application/pdf';
                    else if (ext === 'webp') mimeType = 'image/webp';
                    else if (rawBlob.type && rawBlob.type !== 'application/octet-stream') mimeType = rawBlob.type;

                    const typedBlob = new Blob([rawBlob], { type: mimeType });
                    const previewUrl = URL.createObjectURL(typedBlob);
                    blobUrlsRef.current.push(previewUrl);

                    return {
                      agentCustomerDocumentId: docId,
                      applicantSequence: doc.applicantSequence !== undefined ? doc.applicantSequence : (doc.ApplicantSequence !== undefined ? doc.ApplicantSequence : null),
                      applicationKYCDocumentId: doc.applicationKYCDocumentId || doc.ApplicationKYCDocumentId || doc.kycDocumentId || null,
                      kycDocumentId: doc.applicationKYCDocumentId || doc.ApplicationKYCDocumentId || doc.kycDocumentId || null,
                      documentTypeId: doc.documentTypeId,
                      documentTypeName: doc.documentTypeName || doc.documentType || '',
                      fileName,
                      filePath: doc.filePath,
                      fileType: isPdf ? 'pdf' : 'image',
                      previewUrl,
                      createdAt: doc.createdAt,
                      isActive: doc.isActive !== false,
                    };
                  }
                } catch (dlErr) {
                  console.error('Error downloading document for PDF View:', dlErr);
                }

                return {
                  agentCustomerDocumentId: docId,
                  applicantSequence: doc.applicantSequence !== undefined ? doc.applicantSequence : (doc.ApplicantSequence !== undefined ? doc.ApplicantSequence : null),
                  applicationKYCDocumentId: doc.applicationKYCDocumentId || doc.ApplicationKYCDocumentId || doc.kycDocumentId || null,
                  kycDocumentId: doc.applicationKYCDocumentId || doc.ApplicationKYCDocumentId || doc.kycDocumentId || null,
                  documentTypeId: doc.documentTypeId,
                  documentTypeName: doc.documentTypeName || doc.documentType || '',
                  fileName,
                  filePath: doc.filePath,
                  fileType: isPdf ? 'pdf' : 'image',
                  previewUrl,
                  createdAt: doc.createdAt,
                  isActive: doc.isActive !== false,
                };
              })
            );

            if (active && loaded.length > 0) {
              setDownloadedDocs(loaded);
            }
          }
        } catch (docErr) {
          console.error('Failed to load customer documents for PDF View:', docErr);
        } finally {
          if (active) {
            setIsDocsDownloading(false);
          }
        }
      } catch (err) {
        console.error('Error fetching PDF preview data:', err);
      } finally {
        if (active) {
          setIsMetadataLoading(false);
          setIsDocsDownloading(false);
        }
      }
    }

    loadAllData();

    return () => {
      active = false;
    };
  }, [applicationId]);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorPopup, setErrorPopup] = useState(null);

  const isPdfMediaReady = !isMetadataLoading && !isDocsDownloading && !isCoPhotosLoading && !isApplicantPhotoLoading;

  // Shared helper to generate jsPDF instance from DOM
  const generatePdfInstance = async () => {
    const element = pdfRef.current;
    if (!element) throw new Error('PDF container not found');

    // Ensure images are fully loaded and decoded before rendering canvas
    const imgElements = Array.from(element.querySelectorAll('img'));
    await Promise.all(
      imgElements.map(async (img) => {
        if (!img.complete) {
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
        if (img.decode) {
          try {
            await img.decode();
          } catch {
            // Ignore decode errors if unsupported or already rendered
          }
        }
      })
    );

    const fullHeight = element.scrollHeight || element.offsetHeight || 3000;
    const fullWidth = element.scrollWidth || element.offsetWidth || 820;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: fullWidth,
      height: fullHeight,
      windowWidth: fullWidth,
      windowHeight: fullHeight,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        const clonedContainer = clonedDoc.querySelector('.pdf-container');
        if (clonedContainer) {
          clonedContainer.style.height = 'auto';
          clonedContainer.style.maxHeight = 'none';
          clonedContainer.style.overflow = 'visible';
          clonedContainer.style.position = 'static';
          clonedContainer.style.display = 'block';
        }
        const clonedPage = clonedDoc.querySelector('.pdf-page-continuous');
        if (clonedPage) {
          clonedPage.style.height = 'auto';
          clonedPage.style.maxHeight = 'none';
          clonedPage.style.overflow = 'visible';
          clonedPage.style.position = 'static';
          clonedPage.style.display = 'block';
        }
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const pdfWidth = 210; // 210mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight],
      compress: true,
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    return pdf;
  };

  // Generate continuous single long page PDF for download
  const handleDownloadPdf = async () => {
    if (!pdfRef.current || isGeneratingPdf || !isPdfMediaReady) return;
    setIsGeneratingPdf(true);

    try {
      const pdf = await generatePdfInstance();
      pdf.save(`Loan_Application_${applicationId}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setErrorPopup({
        title: 'PDF generation failed',
        message: 'Failed to generate PDF. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Generate and share PDF via native Web Share API with download fallback
  const handleSharePdf = async () => {
    if (!pdfRef.current || isGeneratingPdf || !isPdfMediaReady) return;
    setIsGeneratingPdf(true);

    try {
      const pdf = await generatePdfInstance();
      const fileName = `Loan_Application_${applicationId}.pdf`;
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Runtime feature detection for Web Share API and PDF file sharing support
      const canShareFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [pdfFile] });

      if (canShareFiles) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: 'Loan Application',
            text: 'Loan Application PDF',
          });
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            // User cancelled or closed the native share sheet - do not show error or auto-download
            return;
          }
          throw shareErr;
        }
      } else {
        // Fallback for unsupported browsers: download the already generated PDF and inform user
        pdf.save(fileName);
        setErrorPopup({
          title: 'Direct File Sharing Unsupported',
          message:
            'Direct file sharing is not supported in this browser. The PDF has been downloaded so you can share it manually.',
          variant: 'info',
        });
      }
    } catch (err) {
      console.error('Error sharing PDF:', err);
      setErrorPopup({
        title: 'Sharing failed',
        message: 'Failed to share PDF. Please try downloading it instead.',
        variant: 'error',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Master resolvers
  const resolveSourcingChannel = (val) => masterMaps.sourcingChannels[val] || val || '';
  const resolveLoanProduct = (val) => masterMaps.loanProducts[val] || appData.loanProductDisplay || val || '';
  const resolveLoanVariation = (val) => {
    if (val === null || val === undefined || val === '') return '';
    return masterMaps.loanVariations?.[val] || masterMaps.loanVariations?.[String(val)] || '';
  };
  const resolveLoanPurpose = (val) => masterMaps.loanPurposes[val] || appData.loanType || val || '';
  const resolveTitle = (val) => masterMaps.titles[val] || val || '';
  const resolveGender = (val) => masterMaps.genders[val] || val || '';
  const resolveCategory = (val) => masterMaps.castes[val] || val || '';
  const resolveReligion = (val) => masterMaps.religions[val] || val || '';
  const resolveMaritalStatus = (val) => masterMaps.maritalStatuses[val] || val || '';
  const resolveRelationship = (val) => {
    if (val === null || val === undefined || val === '') return '';
    if (masterMaps.relationships && (masterMaps.relationships[val] !== undefined || masterMaps.relationships[String(val)] !== undefined)) {
      return masterMaps.relationships[val] || masterMaps.relationships[String(val)] || '';
    }
    return String(val);
  };
  const resolveVerification = (val) => {
    if (val === null || val === undefined || val === '') return 'Verified';
    if (masterMaps.verifications && (masterMaps.verifications[val] !== undefined || masterMaps.verifications[String(val)] !== undefined)) {
      return masterMaps.verifications[val] || masterMaps.verifications[String(val)] || 'Verified';
    }
    return String(val);
  };
  const resolveDocType = (val) => {
    if (val === undefined || val === null || val === '') return '';
    if (masterMaps.documentTypes && (masterMaps.documentTypes[val] || masterMaps.documentTypes[String(val)])) {
      return masterMaps.documentTypes[val] || masterMaps.documentTypes[String(val)];
    }
    const num = Number(val);
    if (num === 1) return 'Aadhaar';
    if (num === 2) return 'PAN Card';
    if (num === 3) return 'Bank Statement';
    if (num === 4) return 'Salary Slip';
    if (num === 6) return 'Photo';
    return String(val);
  };
  const resolveBank = (val) => {
    if (val === null || val === undefined || val === '') return '';
    if (masterMaps.banks && masterMaps.banks[val] !== undefined) {
      return masterMaps.banks[val];
    }
    if (masterMaps.banks && masterMaps.banks[String(val)] !== undefined) {
      return masterMaps.banks[String(val)];
    }
    return val;
  };
  const resolveProperty = (val) => {
    if (val === null || val === undefined || val === '') return '';
    if (masterMaps.properties && masterMaps.properties[val] !== undefined) {
      return masterMaps.properties[val];
    }
    if (masterMaps.properties && masterMaps.properties[String(val)] !== undefined) {
      return masterMaps.properties[String(val)];
    }
    return val;
  };

  const resolvePropertyUsage = (val) => {
    if (val === null || val === undefined || val === '') return '';
    if (masterMaps.propertyUsages && masterMaps.propertyUsages[val] !== undefined) {
      return masterMaps.propertyUsages[val];
    }
    if (masterMaps.propertyUsages && masterMaps.propertyUsages[String(val)] !== undefined) {
      return masterMaps.propertyUsages[String(val)];
    }
    return val;
  };

  const resolveEmploymentType = (val) => {
    if (val === null || val === undefined || val === '') return '';
    if (masterMaps.employmentTypes && (masterMaps.employmentTypes[val] !== undefined || masterMaps.employmentTypes[String(val)] !== undefined)) {
      return masterMaps.employmentTypes[val] || masterMaps.employmentTypes[String(val)];
    }
    return String(val);
  };
  const resolveEducation = (val) => {
    if (val === null || val === undefined || val === '') return '';
    if (masterMaps.educations && (masterMaps.educations[val] !== undefined || masterMaps.educations[String(val)] !== undefined)) {
      return masterMaps.educations[val] || masterMaps.educations[String(val)];
    }
    return String(val);
  };
  const resolveIndustryType = (val) => {
    if (val === null || val === undefined || val === '') return '-';
    if (masterMaps.industryTypes && (masterMaps.industryTypes[val] !== undefined || masterMaps.industryTypes[String(val)] !== undefined)) {
      return masterMaps.industryTypes[val] || masterMaps.industryTypes[String(val)];
    }
    return String(val);
  };
  const resolveCity = (val) => {
    if (val === null || val === undefined || val === '') return '';
    if (masterMaps.cities && (masterMaps.cities[val] !== undefined || masterMaps.cities[String(val)] !== undefined)) {
      return masterMaps.cities[val] || masterMaps.cities[String(val)];
    }
    return String(val);
  };
  const resolveState = (val) => {
    if (val === null || val === undefined || val === '') return '';
    if (masterMaps.states && (masterMaps.states[val] !== undefined || masterMaps.states[String(val)] !== undefined)) {
      return masterMaps.states[val] || masterMaps.states[String(val)];
    }
    return String(val);
  };

  const formatCurrencyOrDash = (val) => {
    if (val === null || val === undefined || val === '') return '-';
    const num = Number(val);
    if (isNaN(num)) return val;
    return `Rs. ${num.toLocaleString('en-IN')}`;
  };

  const formatExperience = (exp) => {
    if (exp === null || exp === undefined || exp === '') return '-';
    const num = Number(exp);
    return !isNaN(num) ? `${num} Years` : `${exp} Years`;
  };

  const personalData = appData.registration?.personalInformation || appData.sections?.personalInformation || {};
  const draftApplicant = personalData.applicant || {};
  const draftCoApplicants = Array.isArray(personalData.coApplicants) ? personalData.coApplicants : [];

  const applicant = useMemo(() => {
    const base = { ...draftApplicant };
    if (livePersonal?.applicant) {
      Object.entries(livePersonal.applicant).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          base[k] = v;
        }
      });
    }
    return base;
  }, [draftApplicant, livePersonal]);

  const kycData = appData.kycDocuments || appData.sections?.kycDocuments || {};

  // Dynamic Co-Applicants Resolution using explicit count first
  const explicitCoApplicantCount =
    appData?.coApplicantsCount !== undefined &&
    appData?.coApplicantsCount !== null &&
    appData?.coApplicantsCount !== ''
      ? Number(appData.coApplicantsCount)
      : (appData?.noOfCoApplicants !== undefined &&
         appData?.noOfCoApplicants !== null &&
         appData?.noOfCoApplicants !== ''
        ? Number(appData.noOfCoApplicants)
        : null);

  const applicantCount =
    explicitCoApplicantCount !== null && Number.isFinite(explicitCoApplicantCount)
      ? Math.max(0, explicitCoApplicantCount)
      : Math.max(
          getApplicantCount(appData),
          liveKycCoApplicants.length,
          Array.isArray(kycData.coApplicants) ? kycData.coApplicants.length : 0,
          draftCoApplicants.length,
          livePersonal?.coApplicants?.length || 0
        );

  const coApplicants = useMemo(() => {
    return Array.from({ length: applicantCount }, (_, i) => {
      const draftCo = draftCoApplicants[i] || {};
      const liveCo = livePersonal?.coApplicants?.[i] || {};
      const merged = { ...draftCo };
      Object.entries(liveCo).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          merged[k] = v;
        }
      });
      return merged;
    });
  }, [applicantCount, draftCoApplicants, livePersonal]);

  const hasCoApplicants = applicantCount > 0;

  const coApplicantKycIds = useMemo(() => {
    const rawCoKycs = Array.isArray(kycData.coApplicants) ? kycData.coApplicants : [];
    return Array.from({ length: applicantCount }, (_, i) => {
      const targetSeq = i + 1;
      const matchedLiveRecord = Array.isArray(liveAllKycRecords)
        ? liveAllKycRecords.find((k) => {
            if (!k || k.isActive === false || k.IsActive === false) return false;
            if (isApplicantDocumentTuple(k)) return false;
            const seq = k.applicantSequence ?? k.ApplicantSequence;
            return seq !== undefined && seq !== null && Number(seq) === targetSeq;
          })
        : null;
      const matchedLiveCo = Array.isArray(liveKycCoApplicants)
        ? liveKycCoApplicants.find((k) => {
            if (!k || k.isActive === false || k.IsActive === false) return false;
            if (isApplicantDocumentTuple(k)) return false;
            const seq = k.applicantSequence ?? k.ApplicantSequence;
            return seq !== undefined && seq !== null && Number(seq) === targetSeq;
          })
        : null;
      const coKyc = rawCoKycs[i] || {};
      const liveKyc = matchedLiveCo || liveKycCoApplicants[i] || {};
      return (
        matchedLiveRecord?.applicationKYCDocumentId ||
        matchedLiveRecord?.ApplicationKYCDocumentId ||
        matchedLiveRecord?.kycDocumentId ||
        matchedLiveRecord?.id ||
        coKyc.applicationKYCDocumentId ||
        coKyc.ApplicationKYCDocumentId ||
        coKyc.applicationKycDocumentId ||
        coKyc.kycDocumentId ||
        coKyc.KycDocumentId ||
        coKyc.id ||
        coKyc.Id ||
        liveKyc.applicationKYCDocumentId ||
        liveKyc.ApplicationKYCDocumentId ||
        liveKyc.applicationKycDocumentId ||
        liveKyc.kycDocumentId ||
        liveKyc.KycDocumentId ||
        liveKyc.id ||
        liveKyc.Id ||
        null
      );
    });
  }, [kycData.coApplicants, liveKycCoApplicants, liveAllKycRecords, applicantCount]);

  const coApplicantKycIdsKey = useMemo(() => {
    return coApplicantKycIds.map((id) => id || '').join(',');
  }, [coApplicantKycIds]);

  // Resolve Applicant Primary KYC Record (Sequence 0 & Non-Tuple)
  const resolvedApplicantKyc = useMemo(() => {
    if (liveApplicantKyc && !isApplicantDocumentTuple(liveApplicantKyc)) {
      return liveApplicantKyc;
    }
    const draftAppKyc = kycData.applicant || {};
    if (
      draftAppKyc &&
      !isApplicantDocumentTuple(draftAppKyc) &&
      (draftAppKyc.applicationKYCDocumentId || draftAppKyc.kycDocumentId || draftAppKyc.profileImagePath)
    ) {
      return draftAppKyc;
    }
    if (Array.isArray(liveAllKycRecords) && liveAllKycRecords.length > 0) {
      const match = liveAllKycRecords.find((k) => {
        if (!k || k.isActive === false || k.IsActive === false) return false;
        if (isApplicantDocumentTuple(k)) return false;
        const seq = k.applicantSequence ?? k.ApplicantSequence;
        return seq !== undefined && seq !== null && Number(seq) === 0;
      });
      if (match) return match;
    }
    return null;
  }, [liveApplicantKyc, kycData.applicant, liveAllKycRecords]);

  const applicantKycId = useMemo(() => {
    return (
      resolvedApplicantKyc?.applicationKYCDocumentId ||
      resolvedApplicantKyc?.ApplicationKYCDocumentId ||
      resolvedApplicantKyc?.kycDocumentId ||
      resolvedApplicantKyc?.KycDocumentId ||
      resolvedApplicantKyc?.id ||
      null
    );
  }, [resolvedApplicantKyc]);

  const applicantProfilePath = useMemo(() => {
    return (
      resolvedApplicantKyc?.profileImagePath ||
      resolvedApplicantKyc?.ProfileImagePath ||
      null
    );
  }, [resolvedApplicantKyc]);

  // Fetch Applicant Profile Image from Live KYC endpoint (primary) or path download (fallback)
  useEffect(() => {
    if (!applicantKycId && !applicantProfilePath) {
      setIsApplicantPhotoLoading(false);
      return;
    }

    setIsApplicantPhotoLoading(true);
    let isMounted = true;
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    async function loadApplicantPhoto() {
      let objectUrl = null;

      // 1. Primary: GET /ApplicationKYCDocuments/{applicantKycId}/profile-image
      if (applicantKycId) {
        try {
          const res = await fetch(`${API_BASE}/ApplicationKYCDocuments/${applicantKycId}/profile-image`, { headers });
          if (res.ok && isMounted) {
            const blob = await res.blob();
            if (blob && blob.size > 0) {
              const mimeType = blob.type || 'image/jpeg';
              const typedBlob = new Blob([blob], { type: mimeType });
              objectUrl = URL.createObjectURL(typedBlob);
            }
          }
        } catch (err) {
          console.warn(`Could not load profile image for applicant KYC ${applicantKycId}:`, err);
        }
      }

      // 2. Fallback: GET /ApplicationKYCDocuments/download?path={encoded applicantProfilePath}
      if (!objectUrl && applicantProfilePath && isMounted) {
        try {
          const cleanPath = String(applicantProfilePath).trim();
          const dlRes = await fetch(`${API_BASE}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`, { headers });
          if (dlRes.ok && isMounted) {
            const blob = await dlRes.blob();
            if (blob && blob.size > 0) {
              const mimeType = blob.type || 'image/jpeg';
              const typedBlob = new Blob([blob], { type: mimeType });
              objectUrl = URL.createObjectURL(typedBlob);
            }
          }
        } catch (dlErr) {
          console.warn(`Could not download applicant profile by path ${applicantProfilePath}:`, dlErr);
        }
      }

      if (isMounted) {
        if (objectUrl) {
          blobUrlsRef.current.push(objectUrl);
          setApplicantPhotoUrl(objectUrl);
        } else {
          setApplicantPhotoUrl(null);
        }
        setIsApplicantPhotoLoading(false);
      }
    }

    loadApplicantPhoto();

    return () => {
      isMounted = false;
    };
  }, [applicantKycId, applicantProfilePath]);

  // Fetch Co-Applicant Profile Images using dynamic kycDocumentId
  useEffect(() => {
    if (!hasCoApplicants) {
      setIsCoPhotosLoading(false);
      return;
    }

    const validKycIds = coApplicantKycIds.filter(Boolean);
    if (validKycIds.length === 0) {
      setIsCoPhotosLoading(false);
      return;
    }

    setIsCoPhotosLoading(true);
    let isMounted = true;
    let remaining = validKycIds.length;
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    coApplicantKycIds.forEach((kycId, idx) => {
      if (!kycId) return;

      fetch(`${API_BASE}/ApplicationKYCDocuments/${kycId}/profile-image`, { headers })
        .then(async (res) => {
          if (res.ok && isMounted) {
            const blob = await res.blob();
            if (blob && blob.size > 0) {
              const mimeType = blob.type || 'image/jpeg';
              const typedBlob = new Blob([blob], { type: mimeType });
              const objectUrl = URL.createObjectURL(typedBlob);
              blobUrlsRef.current.push(objectUrl);
              if (isMounted) {
                setCoApplicantPhotos((prev) => ({
                  ...prev,
                  [idx]: objectUrl,
                  [String(idx)]: objectUrl,
                  [kycId]: objectUrl,
                  [String(kycId)]: objectUrl,
                }));
              }
            }
          }
        })
        .catch((err) => {
          console.warn(`Could not load profile image for co-applicant KYC ${kycId}:`, err);
        })
        .finally(() => {
          remaining--;
          if (remaining <= 0 && isMounted) {
            setIsCoPhotosLoading(false);
          }
        });
    });

    return () => {
      isMounted = false;
    };
  }, [hasCoApplicants, coApplicantKycIdsKey]);

  const rawAddress = appData.addressDetails || appData.sections?.addressDetails || {};
  const rawAddressApplicant = rawAddress.applicant || {};
  const liveAddressApplicant = liveAddress?.applicant || {};
  const mergedAddressApplicant = mergeNonEmpty(liveAddressApplicant, rawAddressApplicant);

  const addressData = {
    applicant: mergedAddressApplicant,
    coApplicants: Array.from({ length: applicantCount }, (_, i) => {
      const draftAddrCo = rawAddress.coApplicants?.[i] || {};
      const liveAddrCo = liveAddress?.coApplicants?.[i] || {};
      return mergeNonEmpty(liveAddrCo, draftAddrCo);
    }),
  };
  
  const rawEmp = appData.employmentIncome || appData.sections?.employmentIncome || {};
  const rawEmpApplicant = rawEmp.applicant || {};
  const liveEmpApplicant = liveEmployment?.applicant || {};
  const mergedEmpApplicant = mergeNonEmpty(liveEmpApplicant, rawEmpApplicant);

  const empData = {
    applicant: mergedEmpApplicant,
    coApplicants: Array.from({ length: applicantCount }, (_, i) => {
      const draftEmpCo = rawEmp.coApplicants?.[i] || {};
      const liveEmpCo = liveEmployment?.coApplicants?.[i] || {};
      return mergeNonEmpty(liveEmpCo, draftEmpCo);
    }),
  };

  const rawBank = appData.bankExistingLoans || appData.sections?.bankExistingLoans || {};
  const rawBankApplicantPrimary = rawBank.applicant?.primaryBank || rawBank.primaryBank || {};
  const rawBankApplicantOther = rawBank.applicant?.otherBank || rawBank.otherBank || {};
  const liveBankApplicantPrimary = liveBank?.applicant?.primaryBank || liveBank?.primaryBank || {};
  const liveBankApplicantOther = liveBank?.applicant?.otherBank || liveBank?.otherBank || {};

  const mergedBankApplicantPrimary = mergeNonEmpty(liveBankApplicantPrimary, rawBankApplicantPrimary);
  const mergedBankApplicantOther = mergeNonEmpty(liveBankApplicantOther, rawBankApplicantOther);

  const bankData = {
    applicant: {
      primaryBank: mergedBankApplicantPrimary,
      otherBank: mergedBankApplicantOther,
    },
    primaryBank: mergedBankApplicantPrimary,
    otherBank: mergedBankApplicantOther,
    coApplicants: Array.from({ length: applicantCount }, (_, i) => {
      const draftCo = rawBank.coApplicants?.[i] || {};
      const liveCo = liveBank?.coApplicants?.[i] || {};
      return {
        primaryBank: mergeNonEmpty(liveCo?.primaryBank, draftCo?.primaryBank),
        otherBank: mergeNonEmpty(liveCo?.otherBank, draftCo?.otherBank),
      };
    }),
  };
  const colData = appData.collateral || appData.sections?.collateral || appData.collateralDetails || appData.sections?.collateralDetails || {};

  const resolveCollateralList = () => {
    // 1. Live collateral from API if available
    if (Array.isArray(liveCollateral) && liveCollateral.length > 0) {
      return liveCollateral;
    }

    // 2. Extract from local / hydrated draft store
    const colSource = appData.collateral || appData.sections?.collateral || appData.collateralDetails || appData.sections?.collateralDetails || {};

    const rawList = [];

    const hasP1 =
      colSource.propertyOne &&
      (colSource.propertyOne.typeOfProperty ||
        colSource.propertyOne.propertyId ||
        colSource.propertyOne.locationAddress ||
        colSource.propertyOne.estimatedValue);
    if (hasP1) {
      rawList.push(colSource.propertyOne);
    }

    const hasP2 =
      colSource.propertyTwo &&
      (colSource.propertyTwo.typeOfProperty ||
        colSource.propertyTwo.propertyId ||
        colSource.propertyTwo.locationAddress ||
        colSource.propertyTwo.estimatedValue);
    if (hasP2) {
      rawList.push(colSource.propertyTwo);
    }

    if (Array.isArray(colSource.properties) && colSource.properties.length > 0) {
      colSource.properties.forEach((p) => rawList.push(p));
    }
    if (Array.isArray(colSource) && colSource.length > 0) {
      colSource.forEach((p) => rawList.push(p));
    }

    if (
      rawList.length === 0 &&
      (colSource.propertyType ||
        colSource.typeOfProperty ||
        colSource.propertyId ||
        colSource.locationAddress ||
        colSource.propertyAddress ||
        colSource.estimatedValue ||
        colSource.estimatedMarketValue)
    ) {
      rawList.push(colSource);
    }

    return rawList.map((item) => ({
      applicationCollateralDetailsId: item.applicationCollateralDetailsId ?? item.ApplicationCollateralDetailsId ?? null,
      typeOfProperty: item.typeOfProperty ?? item.propertyId ?? item.PropertyId ?? item.propertyType ?? item.PropertyType ?? '',
      usage: item.usage ?? item.propertyUsageId ?? item.PropertyUsageId ?? item.propertyUsage ?? item.PropertyUsage ?? '',
      locationAddress: item.locationAddress || item.LocationAddress || item.propertyAddress || item.PropertyAddress || '',
      estimatedValue: item.estimatedValue ?? item.EstimatedValue ?? item.estimatedMarketValue ?? item.EstimatedMarketValue ?? '',
      propertyName: item.propertyName ?? item.PropertyName ?? '',
      propertyUsageName: item.propertyUsageName ?? item.PropertyUsageName ?? '',
    }));
  };

  const collateralList = resolveCollateralList();
  const refData = appData.references || appData.sections?.references || {};
  const sourcingData = appData.sourcing || appData.sections?.sourcing || {};
  const chargesData = appData.scheduleCharges || appData.sections?.scheduleCharges || {};
  const declarationData = appData.declaration || appData.sections?.declaration || {};

  const ownership = useMemo(() => {
    return resolveApplicationOwnership({
      ...appData,
      ...(liveCustomer || {}),
      rmName: liveRM?.name || appData?.rmName,
      rmCode: liveRM?.employeeId || appData?.rmCode,
      agentName: liveRM?.agentName || liveCustomer?.agentName || appData?.agentName,
      agentId: liveRM?.agentId ?? liveCustomer?.agentId ?? appData?.agentId,
      createdByRole: liveCustomer?.createdByRole || appData?.createdByRole,
    });
  }, [appData, liveCustomer, liveRM]);

  // Resolved Customer Header Info
  const customerDisplayName =
    composeFullName(applicant) ||
    liveCustomer?.fullName ||
    liveCustomer?.customerName ||
    appData.customerName ||
    '';

  const resolvedApplicantName = customerDisplayName || 'Applicant';
  const resolvedApplicantDisplayId = applicationDisplayId || buildApplicationDisplayId(appData, applicationId) || applicationId || '-';

  const loanAmount = appData.loanAmount || liveCustomer?.expectedLoanAmount || '';
  const loanTenure = appData.loanTenureMonths || appData.loanTenure || '';

  // Resolved RM Info
  const resolvedRMName =
    liveRM?.name ||
    (ownership.rmName && ownership.rmName !== '—' ? ownership.rmName : '') ||
    appData.rmName ||
    '-';

  const resolvedEmployeeId =
    liveRM?.employeeId ||
    appData.rmCode ||
    (ownership.rmId ? (String(ownership.rmId).startsWith('RM') ? String(ownership.rmId) : `RM${ownership.rmId}`) : '') ||
    '-';

  // Resolved Agent / Sourcing Info
  const isAgentCreated = Boolean(ownership.isAgentCreated);
  const resolvedAgentName =
    (ownership.agentName && ownership.agentName !== '—' && ownership.agentName !== 'Direct (RM)' ? ownership.agentName : '') ||
    liveRM?.agentName ||
    liveCustomer?.agentName ||
    appData.agentName ||
    '-';

  const resolvedAgentCode =
    appData.agentCode ||
    liveCustomer?.agentCode ||
    (ownership.agentId ? (String(ownership.agentId).startsWith('AG') ? String(ownership.agentId) : `AG${ownership.agentId}`) : '') ||
    '-';

  const resolvedSourceType = isAgentCreated ? 'Field Agent' : 'RM';

  // Resolved Applicant Signature & Date (Uses real backend identity)
  const resolvedApplicantSignature = customerDisplayName || '-';

  const resolvedApplicantDate =
    (!isObsoleteMock(declarationData.applicantDate) && declarationData.applicantDate) || '-';

  // Resolved RM Signature & Date
  const resolvedRMSignature = resolvedRMName || appData.rmName || '-';

  const resolvedRMDate =
    (!isObsoleteMock(declarationData.ackDate) && declarationData.ackDate) || '-';

  const effectiveDocs = downloadedDocs;

  const applicantDocs = useMemo(() => {
    return effectiveDocs.filter((d) => {
      const seq = Number(d.applicantSequence);
      if (!isNaN(seq) && seq > 0) return false;
      const kycId = d.applicationKYCDocumentId || d.kycDocumentId;
      if (kycId && coApplicantKycIds.some((cId) => cId && String(cId) === String(kycId))) return false;
      return true;
    });
  }, [effectiveDocs, coApplicantKycIds]);

  const coApplicantDocsMap = useMemo(() => {
    const map = {};
    coApplicants.forEach((_, idx) => {
      const targetSeq = idx + 1;
      const targetKycId = coApplicantKycIds[idx];
      map[idx] = effectiveDocs.filter((d) => {
        const seq = Number(d.applicantSequence);
        if (!isNaN(seq) && seq === targetSeq) return true;
        const kycId = d.applicationKYCDocumentId || d.kycDocumentId;
        if (targetKycId && kycId && String(kycId) === String(targetKycId)) return true;
        return false;
      });
    });
    return map;
  }, [effectiveDocs, coApplicants, coApplicantKycIds]);

  // Resolve Applicant Profile Photo: Type-First & Latest Active Version (Legacy Fallback Only)
  const clientPhotoDoc = useMemo(() => {
    if (!Array.isArray(downloadedDocs) || downloadedDocs.length === 0) return {};

    const isApplicantDoc = (d) => {
      const seq = d.applicantSequence !== undefined && d.applicantSequence !== null ? Number(d.applicantSequence) : null;
      if (seq !== null && !isNaN(seq) && seq !== 0) return false;
      return true;
    };

    // 1. Primary: Official Photo records (documentTypeId === 6 or normalized documentTypeName === "photo")
    const officialPhotoDocs = downloadedDocs.filter((d) => {
      if (!d || !d.previewUrl || d.isActive === false) return false;
      if (!isApplicantDoc(d)) return false;
      const typeId = Number(d.documentTypeId);
      const typeName = String(d.documentTypeName || '').trim().toLowerCase();
      return typeId === 6 || typeName === 'photo';
    });

    if (officialPhotoDocs.length > 0) {
      // Sort by createdAt DESC, tie-break with agentCustomerDocumentId DESC
      officialPhotoDocs.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return (Number(b.agentCustomerDocumentId) || 0) - (Number(a.agentCustomerDocumentId) || 0);
      });
      return officialPhotoDocs[0];
    }

    // 2. Conservative Fallback: ONLY if type metadata is genuinely missing/unmapped
    // NEVER match against documents with another valid documentTypeId (Aadhaar=1, PAN=2, Bank=3, Salary=4, etc.)
    const KNOWN_NON_PHOTO_TYPE_IDS = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const fallbackPhotoDocs = downloadedDocs.filter((d) => {
      if (!d || !d.previewUrl || d.isActive === false) return false;
      if (!isApplicantDoc(d)) return false;
      const typeId = Number(d.documentTypeId);
      if (KNOWN_NON_PHOTO_TYPE_IDS.includes(typeId)) return false;

      const typeName = String(d.documentTypeName || '').trim().toLowerCase();
      if (
        typeName.includes('aadhaar') ||
        typeName.includes('aadhar') ||
        typeName.includes('pan') ||
        typeName.includes('bank') ||
        typeName.includes('statement') ||
        typeName.includes('salary') ||
        typeName.includes('slip')
      ) {
        return false;
      }

      const fileName = String(d.fileName || '').trim().toLowerCase();
      return (
        typeName.includes('photo') ||
        typeName.includes('profile') ||
        fileName.includes('photo') ||
        fileName.includes('profile')
      );
    });

    if (fallbackPhotoDocs.length > 0) {
      fallbackPhotoDocs.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return (Number(b.agentCustomerDocumentId) || 0) - (Number(a.agentCustomerDocumentId) || 0);
      });
      return fallbackPhotoDocs[0];
    }

    return {};
  }, [downloadedDocs]);

  const getCollectedDocumentNames = (person = {}, documents = [], isCoApplicant = false, coIndex = null) => {
    const names = [];

    const normalizeBadgeName = (raw) => {
      if (!raw || typeof raw !== 'string') return '';
      const s = raw.trim();
      if (!s) return '';

      // Strictly reject raw filenames, paths, UUIDs, or numeric IDs
      if (
        s.includes('/') ||
        s.includes('\\') ||
        /\.(png|jpg|jpeg|pdf|webp|doc|docx|zip|rar|7z)$/i.test(s) ||
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(s) ||
        /^\d+$/.test(s)
      ) {
        return '';
      }

      const lower = s.toLowerCase();
      if (
        lower === 'aadhaar' ||
        lower === 'aadhaar card' ||
        lower === 'aadhaar proof' ||
        lower === 'aadhar' ||
        lower === 'aadhar card' ||
        lower === 'aadhar proof' ||
        lower.includes('aadhaar') ||
        lower.includes('aadhar')
      ) {
        return 'Aadhaar';
      }
      if (
        lower === 'pan' ||
        lower === 'pan card' ||
        lower === 'pancard' ||
        lower === 'pan card proof' ||
        lower === 'pan proof' ||
        lower.includes('pan card') ||
        lower.includes('pancard')
      ) {
        return 'PAN Card';
      }
      if (
        lower === 'bank statement' ||
        lower === 'bank' ||
        lower === 'statement' ||
        lower.includes('bank statement')
      ) {
        return 'Bank Statement';
      }
      if (
        lower === 'salary slip' ||
        lower === 'salary' ||
        lower === 'salary slip / income sheet' ||
        lower === 'income sheet' ||
        lower.includes('salary slip') ||
        lower.includes('income sheet')
      ) {
        return 'Salary Slip';
      }
      if (
        lower === 'photo' ||
        lower === 'profile' ||
        lower === 'profile photo' ||
        lower === 'profile image' ||
        lower === 'applicant photo' ||
        lower === 'client photo' ||
        lower.includes('profile image') ||
        lower.includes('profile photo')
      ) {
        return 'Photo';
      }
      return s;
    };

    const resolveLogicalDocumentName = (docTypeId, rawDocTypeName = '') => {
      const idNum = Number(docTypeId);
      if (idNum === 1) return 'Aadhaar';
      if (idNum === 2) return 'PAN Card';
      if (idNum === 3) return 'Bank Statement';
      if (idNum === 4) return 'Salary Slip';
      if (idNum === 6) return 'Photo';

      const masterName =
        (docTypeId !== undefined &&
          docTypeId !== null &&
          masterMaps.documentTypes &&
          (masterMaps.documentTypes[docTypeId] || masterMaps.documentTypes[String(docTypeId)])) ||
        '';

      const candidate = masterName || rawDocTypeName;
      if (!candidate || typeof candidate !== 'string') return '';

      return normalizeBadgeName(candidate);
    };

    const addName = (name) => {
      const normalized = normalizeBadgeName(name);
      if (normalized && !names.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
        names.push(normalized);
      }
    };

    // 1. Aadhaar & PAN from identity fields or file paths (as existence indicators)
    if (person.aadhaarLast4 || person.aadhaarNo || person.aadharDocumentPath || person.AadharDocumentPath) {
      addName('Aadhaar');
    }
    if (person.panCardNo || person.panNumber || person.panCardPath || person.PanCardPath) {
      addName('PAN Card');
    }

    // 2. Specific identity document type
    if (person.identityDocumentType) {
      const identityDocName = resolveLogicalDocumentName(person.identityDocumentType);
      if (identityDocName) addName(identityDocName);
    }

    // 3. Profile Photo verification
    if (!isCoApplicant) {
      if (applicantPhotoUrl || clientPhotoDoc?.previewUrl || person.profileImagePath || person.ProfileImagePath) {
        addName('Photo');
      }
    } else {
      const targetKycId = coIndex !== null ? coApplicantKycIds[coIndex] : null;
      const hasCoPhoto = Boolean(
        (coIndex !== null && (coApplicantPhotos[coIndex] || coApplicantPhotos[String(coIndex)])) ||
        (targetKycId && (coApplicantPhotos[targetKycId] || coApplicantPhotos[String(targetKycId)])) ||
        person.profileImagePath ||
        person.ProfileImagePath
      );
      if (hasCoPhoto) {
        addName('Photo');
      }
    }

    // 4. Downloaded / Uploaded documents from AgentCustomerDocument
    documents.forEach((document) => {
      const logicalName = resolveLogicalDocumentName(document.documentTypeId, document.documentTypeName);
      if (logicalName) {
        addName(logicalName);
      }
    });

    // 5. Backend ApplicationKYCDocuments matching this person
    const targetSeq = isCoApplicant ? (coIndex !== null ? coIndex + 1 : 1) : 0;
    const targetKycId = isCoApplicant && coIndex !== null ? coApplicantKycIds[coIndex] : null;

    liveAllKycRecords.forEach((k) => {
      const seq = Number(k.applicantSequence);
      const kycId = k.applicationKYCDocumentId || k.ApplicationKYCDocumentId || k.kycDocumentId || k.id;
      let matches = false;

      if (!isCoApplicant) {
        // Applicant: sequence is 0 or null, not in coApplicantKycIds
        if ((isNaN(seq) || seq === 0) && (!kycId || !coApplicantKycIds.some((cId) => cId && String(cId) === String(kycId)))) {
          matches = true;
        }
      } else {
        // Co-Applicant: sequence matches targetSeq OR kycId matches targetKycId
        if ((!isNaN(seq) && seq === targetSeq) || (targetKycId && kycId && String(kycId) === String(targetKycId))) {
          matches = true;
        }
      }

      if (matches) {
        if (k.documentTypeId) {
          const typeName = resolveLogicalDocumentName(k.documentTypeId, k.documentTypeName);
          if (typeName) addName(typeName);
        } else if (k.documentTypeName) {
          const typeName = normalizeBadgeName(k.documentTypeName);
          if (typeName) addName(typeName);
        }
        if (k.aadharDocumentPath || k.AadharDocumentPath) addName('Aadhaar');
        if (k.panCardPath || k.PanCardPath) addName('PAN Card');
        if (k.profileImagePath || k.ProfileImagePath) addName('Photo');
      }
    });

    return names;
  };

  const documentPeople = [
    {
      label: 'Applicant',
      isCoApplicant: false,
      coIndex: null,
      kyc: kycData.applicant || {},
      documents: applicantDocs,
    },
    ...(hasCoApplicants
      ? coApplicants.map((_, index) => ({
          label: `Co-Applicant ${index + 1}`,
          isCoApplicant: true,
          coIndex: index,
          kyc: kycData.coApplicants?.[index] || {},
          documents: coApplicantDocsMap[index] || [],
        }))
      : []),
  ];

  const handleBack = () => {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
      return;
    }
    if (location.state?.closeTo) {
      navigate(location.state.closeTo);
      return;
    }
    if (location.state?.backTo) {
      navigate(location.state.backTo);
      return;
    }

    if (location.pathname.startsWith('/backoffice')) {
      const targetCustomerId = params.customerId || params.applicationId || applicationId || location.state?.customerId;
      navigate(`/backoffice/customers/${targetCustomerId}/verify`);
      return;
    }

    navigate(ROUTES.SUBMISSION_HISTORY);
  };

  return (
    <div className="pdf-view-wrapper">
      <ErrorPopup
        show={!!errorPopup}
        title={errorPopup?.title}
        message={errorPopup?.message}
        details={errorPopup?.details}
        variant={errorPopup?.variant}
        onClose={() => setErrorPopup(null)}
      />
      <div className="pdf-controls">
        <Button
          variant="secondary"
          onClick={handleBack}
        >
          Back to Application
        </Button>
        <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf || !isPdfMediaReady}>
          {isGeneratingPdf
            ? 'Generating PDF...'
            : !isPdfMediaReady
            ? 'Preparing documents...'
            : 'Download PDF'}
        </Button>
        <Button
          variant="secondary"
          onClick={handleSharePdf}
          disabled={isGeneratingPdf || !isPdfMediaReady}
        >
          Share
        </Button>
      </div>

      <div className="pdf-container" ref={pdfRef}>
        {/* ===================================================================
            CONTINUOUS SINGLE LONG PAGE LOAN APPLICATION FORM
        ==================================================================== */}
        <div className="pdf-page-continuous">
          {/* TOP SUMMARY */}
          <div className="pdf-top-summary">
            {/* Block 1: Logo */}
            <div className="pdf-summary-block pdf-summary-logo-block">
              <img src={LogoImage} alt="Sivels Finance Logo" />
            </div>

            {/* Block 2: Applicant */}
            <div className="pdf-summary-block">
              <div className="pdf-summary-label">APPLICANT</div>
              <div className="pdf-summary-name" title={resolvedApplicantName}>
                {resolvedApplicantName}
              </div>
              <div className="pdf-summary-id" title={`ID: ${resolvedApplicantDisplayId}`}>
                ID: {resolvedApplicantDisplayId}
              </div>
            </div>

            {/* Block 3: RM */}
            <div className="pdf-summary-block">
              <div className="pdf-summary-label">RM</div>
              <div className="pdf-summary-name" title={resolvedRMName}>
                {resolvedRMName}
              </div>
              <div className="pdf-summary-id" title={`ID: ${resolvedEmployeeId}`}>
                ID: {resolvedEmployeeId}
              </div>
            </div>

            {/* Block 4: Agent / Source */}
            <div className="pdf-summary-block">
              {isAgentCreated ? (
                <>
                  <div className="pdf-summary-label">AGENT</div>
                  <div className="pdf-summary-name" title={resolvedAgentName}>
                    {resolvedAgentName}
                  </div>
                  <div className="pdf-summary-id" title={`ID: ${resolvedAgentCode}`}>
                    ID: {resolvedAgentCode}
                  </div>
                </>
              ) : (
                <>
                  <div className="pdf-summary-label">SOURCE</div>
                  <div className="pdf-summary-name" title="Direct (RM)">
                    Direct (RM)
                  </div>
                </>
              )}
            </div>
          </div>

          {/* STEP 1: OFFICE USE & APPLICATION DETAILS */}
          <div className="pdf-section-title">OFFICE USE & APPLICATION DETAILS</div>
          <div className="pdf-office-use">
            <div className="pdf-office-left">
              <div className="pdf-office-row">
                <span className="pdf-office-label">Source Type:</span>
                <div className="pdf-office-value">{resolvedSourceType}</div>
              </div>
              <div className="pdf-office-row">
                <span className="pdf-office-label">Loan Product:</span>
                <div className="pdf-office-value">
                  {resolveLoanProduct(appData.loanProduct)}
                  {resolveLoanVariation(appData.loanVariation) ? ` - ${resolveLoanVariation(appData.loanVariation)}` : ''}
                </div>
              </div>
              <div className="pdf-office-row">
                <span className="pdf-office-label">Purpose of Loan:</span>
                <div className="pdf-office-value">
                  {resolveLoanPurpose(appData.purposeOfLoan || appData.loanType || liveCustomer?.loanPurposeName)}
                </div>
              </div>
              <div className="pdf-office-row">
                <span className="pdf-office-label">Loan Amount:</span>
                <div className="pdf-office-value">
                  {loanAmount ? (String(loanAmount).startsWith('Rs.') ? loanAmount : `Rs. ${isNaN(Number(String(loanAmount).replace(/,/g, ''))) ? loanAmount : Number(String(loanAmount).replace(/,/g, '')).toLocaleString('en-IN')}`) : '-'}
                </div>
              </div>
              <div className="pdf-office-row">
                <span className="pdf-office-label">Tenure:</span>
                <div className="pdf-office-value">
                  {loanTenure ? (String(loanTenure).toLowerCase().includes('month') ? loanTenure : `${loanTenure} Months`) : '-'}
                </div>
              </div>
            </div>

            <div className="pdf-office-photos">
              <div className="pdf-photo-column">
                <div className="pdf-photo-box">
                  {applicantPhotoUrl || clientPhotoDoc?.previewUrl ? (
                    <img
                      src={applicantPhotoUrl || clientPhotoDoc.previewUrl}
                      alt="Applicant"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '10px', padding: '6px', textAlign: 'center' }}>
                      No Photo
                    </div>
                  )}
                  <div className="pdf-photo-timestamp">Applicant</div>
                </div>
                <div className="pdf-geo-details">
                  Lat: 13.0827, Long: 80.2707
                  <br />
                  {formatDateTime(new Date())}
                </div>
              </div>

              {hasCoApplicants &&
                coApplicants.map((_, i) => {
                  const kycId = coApplicantKycIds[i];
                  const coPhotoUrl =
                    (kycId ? (coApplicantPhotos[kycId] || coApplicantPhotos[String(kycId)]) : null) ||
                    coApplicantPhotos[i] ||
                    coApplicantPhotos[String(i)] ||
                    null;
                  return (
                    <div className="pdf-photo-column" key={i}>
                      <div className="pdf-photo-box">
                        {coPhotoUrl ? (
                          <img
                            src={coPhotoUrl}
                            alt={`Co-Applicant ${i + 1}`}
                            style={{ objectFit: 'contain' }}
                          />
                        ) : (
                          <div style={{ color: '#64748b', fontSize: '10px', padding: '6px', textAlign: 'center' }}>
                            No Photo
                          </div>
                        )}
                        <div className="pdf-photo-timestamp">Co-Applicant {i + 1}</div>
                      </div>
                      <div className="pdf-geo-details">
                        Lat: 13.0827, Long: 80.2707
                        <br />
                        {formatDateTime(new Date())}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* STEP 3: PERSONAL INFORMATION */}
          <div className="pdf-section-title">PERSONAL INFORMATION</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Field</th>
                <th>Applicant</th>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <th key={i}>Co-Applicant {i + 1}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Title</td>
                <td>{resolveTitle(applicant.title) || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{resolveTitle(co.title) || '-'}</td>)}
              </tr>
              <tr>
                <td>First Name</td>
                <td>{applicant.firstName || customerDisplayName}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.firstName || '-'}</td>)}
              </tr>
              <tr>
                <td>Middle Name</td>
                <td>{applicant.middleName || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.middleName || '-'}</td>)}
              </tr>
              <tr>
                <td>Last Name</td>
                <td>{applicant.lastName || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.lastName || '-'}</td>)}
              </tr>
              <tr>
                <td>Father/Spouse Name</td>
                <td>{applicant.fatherOrSpouseName || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.fatherOrSpouseName || '-'}</td>)}
              </tr>
              <tr>
                <td>Mother's Maiden Name</td>
                <td>{applicant.mothersMaidenName || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.mothersMaidenName || '-'}</td>)}
              </tr>
              <tr>
                <td>Date of Birth</td>
                <td>{applicant.dateOfBirth || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.dateOfBirth || '-'}</td>)}
              </tr>
              <tr>
                <td>Gender</td>
                <td>{resolveGender(applicant.gender) || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{resolveGender(co.gender) || '-'}</td>)}
              </tr>
              <tr>
                <td>Marital Status</td>
                <td>{resolveMaritalStatus(applicant.maritalStatus) || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((co, i) => <td key={i}>{resolveMaritalStatus(co.maritalStatus) || '-'}</td>)}
              </tr>
              <tr>
                <td>Category</td>
                <td>{resolveCategory(applicant.category) || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{resolveCategory(co.category) || '-'}</td>)}
              </tr>
              <tr>
                <td>Religion</td>
                <td>{resolveReligion(applicant.religion) || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{resolveReligion(co.religion) || '-'}</td>)}
              </tr>
              <tr>
                <td>Mobile No</td>
                <td>{applicant.mobileNo || liveCustomer?.mobileNumber || appData.mobile || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.mobileNo || '-'}</td>)}
              </tr>
              <tr>
                <td>Email ID</td>
                <td>{applicant.emailId || appData.email || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.emailId || '-'}</td>)}
              </tr>
              <tr>
                <td>Relationship with Applicant</td>
                <td>SELF</td>
                {hasCoApplicants &&
                  coApplicants.map((co, i) => (
                    <td key={i}>{resolveRelationship(co.relationshipWithApplicant) || '-'}</td>
                  ))}
              </tr>
            </tbody>
          </table>

          {/* STEP 2: KYC DOCUMENTS & VERIFICATION */}
          <div className="pdf-section-title">KYC DOCUMENTS & VERIFICATION</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Document</th>
                <th>Applicant</th>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <th key={i}>Co-Applicant {i + 1}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Aadhaar Last 4</td>
                <td>{kycData.applicant?.aadhaarLast4 || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => <td key={i}>{kycData.coApplicants?.[i]?.aadhaarLast4 || '-'}</td>)}
              </tr>
              <tr>
                <td>PAN Card No</td>
                <td>{kycData.applicant?.panCardNo || applicant.panCardNo || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((co, i) => (
                    <td key={i}>{kycData.coApplicants?.[i]?.panCardNo || co.panCardNo || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Identity Doc Type</td>
                <td>{resolveDocType(kycData.applicant?.identityDocumentType) || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{resolveDocType(kycData.coApplicants?.[i]?.identityDocumentType) || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Identity Doc No</td>
                <td>{kycData.applicant?.identityDocumentNo || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{kycData.coApplicants?.[i]?.identityDocumentNo || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Verification Status</td>
                <td>{resolveVerification(kycData.applicant?.verificationStatus) || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{resolveVerification(kycData.coApplicants?.[i]?.verificationStatus) || 'Pending'}</td>
                  ))}
              </tr>
            </tbody>
          </table>

          {/* DYNAMIC UPLOADED KYC DOCUMENT NAMES */}
          <div className="pdf-section-title">KYC DOCUMENTS</div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginTop: '10px',
              marginBottom: '14px',
            }}
          >
            {documentPeople.map((person) => {
              const documentNames = getCollectedDocumentNames(person.kyc, person.documents, person.isCoApplicant, person.coIndex);

              return (
                <div
                  key={person.label}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '11px', color: '#0f172a', marginBottom: '6px' }}>
                    {person.label}
                  </div>
                  {documentNames.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                      {documentNames.map((name) => (
                        <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#334155' }}>
                          <span aria-hidden="true" style={{ color: '#0F7A4C', fontWeight: '700', fontSize: '13px', lineHeight: 1 }}>✓</span>
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '10px', color: '#64748b' }}>No KYC documents collected</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* STEP 4: ADDRESS DETAILS */}
          <div className="pdf-section-title">ADDRESS DETAILS</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Current Address</th>
                <th>Applicant</th>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <th key={i}>Co-Applicant {i + 1}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Address Line 1</td>
                <td>
                  {addressData.applicant?.current?.addressLine1 ||
                    addressData.applicant?.addressLine1 ||
                    '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {addressData.coApplicants?.[i]?.current?.addressLine1 ||
                        addressData.coApplicants?.[i]?.addressLine1 ||
                        '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Address Line 2</td>
                <td>
                  {addressData.applicant?.current?.addressLine2 ||
                    addressData.applicant?.addressLine2 ||
                    '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {addressData.coApplicants?.[i]?.current?.addressLine2 ||
                        addressData.coApplicants?.[i]?.addressLine2 ||
                        '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Landmark</td>
                <td>
                  {addressData.applicant?.current?.landmark || addressData.applicant?.landmark || '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {addressData.coApplicants?.[i]?.current?.landmark ||
                        addressData.coApplicants?.[i]?.landmark ||
                        '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>City & State</td>
                <td>
                  {[
                    resolveCity(addressData.applicant?.current?.city || addressData.applicant?.city),
                    resolveState(addressData.applicant?.current?.state || addressData.applicant?.state),
                  ]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {[
                        resolveCity(addressData.coApplicants?.[i]?.current?.city || addressData.coApplicants?.[i]?.city),
                        resolveState(addressData.coApplicants?.[i]?.current?.state || addressData.coApplicants?.[i]?.state),
                      ]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Pincode</td>
                <td>
                  {addressData.applicant?.current?.pincode ||
                    addressData.applicant?.pincode ||
                    addressData.applicant?.current?.postalCode ||
                    addressData.applicant?.postalCode ||
                    addressData.applicant?.current?.Pincode ||
                    addressData.applicant?.Pincode ||
                    '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {addressData.coApplicants?.[i]?.current?.pincode ||
                        addressData.coApplicants?.[i]?.pincode ||
                        addressData.coApplicants?.[i]?.current?.postalCode ||
                        addressData.coApplicants?.[i]?.postalCode ||
                        addressData.coApplicants?.[i]?.current?.Pincode ||
                        addressData.coApplicants?.[i]?.Pincode ||
                        '-'}
                    </td>
                  ))}
              </tr>
            </tbody>
          </table>

          {/* STEP 5: EMPLOYMENT & INCOME DETAILS */}
          <div className="pdf-section-title">EMPLOYMENT & INCOME DETAILS</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Employment Info</th>
                <th>Applicant</th>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <th key={i}>Co-Applicant {i + 1}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Occupation Category</td>
                <td>
                  {resolveEmploymentType(empData.applicant?.employmentNature || empData.applicant?.employmentType || empData.applicant?.employmentTypeId) || empData.applicant?.employmentNature || empData.applicant?.employmentType || '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {resolveEmploymentType(empData.coApplicants?.[i]?.employmentNature || empData.coApplicants?.[i]?.employmentType || empData.coApplicants?.[i]?.employmentTypeId) || empData.coApplicants?.[i]?.employmentNature || empData.coApplicants?.[i]?.employmentType || '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Employer Name</td>
                <td>{empData.applicant?.employerBusinessName || empData.applicant?.employerName || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{empData.coApplicants?.[i]?.employerBusinessName || empData.coApplicants?.[i]?.employerName || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Designation</td>
                <td>{empData.applicant?.designationNatureOfBusiness || empData.applicant?.designation || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{empData.coApplicants?.[i]?.designationNatureOfBusiness || empData.coApplicants?.[i]?.designation || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Qualification</td>
                <td>
                  {resolveEducation(empData.applicant?.qualification || empData.applicant?.educationId) || empData.applicant?.qualification || '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {resolveEducation(empData.coApplicants?.[i]?.qualification || empData.coApplicants?.[i]?.educationId) || empData.coApplicants?.[i]?.qualification || '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Industry Type</td>
                <td>{resolveIndustryType(empData.applicant?.industryType)}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => <td key={i}>{resolveIndustryType(empData.coApplicants?.[i]?.industryType)}</td>)}
              </tr>
              <tr>
                <td>Total Experience</td>
                <td>{formatExperience(empData.applicant?.totalExperienceYears ?? empData.applicant?.totalExperience)}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {formatExperience(empData.coApplicants?.[i]?.totalExperienceYears ?? empData.coApplicants?.[i]?.totalExperience)}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Gross Monthly Income</td>
                <td>{formatCurrencyOrDash(empData.applicant?.grossMonthlyIncome)}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {formatCurrencyOrDash(empData.coApplicants?.[i]?.grossMonthlyIncome)}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Other Monthly Income</td>
                <td>{formatCurrencyOrDash(empData.applicant?.otherIncomeMonthly ?? empData.applicant?.otherMonthlyIncome)}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {formatCurrencyOrDash(empData.coApplicants?.[i]?.otherIncomeMonthly ?? empData.coApplicants?.[i]?.otherMonthlyIncome)}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Net Monthly Income</td>
                <td>{formatCurrencyOrDash(empData.applicant?.netMonthlyIncome)}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {formatCurrencyOrDash(empData.coApplicants?.[i]?.netMonthlyIncome)}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Gross Annual Income</td>
                <td>{formatCurrencyOrDash(empData.applicant?.grossAnnualIncome)}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {formatCurrencyOrDash(empData.coApplicants?.[i]?.grossAnnualIncome)}
                    </td>
                  ))}
              </tr>
            </tbody>
          </table>

          {/* STEP 6: BANK & EXISTING LOAN DETAILS */}
          <div className="pdf-section-title">BANK & EXISTING LOAN DETAILS</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Applicant Type</th>
                <th style={{ width: '22%' }}>Bank Name</th>
                <th style={{ width: '24%' }}>Account Holder</th>
                <th style={{ width: '22%' }}>Account No</th>
                <th style={{ width: '14%' }}>Active Loans</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Applicant</td>
                <td>
                  {resolveBank(bankData.applicant?.primaryBank?.bankName || bankData.applicant?.primaryBank?.bankId || bankData.primaryBank?.bankName || bankData.primaryBank?.bankId) ||
                    bankData.applicant?.primaryBank?.bankName ||
                    bankData.applicant?.primaryBank?.bankId ||
                    bankData.primaryBank?.bankName ||
                    bankData.primaryBank?.bankId ||
                    '-'}
                </td>
                <td>{bankData.applicant?.primaryBank?.accountHolderName || bankData.primaryBank?.accountHolderName || customerDisplayName || '-'}</td>
                <td>
                  {bankData.applicant?.primaryBank?.accountNumber ||
                    bankData.primaryBank?.accountNumber ||
                    '-'}
                </td>
                <td>
                  {bankData.applicant?.primaryBank?.noOfActiveLoans !== undefined && bankData.applicant?.primaryBank?.noOfActiveLoans !== ''
                    ? String(bankData.applicant.primaryBank.noOfActiveLoans)
                    : (bankData.primaryBank?.noOfActiveLoans !== undefined && bankData.primaryBank?.noOfActiveLoans !== ''
                      ? String(bankData.primaryBank.noOfActiveLoans)
                      : (bankData.applicant?.existingLoans?.[0]?.totalExistingEmi
                        ? String(bankData.applicant.existingLoans[0].totalExistingEmi)
                        : '0'))}
                </td>
              </tr>
              {hasCoApplicants &&
                coApplicants.map((co, i) => (
                  <tr key={i}>
                    <td>Co-Applicant {i + 1}</td>
                    <td>
                      {resolveBank(bankData.coApplicants?.[i]?.primaryBank?.bankName || bankData.coApplicants?.[i]?.primaryBank?.bankId) ||
                        bankData.coApplicants?.[i]?.primaryBank?.bankName ||
                        bankData.coApplicants?.[i]?.primaryBank?.bankId ||
                        '-'}
                    </td>
                    <td>
                      {bankData.coApplicants?.[i]?.primaryBank?.accountHolderName ||
                        composeFullName(co) ||
                        '-'}
                    </td>
                    <td>
                      {bankData.coApplicants?.[i]?.primaryBank?.accountNumber ||
                        '-'}
                    </td>
                    <td>
                      {bankData.coApplicants?.[i]?.primaryBank?.noOfActiveLoans !== undefined && bankData.coApplicants?.[i]?.primaryBank?.noOfActiveLoans !== ''
                        ? String(bankData.coApplicants[i].primaryBank.noOfActiveLoans)
                        : bankData.coApplicants?.[i]?.existingLoans?.[0]?.totalExistingEmi
                        ? String(bankData.coApplicants[i].existingLoans[0].totalExistingEmi)
                        : '-'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* STEP 7: COLLATERAL DETAILS */}
          <div className="pdf-section-title">COLLATERAL DETAILS</div>
          {collateralList.length > 1 ? (
            <table className="pdf-table">
              <thead>
                <tr>
                  <th className="pdf-row-header">Field</th>
                  {collateralList.map((_, i) => (
                    <th key={i}>Property {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="pdf-row-header">Property Type</td>
                  {collateralList.map((prop, i) => (
                    <td key={i}>
                      {resolveProperty(prop.typeOfProperty) || prop.propertyName || prop.typeOfProperty || '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="pdf-row-header">Property Address</td>
                  {collateralList.map((prop, i) => (
                    <td key={i}>{prop.locationAddress || '-'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="pdf-row-header">Estimated Market Value</td>
                  {collateralList.map((prop, i) => (
                    <td key={i}>{formatCurrencyOrDash(prop.estimatedValue)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="pdf-row-header">Property Usage</td>
                  {collateralList.map((prop, i) => (
                    <td key={i}>
                      {resolvePropertyUsage(prop.usage) || prop.propertyUsageName || prop.usage || '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="pdf-table">
              <tbody>
                <tr>
                  <td className="pdf-row-header">Property Type</td>
                  <td>
                    {resolveProperty(collateralList[0]?.typeOfProperty) ||
                      collateralList[0]?.propertyName ||
                      collateralList[0]?.typeOfProperty ||
                      '-'}
                  </td>
                </tr>
                <tr>
                  <td className="pdf-row-header">Property Address</td>
                  <td>{collateralList[0]?.locationAddress || '-'}</td>
                </tr>
                <tr>
                  <td className="pdf-row-header">Estimated Market Value</td>
                  <td>{formatCurrencyOrDash(collateralList[0]?.estimatedValue)}</td>
                </tr>
                <tr>
                  <td className="pdf-row-header">Property Usage</td>
                  <td>
                    {resolvePropertyUsage(collateralList[0]?.usage) ||
                      collateralList[0]?.propertyUsageName ||
                      collateralList[0]?.usage ||
                      '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* STEP 8: REFERENCE DETAILS */}
          <div className="pdf-section-title">REFERENCE DETAILS</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th>Reference #</th>
                <th>Full Name</th>
                <th>Relationship</th>
                <th>Mobile No</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {[
                refData.reference1 || (Array.isArray(refData.references) ? refData.references[0] : null),
                refData.reference2 || (Array.isArray(refData.references) ? refData.references[1] : null),
              ]
                .filter(Boolean)
                .map((ref, i) => (
                  <tr key={i}>
                    <td>Reference {i + 1}</td>
                    <td>{ref.fullName || '-'}</td>
                    <td>{resolveRelationship(ref.relationship) || ref.relationship || '-'}</td>
                    <td>{ref.mobileNo || '-'}</td>
                    <td>{ref.address || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* STEP 9 & 10: SOURCING & CHARGES */}
          <div className="pdf-section-title">SOURCING & CHARGES</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-row-header" style={{ width: '25%' }}>Admin Fee Status</td>
                <td>{chargesData.adminFeePaid ? 'Paid' : 'Pending / Not Applicable'}</td>
              </tr>
            </tbody>
          </table>

          {/* STEP 11: FIELD VERIFICATION */}
          <div className="pdf-section-title">FIELD VERIFICATION</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-row-header">FI Status</td>
                <td>{appData.sections?.fieldVerification?.status || '-'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">FI Remarks</td>
                <td>
                  {appData.sections?.fieldVerification?.remarks || '-'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* STEP 12: DECLARATION */}
          <div className="pdf-section-title" style={{ marginTop: '14px' }}>
            12. DECLARATION
          </div>
          <p className="pdf-text-small pdf-text-justify" style={{ margin: '6px 0 12px 0' }}>
            I/We declare that the information given in this application is true, correct and complete to the best of
            my/our knowledge. I/We authorise Sivels Finance (a unit of Sivels Holding Pvt Ltd) and its representatives
            to verify the details furnished, obtain credit bureau reports, and process my/our personal data for
            evaluation, sanction and servicing of this loan, in accordance with applicable law. I/We understand that
            the Admin Fee is non-refundable, and that submission of this form does not guarantee sanction of the loan
            applied for.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginTop: '12px',
              marginBottom: '10px',
              padding: '12px 18px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
            }}
          >
            <div>
              <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '11px' }}>Applicant Signature:</div>
              <div style={{ fontSize: '13px', color: '#0F7A4C', fontWeight: '700' }}>
                {resolvedApplicantSignature}
              </div>
              <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '3px' }}>
                Date: {resolvedApplicantDate}
              </div>
            </div>

            {hasCoApplicants &&
              coApplicants.map((co, i) => {
                const coFullName =
                  composeFullName(co) ||
                  co.firstName ||
                  (co.lastName ? `${co.lastName}` : '') ||
                  '-';
                const coSig = coFullName;
                const coDate =
                  (!isObsoleteMock(declarationData.coApplicants?.[i]?.date) && declarationData.coApplicants?.[i]?.date) ||
                  (i === 0 && !isObsoleteMock(declarationData.coApplicantDate) && declarationData.coApplicantDate) ||
                  '-';
                return (
                  <div key={i}>
                    <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '11px' }}>
                      Co-Applicant {i + 1} Signature:
                    </div>
                    <div style={{ fontSize: '13px', color: '#0F7A4C', fontWeight: '700' }}>
                      {coSig}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '3px' }}>
                      Date: {coDate}
                    </div>
                  </div>
                );
              })}

            <div>
              <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '11px' }}>Received By (RM Sign):</div>
              <div style={{ fontSize: '13px', color: '#0F7A4C', fontWeight: '700' }}>
                {resolvedRMSignature}
              </div>
              <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '3px' }}>
                Date: {resolvedRMDate}
              </div>
            </div>
          </div>

          {/* CUSTOMER SUPPORT */}
          <div className="pdf-section-title" style={{ marginTop: '14px' }}>
            CUSTOMER SUPPORT
          </div>
          <div
            style={{
              padding: '10px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              textAlign: 'center',
            }}
          >
            <div style={{ fontWeight: '700', fontSize: '11px', color: '#1e293b' }}>
              For assistance, please contact Customer Support
            </div>
            <div style={{ marginTop: '4px', fontSize: '13px', color: '#0F7A4C', fontWeight: '700' }}>
              1800-123-4567
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
