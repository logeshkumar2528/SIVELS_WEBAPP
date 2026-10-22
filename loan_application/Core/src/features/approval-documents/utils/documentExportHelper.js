/**
 * documentExportHelper.js
 * -----------------------
 * Shared formatting and export helpers for approval documents (KFS, Sanction Letter).
 * Provides clean primitives for value display and Print / Download PDF functionality.
 */

import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import LogoImage from '../../../assets/branding/SivelsFinanceLogo.jpg';
import approvalDocumentService from '../services/approvalDocumentService';

export const BRAND_NAME = 'Sivels Finance';
export { LogoImage };

/* ── Values ────────────────────────────────────────────────────────── */

export const toList = (res) => {
  if (Array.isArray(res)) return res;
  const inner = res?.value ?? res?.data ?? res?.items ?? res?.assets;
  return Array.isArray(inner) ? inner : [];
};

export const settledValue = (result) => (result?.status === 'fulfilled' ? result.value : null);

export const getMaster = async (path) => approvalDocumentService.getMaster(path);

export const firstRecord = (v) => (Array.isArray(v) ? v[0] : v) || null;

export const nameById = (list, idKey, nameKey, id) => {
  if (id == null || id === '') return null;
  const row = (list || []).find((item) => String(item?.[idKey]) === String(id));
  return row ? row[nameKey] : null;
};

export const isBlank = (v) =>
  v == null ||
  (typeof v === 'string' && ['', 'not available', 'n/a', '—'].includes(v.trim().toLowerCase()));

export const pick = (obj, keys) => {
  if (!obj) return null;
  for (const key of keys) {
    if (!isBlank(obj[key])) return obj[key];
  }
  return null;
};

export const dash = (v) => (isBlank(v) ? '' : v);

export const toNumber = (v) => {
  if (isBlank(v)) return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export const fmtINR = (v) => {
  const n = toNumber(v);
  return n == null ? '' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtNum = (v, digits = 2) => {
  const n = toNumber(v);
  return n == null ? '' : n.toFixed(digits);
};

export const fmtPercent = (v) => {
  const n = toNumber(v);
  return n == null ? '' : `${n.toFixed(2)}%`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtDate = (v) => {
  if (isBlank(v)) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

export const fmtDateTime = (v) => {
  if (isBlank(v)) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((p) => String(p).padStart(2, '0')).join(':');
  return `${fmtDate(v)} ${time}`;
};

/* ── Export Hook ───────────────────────────────────────────────────── */

export function usePrintAndPdf(ref, { title, fileName }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const handlePrint = useCallback(() => {
    const root = ref.current;
    if (!root) return;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');
    doc.open();
    doc.write(`<!doctype html><html><head><title>${title}</title>${styles}</head><body style="margin:0;background:#fff">${root.outerHTML}</body></html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 500);
    }, 400);
  }, [ref, title]);

  const handleDownloadPdf = useCallback(async () => {
    const root = ref.current;
    if (!root) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const pages = Array.from(root.querySelectorAll('.cam-page'));
      let pdf = null;
      for (const page of pages) {
        const canvas = await html2canvas(page, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
        const width = 210;
        const imgHeight = (canvas.height * width) / canvas.width;
        const height = Math.max(297, imgHeight);
        if (!pdf) {
          pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [width, height], compress: true });
        } else {
          pdf.addPage([width, height], 'portrait');
        }
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, width, imgHeight, undefined, 'FAST');
      }
      pdf?.save(fileName);
    } catch (err) {
      console.error(`[${title}] Failed to generate PDF:`, err);
      setExportError('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [ref, title, fileName]);

  return { handlePrint, handleDownloadPdf, isExporting, exportError };
}
