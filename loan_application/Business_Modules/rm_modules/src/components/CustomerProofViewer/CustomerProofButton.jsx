import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '../Button/Button';
import Modal from '../Modal/Modal';
import rmCustomerService from '../../services/rmCustomerService';
import './CustomerProofViewer.css';

const IMAGE_EXTENSIONS = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

function firstValue(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function fileExtension(fileName) {
  return String(fileName || '').split('?')[0].split('.').pop().toLowerCase();
}

/** 'image', 'pdf' or 'other', from the stored content type with the file extension as fallback. */
function previewKind(contentType, fileName) {
  const type = String(contentType || '').toLowerCase().split(';')[0].trim();
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  const ext = fileExtension(fileName);
  if (IMAGE_EXTENSIONS[ext]) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

function blobTypeFor(kind, contentType, fileName) {
  const type = String(contentType || '').toLowerCase().split(';')[0].trim();
  if (type && type !== 'application/octet-stream') return type;
  if (kind === 'pdf') return 'application/pdf';
  return IMAGE_EXTENSIONS[fileExtension(fileName)] || 'application/octet-stream';
}

function personName(person) {
  if (!person) return '';
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ').trim()
    || person.fullName
    || '';
}

function personLabel(sequence, appData) {
  const personal = appData?.sections?.personalInformation || appData?.registration?.personalInformation || {};
  if (sequence === 0) {
    const name = personName(personal.applicant) || appData?.customerName || appData?.fullName || '';
    return name ? `Applicant – ${name}` : 'Applicant';
  }
  const name = personName(personal.coApplicants?.[sequence - 1]);
  return name ? `Co-Applicant ${sequence} – ${name}` : `Co-Applicant ${sequence}`;
}

/**
 * "Customer Proof" header button: lists the customer proofs uploaded for this application,
 * grouped by person and proof category, and previews the selected image or PDF.
 */
export default function CustomerProofButton({ appId, appData }) {
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [proofs, setProofs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [preview, setPreview] = useState({ status: 'idle', url: '', kind: '', error: '' });
  const previewUrlRef = useRef('');

  const productDetailsId = appData?.applicationProductDetailsId ?? appData?.sections?.productDetails?.applicationProductDetailsId;

  const releasePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
  }, []);

  useEffect(() => releasePreviewUrl, [releasePreviewUrl]);

  useEffect(() => {
    if (!show || !appId) return undefined;
    let active = true;

    async function loadProofs() {
      setIsLoading(true);
      setLoadError('');
      try {
        const [records, categories, proofMasters] = await Promise.all([
          rmCustomerService.getApplicationCustomerProofs({
            agentCustomerId: appId,
            applicationProductDetailsId: productDetailsId,
          }),
          rmCustomerService.getProofCategories().catch(() => []),
          rmCustomerService.getProofsByCategory().catch(() => []),
        ]);
        if (!active) return;

        const categoryNames = {};
        categories.forEach((row) => {
          const id = firstValue(row, 'documentTypeId', 'DocumentTypeId', 'id', 'Id');
          const name = firstValue(row, 'documentTypeName', 'DocumentTypeName', 'name', 'Name');
          if (id !== undefined && name) categoryNames[String(id)] = String(name).trim();
        });
        const proofNames = {};
        proofMasters.forEach((row) => {
          const id = firstValue(row, 'proofId', 'ProofId');
          const name = firstValue(row, 'proofName', 'ProofName');
          if (id !== undefined && name) proofNames[String(id)] = String(name).trim();
        });

        const mapped = records
          .filter((row) => firstValue(row, 'isActive', 'IsActive') !== false)
          .filter((row) => String(firstValue(row, 'agentCustomerId', 'AgentCustomerId') ?? appId) === String(appId))
          .filter((row) => {
            const rowProductId = firstValue(row, 'applicationProductDetailsId', 'ApplicationProductDetailsId');
            return !productDetailsId || rowProductId === undefined || String(rowProductId) === String(productDetailsId);
          })
          .map((row) => {
            const documentTypeId = firstValue(row, 'documentTypeId', 'DocumentTypeId');
            const proofId = firstValue(row, 'proofId', 'ProofId');
            const fileName = String(firstValue(row, 'originalFileName', 'OriginalFileName', 'fileName', 'FileName', 'filePath', 'FilePath') ?? '');
            const contentType = String(firstValue(row, 'contentType', 'ContentType') ?? '');
            return {
              id: firstValue(row, 'customerDocumentProofId', 'CustomerDocumentProofId', 'id', 'Id'),
              sequence: Number(firstValue(row, 'applicantSequence', 'ApplicantSequence') ?? 0),
              categoryName: String(
                firstValue(row, 'documentTypeName', 'DocumentTypeName') ?? categoryNames[String(documentTypeId)] ?? 'Other'
              ).trim(),
              proofName: String(
                firstValue(row, 'proofName', 'ProofName') ?? proofNames[String(proofId)] ?? 'Proof'
              ).trim(),
              fileName,
              contentType,
              kind: previewKind(contentType, fileName),
            };
          })
          .filter((proof) => proof.id !== undefined && Number.isInteger(proof.sequence) && proof.sequence >= 0);

        setProofs(mapped);
      } catch (err) {
        if (active) setLoadError(err?.message || 'Unable to load customer proofs.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadProofs();
    return () => {
      active = false;
    };
  }, [show, appId, productDetailsId]);

  const groups = useMemo(() => {
    const byPerson = new Map();
    proofs.forEach((proof) => {
      if (!byPerson.has(proof.sequence)) byPerson.set(proof.sequence, new Map());
      const byCategory = byPerson.get(proof.sequence);
      if (!byCategory.has(proof.categoryName)) byCategory.set(proof.categoryName, []);
      byCategory.get(proof.categoryName).push(proof);
    });
    return [...byPerson.entries()]
      .sort(([a], [b]) => a - b)
      .map(([sequence, byCategory]) => ({
        sequence,
        label: personLabel(sequence, appData),
        categories: [...byCategory.entries()].map(([name, items]) => ({ name, items })),
      }));
  }, [proofs, appData]);

  const selectedProof = proofs.find((proof) => proof.id === selectedId) || null;

  const openProof = async (proof) => {
    setSelectedId(proof.id);
    releasePreviewUrl();
    setPreview({ status: 'loading', url: '', kind: proof.kind, error: '' });
    try {
      const { blob, contentType } = await rmCustomerService.downloadApplicationCustomerProof(proof.id);
      const kind = proof.kind === 'other' ? previewKind(contentType, proof.fileName) : proof.kind;
      const typed = new Blob([blob], { type: blobTypeFor(kind, contentType || proof.contentType, proof.fileName) });
      const url = URL.createObjectURL(typed);
      previewUrlRef.current = url;
      setPreview({ status: 'ready', url, kind, error: '' });
    } catch (err) {
      setPreview({ status: 'error', url: '', kind: proof.kind, error: err?.message || 'Unable to open this proof.' });
    }
  };

  const close = () => {
    setShow(false);
    setSelectedId(null);
    releasePreviewUrl();
    setPreview({ status: 'idle', url: '', kind: '', error: '' });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShow(true)}>
        Customer Proof
      </Button>

      <Modal show={show} onHide={close} title="Customer Proofs" size="lg" className="cpv-modal">
        {isLoading ? (
          <p className="cpv-empty">Loading customer proofs…</p>
        ) : loadError ? (
          <p className="cpv-empty cpv-error">{loadError}</p>
        ) : groups.length === 0 ? (
          <p className="cpv-empty">No customer proofs have been uploaded for this application.</p>
        ) : (
          <div className="cpv-layout">
            <div className="cpv-list">
              {groups.map((person) => (
                <section key={person.sequence} className="cpv-person">
                  <h4 className="cpv-person-title">{person.label}</h4>
                  {person.categories.map((category) => (
                    <div key={category.name} className="cpv-category">
                      <div className="cpv-category-name">{category.name}</div>
                      {category.items.map((proof) => (
                        <button
                          key={proof.id}
                          type="button"
                          className={`cpv-proof${proof.id === selectedId ? ' is-active' : ''}`}
                          onClick={() => openProof(proof)}
                        >
                          <span className="cpv-proof-name">{proof.proofName}</span>
                          <span className="cpv-proof-meta">
                            {proof.kind === 'pdf' ? 'PDF' : proof.kind === 'image' ? 'Image' : 'File'}
                            {proof.fileName ? ` · ${proof.fileName.split('/').pop()}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </section>
              ))}
            </div>

            <div className="cpv-preview">
              {!selectedProof ? (
                <p className="cpv-empty">Select a proof to view the uploaded file.</p>
              ) : preview.status === 'loading' ? (
                <p className="cpv-empty">Loading {selectedProof.proofName}…</p>
              ) : preview.status === 'error' ? (
                <p className="cpv-empty cpv-error">{preview.error}</p>
              ) : preview.status === 'ready' ? (
                <>
                  <div className="cpv-preview-header">
                    <span>{selectedProof.categoryName} · {selectedProof.proofName}</span>
                    <a href={preview.url} target="_blank" rel="noreferrer">Open in new tab</a>
                  </div>
                  {preview.kind === 'image' ? (
                    <img className="cpv-preview-image" src={preview.url} alt={selectedProof.proofName} />
                  ) : preview.kind === 'pdf' ? (
                    <iframe className="cpv-preview-frame" src={preview.url} title={selectedProof.proofName} />
                  ) : (
                    <p className="cpv-empty">
                      This file type cannot be previewed.{' '}
                      <a href={preview.url} download={selectedProof.fileName.split('/').pop() || 'proof'}>Download it</a>
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
