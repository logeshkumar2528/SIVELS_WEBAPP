import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import {
  applicantLabel,
  downloadAgentCustomerDocument,
  downloadCustomerDocumentProof,
  downloadDocumentByPath,
  getCustomerDocumentTypes,
  getProofCategories,
  hasValue,
  isCustomerFlowRejection,
  normalizeCustomerDocumentType,
  normalizeRejection,
  sameId,
} from '../../../../../Core/src/services/customerDocumentService';
import { openDocument, readApiError } from '../../../../../Core/src/utils/documentFileActions';

let categoryMastersPromise = null;

function loadCategoryMasters() {
  if (!categoryMastersPromise) {
    categoryMastersPromise = Promise.allSettled([getCustomerDocumentTypes(), getProofCategories()]).then(
      ([customerTypes, proofTypes]) => {
        if (customerTypes.status === 'rejected' && proofTypes.status === 'rejected') categoryMastersPromise = null;
        return {
          customerTypes: customerTypes.status === 'fulfilled' ? customerTypes.value.map(normalizeCustomerDocumentType) : [],
          proofTypes: proofTypes.status === 'fulfilled' ? proofTypes.value : [],
        };
      }
    );
  }
  return categoryMastersPromise;
}

function fileName(path) {
  return path ? String(path).replace(/\\/g, '/').split('/').pop() : '';
}

/**
 * Shows what the RM needs to correct a returned document: rejected file, document category,
 * applicant sequence, and the original / current document paths.
 */
export default function ReturnedDocumentDetails({ rejection: rawRejection, fallbackLabel }) {
  const rejection = normalizeRejection(rawRejection);
  const isCustomerFlow = isCustomerFlowRejection(rejection);
  const isProof = hasValue(rejection.customerDocumentProofId);
  const [masters, setMasters] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isCustomerFlow) return undefined;
    let active = true;
    loadCategoryMasters().then((result) => { if (active) setMasters(result); });
    return () => { active = false; };
  }, [isCustomerFlow]);

  let category = fallbackLabel || rejection.rejectedDocumentType || 'Document';
  if (isCustomerFlow && isProof) {
    const name = masters?.proofTypes.find((t) => sameId(t.documentTypeId, rejection.documentTypeId))?.documentTypeName;
    category = `${name || 'Proof document'} (RM proof)`;
  } else if (isCustomerFlow) {
    const name = masters?.customerTypes.find((t) => sameId(t.customerDocumentTypeId, rejection.customerDocumentTypeId))?.documentTypeName;
    category = `${name || 'Customer document'} (customer page)`;
  }

  const open = async (key, loader, name) => {
    setBusy(key);
    setError('');
    try {
      await openDocument(loader, name);
    } catch (err) {
      setError(await readApiError(err, 'Unable to open this file.'));
    } finally {
      setBusy(null);
    }
  };

  const rejectedLoader = () => {
    if (isProof) {
      return downloadCustomerDocumentProof(rejection.customerDocumentProofId).catch((err) => {
        if (err?.response?.status === 404 && rejection.originalDocumentPath) {
          return downloadDocumentByPath(rejection.originalDocumentPath);
        }
        throw err;
      });
    }
    if (hasValue(rejection.agentCustomerDocumentId)) {
      return downloadAgentCustomerDocument(rejection.agentCustomerDocumentId);
    }
    return downloadDocumentByPath(rejection.originalDocumentPath || rejection.currentDocumentPath);
  };
  const canViewRejected = isProof || hasValue(rejection.agentCustomerDocumentId)
    || hasValue(rejection.originalDocumentPath) || hasValue(rejection.currentDocumentPath);

  const pathRow = (key, label, path) => (
    <div className="return-detail-row">
      <span className="return-detail-label">{label}</span>
      {path ? (
        <button
          type="button"
          className="return-detail-link"
          title={path}
          disabled={busy === key}
          onClick={() => open(key, () => downloadDocumentByPath(path), fileName(path))}
        >
          {busy === key ? 'Opening...' : fileName(path)}
        </button>
      ) : (
        <span className="return-detail-value">—</span>
      )}
    </div>
  );

  return (
    <div className="return-detail-box">
      <div className="return-detail-row">
        <span className="return-detail-label">Document Category</span>
        <span className="return-detail-value">{category}</span>
      </div>
      <div className="return-detail-row">
        <span className="return-detail-label">Applicant</span>
        <span className="return-detail-value">
          {applicantLabel(rejection.applicantSequence)} (Applicant Sequence {rejection.applicantSequence})
        </span>
      </div>
      <div className="return-detail-row">
        <span className="return-detail-label">Rejected Document</span>
        {canViewRejected ? (
          <button
            type="button"
            className="return-detail-link"
            disabled={busy === 'rejected'}
            onClick={() => open('rejected', rejectedLoader, fileName(rejection.originalDocumentPath) || 'rejected-document')}
          >
            <Eye size={12} /> {busy === 'rejected' ? 'Opening...' : 'View rejected document'}
          </button>
        ) : (
          <span className="return-detail-value">—</span>
        )}
      </div>
      {pathRow('original', 'Original Path', rejection.originalDocumentPath)}
      {pathRow('current', 'Current Path', rejection.currentDocumentPath)}
      {error && <div className="return-modal-feedback is-error">{error}</div>}
    </div>
  );
}
