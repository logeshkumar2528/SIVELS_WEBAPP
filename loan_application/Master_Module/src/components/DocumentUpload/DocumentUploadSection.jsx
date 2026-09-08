import { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Camera,
  Eye,
  Trash2,
  CheckCircle2,
  ExternalLink,
  X
} from 'lucide-react';
import './DocumentUploadSection.css';

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
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
}) {
  const inputRef = useRef(null);

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

      {!file ? (
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
      ) : (
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
      )}
    </div>
  );
}

export function DocumentPreviewModal({ isOpen, onClose, doc }) {
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
            <span className="doc-modal-title">{doc.name || 'Document Preview'}</span>
          </div>
          <button
            type="button"
            className="doc-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="doc-modal-body">
          {doc.isPdf ? (
            <div className="doc-modal-pdf-container">
              <iframe
                src={doc.url}
                title={doc.name || 'PDF Preview'}
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
          ) : (
            <div className="doc-modal-img-container">
              <img
                src={doc.url}
                alt={doc.name || 'Preview'}
                className="doc-modal-img"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
