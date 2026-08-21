export const validateEmail = (email) => {
  if (!email) {
    return "Email address is required";
  }
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  
  return "";
};

export const validateMobile = (mobile) => {
  if (!mobile) {
    return "Mobile number is required";
  }
  
  const mobileRegex = /^[0-9]{10}$/;
  if (!mobileRegex.test(mobile.replace(/\s+/g, ''))) {
    return "Please enter a valid 10-digit mobile number";
  }
  
  return "";
};
