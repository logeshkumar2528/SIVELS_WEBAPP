import test from 'node:test';
import assert from 'node:assert/strict';
import { replaceManualDocument, syncManualDocuments, mapKycPerson, primaryKycForSequence,
  isApplicantDocumentTuple, storedCategoryDocuments, persistManualUploads,
  updateApplicantSlot, clearUploadedSlot, slotReference, persistIdentitySlot,
  overlayPendingDocuments, documentHistoryKey } from './kycDocumentState.js';

const file = (name) => new File(['document bytes'], name, { type: 'application/pdf' });

test('sequential manual selections replace only the manual slot without mutating saved references', () => {
  const original = { documentPath: 'uploads/old.zip', aadharDocumentPath: 'identity/aadhaar.pdf', identityDocumentRawFiles: [] };
  const first = replaceManualDocument(original, file('first.zip'));
  const second = replaceManualDocument(first, file('second.pdf'));
  assert.deepEqual(second.identityDocumentFiles, ['second.pdf']);
  assert.equal(second.identityDocumentCount, '1');
  assert.equal(second.identityDocumentRawFiles.length, 1);
  assert.equal(second.documentPath, 'uploads/old.zip');
  assert.equal(second.aadharDocumentPath, original.aadharDocumentPath);
  assert.equal(first.identityDocumentRawFiles[0].name, 'first.zip');
  assert.equal(original.identityDocumentRawFiles.length, 0);
});

test('cancelling a pending replacement reveals the saved manual file', () => {
  const person = replaceManualDocument({ documentPath: 'old.zip' }, file('new.pdf'));
  const cancelled = syncManualDocuments(person, []);
  assert.deepEqual(cancelled.identityDocumentFiles, ['old.zip']);
  assert.equal(cancelled.identityDocumentCount, '1');
  const empty = syncManualDocuments({ ...cancelled, documentPath: null }, []);
  assert.deepEqual(empty.identityDocumentFiles, []);
  assert.equal(empty.identityDocumentCount, '');
});

test('primary KYC with uploaded file metadata is not mistaken for a financial tuple', () => {
  assert.equal(isApplicantDocumentTuple({ fileSize: 120 }), false);
  assert.equal(isApplicantDocumentTuple({ AadharDocumentPath: 'aadhaar.pdf', ContentType: 'application/pdf', FileSize: 120 }), false);
  assert.equal(isApplicantDocumentTuple({ documentStatus: 'Uploaded', originalFileName: 'salary.pdf' }), true);
});

test('reload maps by application and sequence, excluding tuples and inactive rows', () => {
  const applicant = { ApplicationKYCDocumentId: 10, ApplicationProductDetailsId: 5, ApplicantSequence: 0, FileSize: 12,
    DocumentPath: 'uploads/aadhaar.pdf, uploads/salary.pdf', AadharDocumentPath: 'identity/aadhaar.pdf' };
  const coApplicant = { applicationKYCDocumentId: 11, applicationProductDetailsId: 5, applicantSequence: 1 };
  const rows = [
    { applicationProductDetailsId: 5, applicantSequence: 0, documentStatus: 'Uploaded', documentPath: 'financial/salary.pdf' },
    coApplicant,
    { ...applicant, ApplicationProductDetailsId: 6 },
    { ...applicant, IsActive: false }, applicant,
  ];
  assert.equal(primaryKycForSequence(rows, 0, 5), applicant);
  assert.equal(primaryKycForSequence(rows, 1, 5), coApplicant);
  assert.equal(primaryKycForSequence([...rows, { ...applicant }], 0, 5), null);
  const reloaded = mapKycPerson(applicant, { identityDocumentCount: '9', identityDocumentFiles: ['stale.pdf'] });
  assert.deepEqual(reloaded.identityDocumentFiles, ['salary.pdf']);
  assert.equal(reloaded.identityDocumentCount, '1');
  assert.equal(reloaded.aadharDocumentPath, 'identity/aadhaar.pdf');
});

