const PREVIEW_URL_TTL_MS = 60000;

export function mimeTypeFor(fileName, fallback) {
  if (/\.pdf$/i.test(fileName || '')) return 'application/pdf';
  if (/\.(jpg|jpeg)$/i.test(fileName || '')) return 'image/jpeg';
  if (/\.png$/i.test(fileName || '')) return 'image/png';
  return fallback || 'application/octet-stream';
}

function isPreviewable(type) {
  return type === 'application/pdf' || /^image\//.test(type);
}

function typedBlob(blob, fileName, contentType) {
  if (!blob || blob.size === 0) throw new Error('The file is empty.');
  const type = mimeTypeFor(fileName, blob.type || contentType);
  return { blob: new Blob([blob], { type }), type };
}

function saveUrl(url, fileName) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'document';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Opens a document in a new tab (falls back to download for non-previewable types).
 * `loader` resolves to { blob, contentType }. The tab is opened synchronously so the
 * browser does not block it as a popup.
 */
export async function openDocument(loader, fileName) {
  const previewWindow = window.open('', '_blank');
  try {
    const { blob: raw, contentType } = await loader();
    const { blob, type } = typedBlob(raw, fileName, contentType);
    const url = URL.createObjectURL(blob);
    if (previewWindow && isPreviewable(type)) {
      previewWindow.location.href = url;
    } else {
      previewWindow?.close();
      saveUrl(url, fileName);
    }
    setTimeout(() => URL.revokeObjectURL(url), PREVIEW_URL_TTL_MS);
  } catch (err) {
    previewWindow?.close();
    throw err;
  }
}

export async function downloadDocument(loader, fileName) {
  const { blob: raw, contentType } = await loader();
  const { blob } = typedBlob(raw, fileName, contentType);
  const url = URL.createObjectURL(blob);
  saveUrl(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readApiError(err, fallback) {
  if (!err?.response) {
    return err?.message && !/network|timeout/i.test(err.message)
      ? err.message
      : `${fallback} Please check your connection and try again.`;
  }
  let data = err.response.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const text = await data.text();
      try { data = JSON.parse(text); } catch { data = text; }
    } catch {
      data = null;
    }
  }
  if (data && typeof data === 'object') {
    const message = data.message || data.Message || data.title;
    if (message) return String(message);
    if (data.errors && typeof data.errors === 'object') {
      const first = Object.values(data.errors).flat()[0];
      if (first) return String(first);
    }
  }
  if (typeof data === 'string' && data.trim() && !data.trim().startsWith('<')) return data.trim();
  return fallback;
}
