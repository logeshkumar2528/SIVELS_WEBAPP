import { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Upload,
  Camera,
  Eye,
  Trash2,
  CheckCircle2,
  ExternalLink,
  X,
  LoaderCircle,
  AlertCircle,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import './DocumentUploadSection.css';

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

export function isPdfUrl(urlOrPath = '') {
  if (!urlOrPath) return false;
  return /\.pdf(\?.*)?$/i.test(String(urlOrPath));
}

/**
 * Fetches an authenticated file or image as an Object URL blob.
 * Uses axiosInstance with responseType 'blob' to avoid CORS/auth issues.
 * Returns { url, isPdf, isBlob }
 */
export async function fetchDocumentBlobUrl(targetUrl) {
  if (!targetUrl) return null;
  if (targetUrl.startsWith('blob:') || targetUrl.startsWith('data:')) {
    return { url: targetUrl, isPdf: false, isBlob: true };
  }

  try {
    const response = await axiosInstance.get(targetUrl, {
      responseType: 'blob',
    });
    if (response?.data && response.data.size > 0) {
      const blob = response.data;
      const objectUrl = URL.createObjectURL(blob);
      const isPdf = blob.type === 'application/pdf' || isPdfUrl(targetUrl);
      return { url: objectUrl, isPdf, isBlob: true };
    }
  } catch (err) {
    console.warn('Could not fetch document as blob via axiosInstance, using direct URL fallback:', err);
  }

  return { url: targetUrl, isPdf: isPdfUrl(targetUrl), isBlob: false };
}

export function DocumentUploadCard({
  title,
  required = false,
  subtitle,
  note,
  accept = '.pdf,.jpg,.jpeg,.png',
  icon = 'document',
  file,
  previewUrl,
  isPdf = false,
  isProfile = false,
  onUpload,
  onRemove,
  onView,
  isExisting = false,
  existingUrl = null,
  existingFileName = null,
  onViewExisting = null,
  onReplace = null,
}) {
  const inputRef = useRef(null);

  const hasNewFile = Boolean(file);
  const hasExisting = Boolean(!file && (isExisting || existingUrl));

  const getFormatLabel = () => {
    if (isPdf) return 'PDF File';
    if (isProfile) return 'Profile Photo';
    if (file?.type) {
      const sub = file.type.split('/')[1]?.toUpperCase();
      if (sub === 'JPEG' || sub === 'JPG') return 'JPG Image';
      if (sub === 'PNG') return 'PNG Image';
    }
    return 'Image';
  };

  const handleReplaceClick = (e) => {
    e.stopPropagation();
    if (onReplace) {
      onReplace();
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <div className="doc-upload-card-wrapper">
      <div className="doc-upload-header">
        <span className="doc-upload-title">
          {title} {required && <span className="doc-required-star">*</span>}
        </span>
        {subtitle && <span className="doc-upload-subtitle">{subtitle}</span>}
        {note && <span className="doc-upload-note">{note}</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="doc-hidden-input"
        onChange={onUpload}
      />

      {/* STATE 1: Newly selected file */}
      {hasNewFile ? (
        <div className="doc-uploaded-box">
          <div className="doc-uploaded-left">
            {isPdf ? (
              <div className="doc-pdf-badge" title="PDF Document">
                <FileText size={20} className="doc-pdf-icon" />
                <span className="doc-pdf-badge-text">PDF</span>
              </div>
            ) : isProfile ? (
              <img
                src={previewUrl}
                alt="Profile Preview"
                className="doc-img-thumb doc-profile-thumb"
                onClick={onView}
              />
            ) : (
              <img
                src={previewUrl}
                alt="Document Preview"
                className="doc-img-thumb"
                onClick={onView}
              />
            )}
          </div>

          <div className="doc-uploaded-info">
            <div className="doc-filename-row">
              <CheckCircle2 size={15} className="doc-success-check" />
              <span className="doc-filename" title={file.name}>
                {file.name}
              </span>
            </div>
            <span className="doc-meta-text">
              {formatFileSize(file.size)} • {getFormatLabel()}
            </span>
          </div>

          <div className="doc-uploaded-actions">
            <button
              type="button"
              className="doc-btn-action doc-btn-view"
              onClick={onView}
              aria-label={`View ${title}`}
              title="View document"
            >
              <Eye size={13} />
              <span>View</span>
            </button>
            <button
              type="button"
              className="doc-btn-action doc-btn-remove"
              onClick={onRemove}
              aria-label={`Remove ${title}`}
              title="Remove document"
            >
              <Trash2 size={13} />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : hasExisting ? (
        /* STATE 2: Existing uploaded document from server */
        <div className="doc-uploaded-box doc-existing-box">
          <div className="doc-uploaded-left">
            {isPdf ? (
              <div className="doc-pdf-badge" title="Existing PDF Document">
                <FileText size={20} className="doc-pdf-icon" />
                <span className="doc-pdf-badge-text">PDF</span>
              </div>
            ) : isProfile && (previewUrl || existingUrl) ? (
              <img
                src={previewUrl || existingUrl}
                alt="Existing Profile"
                className="doc-img-thumb doc-profile-thumb"
                onClick={onViewExisting || onView}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="doc-pdf-badge doc-file-badge" title="Existing Document">
                <FileText size={20} className="doc-pdf-icon" />
                <span className="doc-pdf-badge-text">DOC</span>
              </div>
            )}
          </div>

          <div className="doc-uploaded-info">
            <div className="doc-filename-row">
              <CheckCircle2 size={15} className="doc-success-check" />
              <span className="doc-filename" title={existingFileName || `${title} Uploaded`}>
                {existingFileName || `${title} Uploaded`}
              </span>
            </div>
            <span className="doc-meta-text">
              Existing document uploaded • {isPdf ? 'PDF File' : isProfile ? 'Profile Photo' : 'Image'}
            </span>
          </div>

          <div className="doc-uploaded-actions">
            <button
              type="button"
              className="doc-btn-action doc-btn-view"
              onClick={onViewExisting || onView}
              aria-label={`View existing ${title}`}
              title="View existing document"
            >
              <Eye size={13} />
              <span>View</span>
            </button>
            <button
              type="button"
              className="doc-btn-action doc-btn-replace"
              onClick={handleReplaceClick}
              aria-label={`Replace ${title}`}
              title="Replace document"
            >
              <Upload size={13} />
              <span>Replace</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 3: Empty Dropzone */
        <div
          className="doc-empty-dropzone"
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="doc-icon-circle">
            {icon === 'camera' ? (
              <Camera size={22} className="doc-drop-icon" />
            ) : (
              <FileText size={22} className="doc-drop-icon" />
            )}
          </div>
          <button
            type="button"
            className="doc-upload-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            <Upload size={14} />
            <span>Upload Document</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function DocumentPreviewModal({ isOpen, onClose, doc }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [doc?.url]);

  if (!isOpen || !doc) return null;

  return (
    <div className="doc-modal-backdrop" onClick={onClose}>
      <div
        className="doc-modal-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="doc-modal-header">
          <div className="doc-modal-header-text">
            <span className="doc-modal-title">{doc.name || doc.title || 'Document Preview'}</span>
          </div>
          <div className="doc-modal-header-actions">
            {doc.url && (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="doc-external-link"
                title="Open in new tab"
              >
                <ExternalLink size={14} />
                <span>Open in New Tab</span>
              </a>
            )}
            <button
              type="button"
              className="doc-modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="doc-modal-body">
          {doc.loading ? (
            <div className="doc-loading-container">
              <LoaderCircle size={28} className="doc-spin-icon" />
              <span>Loading document preview...</span>
            </div>
          ) : doc.isPdf ? (
            <div className="doc-modal-pdf-container">
              <iframe
                src={doc.url}
                title={doc.name || doc.title || 'PDF Preview'}
                className="doc-modal-iframe"
              />
              <div className="doc-modal-fallback-link">
                <span>Trouble viewing PDF?</span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="doc-external-link"
                >
                  <ExternalLink size={14} />
                  <span>Open in New Tab</span>
                </a>
              </div>
            </div>
          ) : imgError ? (
            <div className="doc-modal-error-box">
              <AlertCircle size={24} color="#dc2626" />
              <p>Unable to display image preview directly.</p>
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="doc-external-link"
                >
                  <ExternalLink size={14} />
                  <span>Open Image in New Tab</span>
                </a>
              )}
            </div>
          ) : (
            <div className="doc-modal-img-container">
              <img
                src={doc.url}
                alt={doc.name || doc.title || 'Preview'}
                className="doc-modal-img"
                onError={() => setImgError(true)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