test('canonical categories use explicit identity columns and typed financial records', () => {
  const docs = storedCategoryDocuments({ applicationKYCDocumentId: 10, documentTypeId: 99,
    AadharDocumentPath: 'identity/aadhaar.pdf', PanCardPath: 'identity/pan.pdf', DocumentPath: 'manual/archive.zip' },
  { salarySlip: { DocumentPath: 'financial/salary.pdf', OriginalFileName: 'September.pdf' } },
  { aadhaar: 2, pan: 3, salarySlip: 7 });
  assert.deepEqual(docs.map((doc) => [doc.documentTypeCode, doc.documentTypeId]), [['AADHAAR', 2], ['PAN', 3], ['SALARY_SLIP', 7]]);
  assert.equal(docs[2].fileName, 'September.pdf');
  assert.ok(docs.every((doc) => doc.filePath !== 'manual/archive.zip'));
  assert.equal(storedCategoryDocuments({ documentTypeId: 99, AadharDocumentPath: 'aadhaar.pdf' })[0].documentTypeId, undefined);
});

function serverHarness({ failUpload = 0, failSave = false, ignoreSave = false, appendUpload = false } = {}) {
  let server = { documentPath: 'uploads/old.pdf' };
  let requests = 0;
  const commits = [];
  return {
    commits,
    read: async () => ({ ...server }),
    upload: async (body) => {
      requests += 1;
      if (requests === failUpload) throw new Error('upload failed');
      assert.deepEqual([...body.keys()], ['files']);
      const uploaded = body.get('files');
      assert.equal(await uploaded.text(), 'document bytes');
      // Reproduce the overwrite endpoint with a 204 / empty response.
      server.documentPath = (appendUpload ? server.documentPath + ', ' : '') + `uploads/${uploaded.name}`;
      return null;
    },
    save: async (person) => {
      if (failSave) throw new Error('save failed');
      if (!ignoreSave) server.documentPath = person.documentPath;
    },
    onCommitted: (person) => commits.push(person),
  };
}

for (const appendUpload of [false, true]) {
  test('manual save replaces the old reference and reloads one file (append endpoint: ' + appendUpload + ')', async () => {
    const harness = serverHarness({ appendUpload });
    const person = replaceManualDocument({ documentPath: 'uploads/old.pdf' }, file('new.zip'));
    const saved = await persistManualUploads({ person, ...harness });
    const reloaded = mapKycPerson(await harness.read());
    assert.deepEqual(reloaded.identityDocumentFiles, ['new.zip']);
    assert.equal(reloaded.documentPath, 'uploads/new.zip');
    assert.equal(saved.identityDocumentRawFiles.length, 0);
    assert.equal(harness.commits.length, 1);
  });
}

test('failed manual upload retains the saved reference and pending replacement for retry', async () => {
  const harness = serverHarness({ failUpload: 1 });
  const person = replaceManualDocument({ documentPath: 'uploads/old.pdf' }, file('new.pdf'));
  await assert.rejects(persistManualUploads({ person, ...harness }), /upload failed/);
  assert.equal(person.documentPath, 'uploads/old.pdf');
  assert.equal(person.identityDocumentRawFiles[0].name, 'new.pdf');
  assert.equal(harness.commits.length, 0);
  await persistManualUploads({ person, ...harness });
  assert.deepEqual(mapKycPerson(await harness.read()).identityDocumentFiles, ['new.pdf']);
});

test('failed path persistence never clears the selected replacement', async () => {
  const harness = serverHarness({ failSave: true });
  const person = replaceManualDocument({ documentPath: 'uploads/old.pdf' }, file('new.pdf'));
  await assert.rejects(persistManualUploads({ person, ...harness }), /save failed/);
  assert.equal(harness.commits.length, 0);
  assert.equal(person.identityDocumentRawFiles.length, 1);
});

test('a backend retaining both old and replacement paths is rejected', async () => {
  const harness = serverHarness({ ignoreSave: true, appendUpload: true });
  const person = replaceManualDocument({ documentPath: 'uploads/old.pdf' }, file('new.pdf'));
  await assert.rejects(persistManualUploads({ person, ...harness }), /single replacement document/);
  assert.equal(harness.commits.length, 0);
});

test('replacing or cancelling one slot preserves sibling slots and other applicants', () => {
  const original = { 0: { aadhaar: file('old.pdf'), pan: file('pan.pdf'), profile: file('profile.pdf'),
    salarySlip: file('salary.pdf'), bankStatement: file('bank.pdf') }, 1: { pan: file('second-pan.pdf') } };
  const replacement = file('new-aadhaar.pdf');
  const changed = updateApplicantSlot(original, 0, 'aadhaar', replacement);
  assert.equal(changed[0].pan, original[0].pan);
  assert.equal(changed[0].profile, original[0].profile);
  assert.equal(changed[0].salarySlip, original[0].salarySlip);
  assert.equal(changed[0].bankStatement, original[0].bankStatement);
  assert.equal(changed[1], original[1]);
  assert.notEqual(changed[0].aadhaar, original[0].aadhaar);
  const cancelled = clearUploadedSlot(changed, 0, 'aadhaar', replacement);
  assert.equal(cancelled[0].aadhaar, null);
  assert.equal(cancelled[0].salarySlip, original[0].salarySlip);
  assert.equal(clearUploadedSlot(changed, 0, 'aadhaar', original[0].aadhaar), changed);
});

