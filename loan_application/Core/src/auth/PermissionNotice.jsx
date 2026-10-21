import React, { useEffect, useRef, useState } from 'react';
import { FORBIDDEN_EVENT } from './authEvents';

const containerStyle = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 100000,
  maxWidth: 360,
  padding: '12px 16px',
  borderRadius: 8,
  background: '#fff4f4',
  border: '1px solid #f5c2c7',
  color: '#842029',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
  fontSize: 14,
  lineHeight: 1.4,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
};

const closeStyle = {
  marginLeft: 'auto',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  padding: 0,
};

export default function PermissionNotice() {
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    const onForbidden = (event) => {
      setMessage(event.detail?.message || "You don't have permission to perform this action.");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setMessage(''), 4000);
    };
    window.addEventListener(FORBIDDEN_EVENT, onForbidden);
    return () => {
      window.removeEventListener(FORBIDDEN_EVENT, onForbidden);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!message) return null;

  return (
    <div role="alert" style={containerStyle}>
      <span>{message}</span>
      <button type="button" aria-label="Dismiss" style={closeStyle} onClick={() => setMessage('')}>
        ×
      </button>
    </div>
  );
}
