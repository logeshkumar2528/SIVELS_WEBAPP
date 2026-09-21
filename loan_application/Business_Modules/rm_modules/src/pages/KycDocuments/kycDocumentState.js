export function documentPaths(value) {
  return [...new Set(String(value || '').split(',').map((path) => path.trim()).filter(Boolean))];
}

export function manualDocumentPath(value) {
  const paths = documentPaths(value);
  return paths.length ? paths.join(',') : null;
}

export function isApplicantDocumentTuple(row) {
  if (!row) return false;
  if (['aadharDocumentPath', 'AadharDocumentPath', 'panCardPath', 'PanCardPath',
    'profileImagePath', 'ProfileImagePath', 'aadhaarLastFourDigits', 'AadhaarLastFourDigits',
    'panCardNo', 'PANCardNo', 'documentNumber', 'DocumentNumber'].some((field) => row[field])) return false;
  // A manual upload also sets fileSize on the primary KYC row. Size alone
  // must never turn that row into a financial document and hide its identity files.
  return ['documentStatus', 'DocumentStatus', 'originalFileName', 'OriginalFileName',
    'contentType', 'ContentType'].some((field) => String(row[field] || '').trim());
}

export function syncManualDocuments(person, files = person?.identityDocumentRawFiles || []) {
  const numDocs = person?.numberOfDocuments !== undefined && person?.numberOfDocuments !== null
    ? Math.max(0, Number(person.numberOfDocuments) || 0)
    : 0;
  const paths = documentPaths(person?.documentPath);
  const rawList = Array.isArray(files) ? files : [];
  const names = [];
  for (let i = 0; i < numDocs; i++) {
    const raw = rawList[i];
    if (raw && typeof File !== 'undefined' && raw instanceof File) {
      names.push(raw.name);
    } else if (paths[i]) {
      names.push(paths[i].replace(/\\/g, '/').split('/').pop());
    }
  }

  return {
    ...person,
    numberOfDocuments: numDocs,
    documentPath: paths.length ? paths.join(',') : null,
    identityDocumentRawFiles: rawList.slice(0, numDocs),
    identityDocumentFiles: names,
    manualDocuments: names.join(', '),
    identityDocumentCount: String(numDocs),
  };
}

export function replaceManualDocument(person, file) {
  return syncManualDocuments(person, file ? [file] : []);
}

export function mapKycPerson(row, draft = {}) {
  if (!row) return syncManualDocuments(draft);
  const read = (camel, pascal) => row[camel] ?? row[pascal];
  const docPath = read('documentPath', 'DocumentPath');
  const rawNumDocs = read('numberOfDocuments', 'NumberOfDocuments');
  const parsedNum = rawNumDocs !== undefined && rawNumDocs !== null
    ? Math.max(0, Number(rawNumDocs) || 0)
    : (draft.numberOfDocuments !== undefined && draft.numberOfDocuments !== null
        ? Math.max(0, Number(draft.numberOfDocuments) || 0)
        : documentPaths(docPath).length);

  return syncManualDocuments({
    ...draft,
    kycDocumentId: read('applicationKYCDocumentId', 'ApplicationKYCDocumentId'),
    applicationKYCDocumentId: read('applicationKYCDocumentId', 'ApplicationKYCDocumentId'),
    numberOfDocuments: parsedNum,
    aadhaarLast4: read('aadhaarLastFourDigits', 'AadhaarLastFourDigits') ?? draft.aadhaarLast4 ?? '',
    panCardNo: read('panCardNo', 'PANCardNo') ?? draft.panCardNo ?? '',
    identityDocumentType: read('documentTypeId', 'DocumentTypeId') ?? draft.identityDocumentType ?? '',
    identityDocumentNo: read('documentNumber', 'DocumentNumber') ?? draft.identityDocumentNo ?? '',
    verificationStatus: String(read('verificationId', 'VerificationId') ?? read('verificationStatus', 'VerificationStatus') ?? draft.verificationStatus ?? 'Pending'),
    documentPath: docPath ?? null,
    aadharDocumentPath: read('aadharDocumentPath', 'AadharDocumentPath') ?? null,
    panCardPath: read('panCardPath', 'PanCardPath') ?? null,
    profileImagePath: read('profileImagePath', 'ProfileImagePath') ?? null,
    fileSize: read('fileSize', 'FileSize') ?? null,
  });
}