test('saved references populate all five categories without preview downloads', () => {
  const row = { AadharDocumentPath: 'aadhaar.pdf', PanCardPath: 'pan.pdf', ProfileImagePath: 'profile.png' };
  const docs = storedCategoryDocuments(row, { salarySlip: { DocumentPath: 'salary.pdf' }, bankStatement: { DocumentPath: 'bank.pdf' } });
  const references = docs.map((doc) => slotReference(doc.filePath));
  assert.equal(references.length, 5);
  assert.ok(references.every((reference) => reference.exists && reference.documentPath && reference.blobUrl === null));
});

test('identity replacement repairs an endpoint that clears sibling and manual paths', async () => {
  let row = { documentPath: 'manual.pdf', aadharDocumentPath: 'old.pdf', panCardPath: 'pan.pdf', profileImagePath: 'photo.png' };
  const saved = await persistIdentitySlot({ key: 'aadhaar', file: file('new.pdf'),
    read: async () => ({ ...row }),
    upload: async (body, replacing) => {
      assert.equal(replacing, true);
      assert.equal(body.get('file').name, 'new.pdf');
      row = { aadharDocumentPath: 'new.pdf' };
    },
    save: async (paths) => { row = { ...paths }; },
  });
  assert.deepEqual(row, { documentPath: 'manual.pdf', aadharDocumentPath: 'new.pdf', panCardPath: 'pan.pdf', profileImagePath: 'photo.png' });
  assert.equal(saved.reference.documentPath, 'new.pdf');
  assert.equal(saved.reference.exists, true);
});

test('a missing identity reference or failed sibling repair blocks slot completion', async () => {
  await assert.rejects(persistIdentitySlot({ key: 'pan', file: file('pan.pdf'),
    read: async () => ({}), upload: async () => {}, save: async () => {},
  }), /did not save/);
  let row = { panCardPath: 'pan.pdf', aadharDocumentPath: 'aadhaar.pdf' };
  await assert.rejects(persistIdentitySlot({ key: 'pan', file: file('pan-new.pdf'),
    read: async () => ({ ...row }), upload: async () => { row = { panCardPath: 'pan-new.pdf' }; }, save: async () => {},
  }), /did not retain all/);
});

test('modal replacement uses one current entry per slot and preserves unrelated documents', () => {
  const original = [
    { id: 'a', documentTypeCode: 'CO_APPLICANT_AADHAAR', fileName: 'old.pdf', isCurrent: true, isOriginal: true },
    { id: 'p', documentTypeCode: 'CO_APPLICANT_PAN', fileName: 'pan.pdf', isCurrent: true, isOriginal: true },
    { id: 's', documentTypeCode: 'CO_APPLICANT_SALARY_SLIP', fileName: 'salary.pdf', isCurrent: true, isOriginal: true },
  ];
  const result = overlayPendingDocuments(original, { aadhaar: file('new.pdf') }, [], (item) => `blob:${item.name}`);
  assert.equal(result.length, 3);
  assert.equal(result[0].fileName, 'new.pdf');
  assert.equal(result[0].isPending, true);
  assert.equal(result[0].status, 'Not saved');
  assert.equal(result[1], original[1]);
  assert.equal(result[2], original[2]);
  assert.equal(original[0].fileName, 'old.pdf');
});

test('pending manual selection replaces the old modal entry and cannot contain multiple files', () => {
  const documents = [{ documentTypeCode: 'APPLICANT_MANUAL', filePath: 'aadhaar.pdf' },
    { documentTypeCode: 'APPLICANT_MANUAL', filePath: 'salary.pdf' }];
  assert.equal(new Set(documents.map(documentHistoryKey)).size, 2);
  const pending = overlayPendingDocuments([{ documentTypeCode: 'CO_APPLICANT_MANUAL', fileName: 'old.zip' }], {}, [file('aadhaar.pdf'), file('salary.pdf')], (item) => `blob:${item.name}`);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].fileName, 'salary.pdf');
  assert.ok(pending.every((doc) => doc.isOriginal && doc.isPending));
});
