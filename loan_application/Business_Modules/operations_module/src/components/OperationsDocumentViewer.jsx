import { useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import operationsApplicationService, {
  OPERATIONS_DOCUMENT_TYPES,
} from '../services/operationsApplicationService';
import './OperationsDocumentViewer.css';

const DOCUMENT_TYPE_BY_VIEW = Object.freeze({
  form: OPERATIONS_DOCUMENT_TYPES.APPLICATION_FORM,
  recommendation: OPERATIONS_DOCUMENT_TYPES.RECOMMENDATION_SHEET,
  sanction: OPERATIONS_DOCUMENT_TYPES.SANCTION_LETTER,
  kfs: OPERATIONS_DOCUMENT_TYPES.KFS,
});

const DOCUMENT_TITLE_BY_VIEW = Object.freeze({
  form: 'View Form',
  recommendation: 'Recommendation Sheet',
  sanction: 'Sanction Letter',
  kfs: 'Key Facts Statement',
});

function getErrorMessage(error) {
  const status = error?.response?.status;
  if (status === 401) return 'Your session has expired. Please sign in again to view this document.';
  if (status === 403) return 'You do not have permission to view this document.';
  if (status === 404) return 'The saved document is not available for this application.';
  if (error?.request && !error?.response) return 'The document could not be loaded because the server was unreachable.';
  return error?.response?.data?.message || error?.message || 'Unable to load the saved document.';
}

function ReadOnlyApplicationDocumentViewer({ application, type }) {
  const requestIdRef = useRef(0);
  const objectUrlRef = useRef(null);
  const [state, setState] = useState({ status: 'loading', message: '' });
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentFileName, setDocumentFileName] = useState('KFS.pdf');
  const [retryKey, setRetryKey] = useState(0);

  const applicationProductDetailsId =
    application?.applicationProductDetailsId ?? application?.ApplicationProductDetailsId;
  const documentType = DOCUMENT_TYPE_BY_VIEW[type];

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let active = true;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setDocumentUrl('');
    setDocumentFileName(`${DOCUMENT_TITLE_BY_VIEW[type] || 'Application Document'}.pdf`);
    setState({ status: 'loading', message: '' });

    if (!applicationProductDetailsId || !documentType) {
      setState({
        status: 'unavailable',
        message: 'The saved document is not available for this application.',
      });
      return () => {
        active = false;
      };
    }

    const loadDocument = async () => {
      try {
        const metadata = await operationsApplicationService.getExistingApplicationDocument(
          applicationProductDetailsId,
          documentType
        );
        if (!active || requestId !== requestIdRef.current) return;

        const documentId = metadata?.documentId ?? metadata?.DocumentId;
        if (!documentId) {
          setState({
            status: 'unavailable',
            message: 'The saved document is not available for this application.',
          });
          return;
        }

        const response = await operationsApplicationService.downloadExistingApplicationDocument(documentId);
        if (!active || requestId !== requestIdRef.current) return;

        const blob = response?.data ?? response;
        const pdfBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'application/pdf' });
        const nextObjectUrl = URL.createObjectURL(pdfBlob);
        objectUrlRef.current = nextObjectUrl;
        setDocumentUrl(nextObjectUrl);
        setDocumentFileName(
          metadata?.fileName
          ?? metadata?.FileName
          ?? `${DOCUMENT_TITLE_BY_VIEW[type] || 'Application Document'}.pdf`
        );
        setState({ status: 'ready', message: '' });
      } catch (error) {
        if (!active || requestId !== requestIdRef.current) return;
        setState({ status: 'error', message: getErrorMessage(error) });
      }
    };

    loadDocument();

    return () => {
      active = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [applicationProductDetailsId, documentType, retryKey]);

  if (state.status === 'loading') {
    return <p className="operations-document-viewer__state" role="status">Loading saved document…</p>;
  }

  if (state.status === 'unavailable') {
    return <p className="operations-document-viewer__state">{state.message}</p>;
  }

  if (state.status === 'error') {
    return (
      <div className="operations-document-viewer__state" role="alert">
        <p>{state.message}</p>
        <button
          type="button"
          onClick={() => setRetryKey((value) => value + 1)}
          style={{ pointerEvents: 'auto' }}
        >
          <RefreshCw size={14} aria-hidden="true" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="operations-document-viewer__legacy-frame">
      {type === 'kfs' && (
        <div className="operations-document-viewer__document-actions">
          <a href={documentUrl} download={documentFileName}>Download PDF</a>
        </div>
      )}
      <iframe
        title={DOCUMENT_TITLE_BY_VIEW[type] || 'Application document'}
        src={documentUrl}
        style={{ width: '100%', minHeight: 'calc(92vh - 150px)', border: 0, background: '#fff' }}
      />
    </div>
  );
}

export default function OperationsDocumentViewer({ application, type, onClose }) {
  if (!application) return null;

  const title = DOCUMENT_TITLE_BY_VIEW[type] || 'Application Document';

  return (
    <div className="operations-document-viewer" role="dialog" aria-modal="true" aria-labelledby="operations-document-viewer-title">
      <div className="operations-document-viewer__window">
        <header className="operations-document-viewer__header">
          <div>
            <h2 id="operations-document-viewer-title">{title}</h2>
            <p>{application.fullName || 'Selected application'}</p>
          </div>
          <button type="button" className="operations-document-viewer__close" onClick={onClose} aria-label="Close document viewer">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="operations-document-viewer__body">
          <ReadOnlyApplicationDocumentViewer application={application} type={type} />
        </div>
        <footer className="operations-document-viewer__footer">
          <button type="button" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}
