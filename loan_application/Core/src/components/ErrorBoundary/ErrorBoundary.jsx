import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Core ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ maxWidth: '640px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)' }}>
            <h1 style={{ marginTop: 0, marginBottom: '12px', fontSize: '24px' }}>Something went wrong</h1>
            <p style={{ marginTop: 0, marginBottom: '16px', color: '#475569', lineHeight: 1.6 }}>
              The app failed to render. Open the browser console to see the exact error, then refresh after the issue is fixed.
            </p>
            <pre style={{ margin: 0, padding: '16px', background: '#f1f5f9', borderRadius: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error?.message || 'Unknown error'}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
