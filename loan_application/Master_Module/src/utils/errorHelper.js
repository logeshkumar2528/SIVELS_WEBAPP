/**
 * Safely extracts a meaningful error message from an Axios error object.
 * Priority:
 * 1. Backend error message (error.response.data.message)
 * 2. ASP.NET validation field errors (flattened)
 * 3. Fallback message (if provided)
 * 4. Generic fallback
 */
export const getErrorMessage = (error, fallbackMessage = 'An unexpected error occurred') => {
  // Check if we have a backend message string
  const backendMessage = error?.response?.data?.message;
  
  if (backendMessage && typeof backendMessage === 'string' && backendMessage.trim() !== '') {
    return backendMessage.trim();
  }

  const errors = error?.response?.data?.errors;
  if (errors && typeof errors === 'object') {
    const messages = Object.entries(errors)
      .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
      .map((msg) => String(msg || '').trim())
      .filter(Boolean);
    if (messages.length) {
      return messages.join(' ');
    }
  }

  const title = error?.response?.data?.title;
  if (title && typeof title === 'string' && title.trim()) {
    return title.trim();
  }
  
  // If no backend message exists, but it's a network error
  if (error?.request && !error?.response) {
    return 'Network error: Please check your connection.';
  }
  
  // Default fallback
  return fallbackMessage;
};
