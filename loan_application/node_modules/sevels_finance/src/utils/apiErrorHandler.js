export const getApiErrorMessage = (error) => {
  if (!error.response) {
    return { global: "Unable to connect to the server. Please try again." };
  }

  const status = error.response.status;
  const data = error.response.data;

  if (status === 401) {
    return { global: "Your session has expired. Please log in again." };
  }
  if (status === 403) {
    return { global: "You do not have permission to perform this action." };
  }
  if (status === 500) {
    return { global: "Something went wrong on the server. Please try again." };
  }
  if (status === 409) {
    return { global: data?.message || "A conflict occurred. This record might already exist." };
  }
  if (status === 404) {
    return { global: data?.message || "The requested resource was not found." };
  }
  if (status === 400) {
    if (data?.errors && typeof data.errors === 'object') {
      // It's an ASP.NET validation dictionary
      const fieldErrors = {};
      let hasFieldErrors = false;
      for (const [key, value] of Object.entries(data.errors)) {
        // camelCase the key
        const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
        fieldErrors[camelKey] = Array.isArray(value) ? value[0] : value;
        hasFieldErrors = true;
      }
      
      return hasFieldErrors 
        ? { fields: fieldErrors, global: data?.title || "Please fix the validation errors." }
        : { global: data?.message || data?.title || "Validation failed." };
    }
    
    // Simple message
    return { global: data?.message || data?.title || data?.detail || "Validation failed. Please check your input." };
  }

  return { global: data?.message || "Unable to save customer. Please check the entered details." };
};