export function primaryKycForSequence(rows, sequence, productId) {
  const matches = rows.filter((row) => row && row.isActive !== false && row.IsActive !== false
    && !isApplicantDocumentTuple(row)
    && (row.applicantSequence ?? row.ApplicantSequence) != null
    && Number(row.applicantSequence ?? row.ApplicantSequence) === sequence
    && (!productId || Number(row.applicationProductDetailsId ?? row.ApplicationProductDetailsId) === Number(productId)));
  return matches.length === 1 ? matches[0] : null;
}

export const KYC_CATEGORIES = [
  { key: 'profile', code: 'PROFILE_IMAGE', name: 'Profile Image', fields: ['profileImagePath', 'ProfileImagePath'] },
  { key: 'aadhaar', code: 'AADHAAR', name: 'Aadhaar Card', fields: ['aadharDocumentPath', 'AadharDocumentPath'] },
  { key: 'pan', code: 'PAN', name: 'PAN Card', fields: ['panCardPath', 'PanCardPath'] },
  { key: 'salarySlip', code: 'SALARY_SLIP', name: 'Salary Slip' },
  { key: 'bankStatement', code: 'BANK_STATEMENT', name: 'Bank Statement' },
];

export function updateApplicantSlot(state, index, key, value) {
  return { ...state, [index]: { ...(state[index] || {}), [key]: value } };
}

export function documentHistoryKey(doc) {
  if (doc.documentTypeCode === 'APPLICANT_MANUAL') return `manual:${doc.filePath || doc.id}`;
  return doc.documentTypeId ? String(doc.documentTypeId) : String(doc.documentTypeName || 'other').trim().toLowerCase();
}

export function clearUploadedSlot(state, index, key, uploadedFile) {
  // A completed request must not clear a newer selection made for the same slot.
  return state[index]?.[key] === uploadedFile ? updateApplicantSlot(state, index, key, null) : state;
}

export function slotReference(path, metadata = {}) {
  if (!path) return null;
  return {
    exists: true, documentPath: path, path,
    fileName: metadata.originalFileName || metadata.OriginalFileName || metadata.fileName
      || String(path).replace(/\\/g, '/').split('/').pop(),
    mimeType: metadata.contentType || metadata.ContentType || metadata.mimeType || '',
    size: metadata.fileSize ?? metadata.FileSize ?? metadata.size ?? null,
    blobUrl: null,
  };
}

export function primaryDocumentPaths(row) {
  return {
    documentPath: row.documentPath ?? row.DocumentPath ?? null,
    aadharDocumentPath: row.aadharDocumentPath ?? row.AadharDocumentPath ?? null,
    panCardPath: row.panCardPath ?? row.PanCardPath ?? null,
    profileImagePath: row.profileImagePath ?? row.ProfileImagePath ?? null,
  };
}

// Identity endpoints may replace the complete row. Retain every unrelated path,
// and verify the row before treating the target slot as saved.
export async function persistIdentitySlot({ key, file, read, upload, save }) {
  const category = KYC_CATEGORIES.find((item) => item.key === key && item.fields);
  if (!category) throw new Error('Unknown identity document slot');
  const before = primaryDocumentPaths(await read());
  const body = new FormData();
  body.append('file', file, file.name);
  await upload(body, Boolean(before[category.fields[0]]));
  const after = primaryDocumentPaths(await read());
  const targetPath = after[category.fields[0]];
  if (!targetPath) throw new Error(`The server did not save the ${category.name} reference. Please retry.`);
  const expected = { ...before, [category.fields[0]]: targetPath };
  if (Object.keys(expected).some((field) => expected[field] !== after[field])) {
    await save(expected);
    const confirmed = primaryDocumentPaths(await read());
    if (Object.keys(expected).some((field) => expected[field] !== confirmed[field])) {
      throw new Error('The server did not retain all co-applicant documents. Please retry.');
    }
  }
  return { paths: expected, reference: slotReference(targetPath, { fileName: file.name, mimeType: file.type, size: file.size }) };
}

