/**
 * Safely extracts a meaningful error message from an Axios error object.
 * Priority:
 * 1. Backend error message (error.response.data.message)
 * 2. Fallback message (if provided)
 * 3. Generic fallback
 */
export const getErrorMessage = (error, fallbackMessage = 'An unexpected error occurred') => {
  // Check if we have a backend message string
  const backendMessage = error?.response?.data?.message;
  
  if (backendMessage && typeof backendMessage === 'string' && backendMessage.trim() !== '') {
    return backendMessage.trim();
  }
  
  // If no backend message exists, but it's a network error
  if (error?.request && !error?.response) {
    return 'Network error: Please check your connection.';
  }
  
  // Default fallback
  return fallbackMessage;
};
