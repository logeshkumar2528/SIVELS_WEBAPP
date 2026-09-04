import React from 'react';
import ErrorPopup from '../ErrorPopup/ErrorPopup';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("RM Module Boundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPopup
          show
          title="Application Error"
          message="The application encountered an unexpected error. Please reload the page and try again."
          variant="error"
          onClose={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