export function overlayPendingDocuments(documents, slots, manualFiles, createPreview) {
  let result = [...documents];
  for (const category of KYC_CATEGORIES) {
    const file = slots[category.key];
    if (!(file instanceof File)) continue;
    const code = `CO_APPLICANT_${category.key === 'profile' ? 'PROFILE' : category.code}`;
    const currentIndex = result.findIndex((doc) => doc.documentTypeCode === code && doc.isCurrent);
    const pending = {
      id: `pending_${category.key}`, documentTypeCode: code, documentTypeName: category.name,
      fileName: file.name, filePath: null, previewUrl: createPreview(file),
      fileType: file.type === 'application/pdf' || /\.pdf$/i.test(file.name) ? 'pdf' : 'image',
      isPending: true, isCurrent: true, isLatest: true, isOriginal: true, isActive: true,
      versionLabel: 'Not saved', status: 'Not saved', error: null,
    };
    if (currentIndex >= 0) {
      result[currentIndex] = { ...pending, isOriginal: result[currentIndex].isOriginal };
    } else result.push(pending);
  }
  return overlayPendingManualDocument(result, manualFiles, createPreview);
}

export function overlayPendingManualDocument(documents, files, createPreview, code = 'CO_APPLICANT_MANUAL') {
  const file = files.filter((item) => item instanceof File).at(-1);
  if (!file) return documents;
  return [...documents.filter((doc) => doc.documentTypeCode !== code),
    { id: 'pending_manual', documentTypeCode: code,
      documentTypeName: 'Manual Document', fileName: file.name, previewUrl: createPreview(file),
      fileType: /\.(zip|rar|7z)$/i.test(file.name) ? 'zip' : (/\.pdf$/i.test(file.name) ? 'pdf' : 'image'),
      isPending: true, isCurrent: true, isLatest: true, isOriginal: true, isActive: true,
      status: 'Not saved', error: null }];
}

export function storedCategoryDocuments(primaryRow, financialRows = {}, typeIds = {}) {
  return KYC_CATEGORIES.flatMap((category) => {
    const row = category.fields ? primaryRow : financialRows[category.key];
    if (!row || row.isActive === false || row.IsActive === false) return [];
    const fields = category.fields || ['documentPath', 'DocumentPath'];
    const path = row[fields[0]] ?? row[fields[1]];
    if (!path) return [];
    return [{
      id: `kyc_${category.key}_${row.applicationKYCDocumentId ?? row.ApplicationKYCDocumentId ?? path}`,
      documentTypeCode: category.code,
      documentTypeName: category.name,
      // The primary row's DocumentTypeId describes manual verification metadata.
      documentTypeId: category.fields ? typeIds[category.key] : (typeIds[category.key] ?? row.documentTypeId ?? row.DocumentTypeId),
      fileName: row.originalFileName || row.OriginalFileName || String(path).replace(/\\/g, '/').split('/').pop(),
      filePath: path,
      createdAt: row.createdAt ?? row.CreatedAt,
      isActive: true,
    }];
  });
}

export function uploadResponsePaths(response) {
  if (!response) return [];
  if (typeof response === 'string') return documentPaths(response);
  if (Array.isArray(response)) return response.flatMap(uploadResponsePaths);
  return documentPaths(response.documentPath ?? response.DocumentPath ?? response.filePath
    ?? response.FilePath ?? response.path ?? response.Path)
    .concat(uploadResponsePaths(response.data ?? response.value ?? response.files));
}

export async function persistManualUploads({ person, upload, read, save, onCommitted }) {
  const current = syncManualDocuments(person);
  const rawFiles = (current.identityDocumentRawFiles || []).filter(
    (file) => typeof File !== 'undefined' && file instanceof File
  );
  if (rawFiles.length === 0) {
    return current;
  }
  const body = new FormData();
  for (const file of rawFiles) {
    body.append('files', file, file.name);
  }
  await upload(body);
  const latest = await read();
  const next = syncManualDocuments({
    ...current,
    documentPath: latest.documentPath ?? latest.DocumentPath ?? current.documentPath,
    numberOfDocuments: latest.numberOfDocuments ?? latest.NumberOfDocuments ?? current.numberOfDocuments,
    fileSize: latest.fileSize ?? latest.FileSize ?? current.fileSize,
  }, []);
  onCommitted?.(next);
  return next;
}
