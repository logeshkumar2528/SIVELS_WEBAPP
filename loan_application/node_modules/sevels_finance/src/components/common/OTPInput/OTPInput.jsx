import { useState, useRef, useEffect } from 'react';
import './OTPInput.css';

const OTPInput = ({ label, required = false, length = 6, value, onChange, error }) => {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (typeof value === 'string') {
      const newOtp = new Array(length).fill("");
      const valArr = value.split("").slice(0, length);
      valArr.forEach((char, index) => {
        newOtp[index] = char;
      });
      setOtp(newOtp);
    }
  }, [value, length]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);
    onChange(newOtp.join(""));

    // Focus next input
    if (element.nextSibling && element.value !== "") {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index] === "" && inputRefs.current[index - 1]) {
        // Move to previous input on backspace if current is empty
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").slice(0, length).trim();
    if (/^\d+$/.test(pastedData)) {
      const pasteOtp = pastedData.split("");
      const newOtp = [...otp];
      pasteOtp.forEach((char, index) => {
        if (index < length) {
          newOtp[index] = char;
        }
      });
      setOtp(newOtp);
      onChange(newOtp.join(""));
      
      // Focus the next empty input or the last one
      const focusIndex = Math.min(pasteOtp.length, length - 1);
      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex].focus();
      }
    }
  };

  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label">
          {label} {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      <div className="otp-container" onPaste={handlePaste}>
        {otp.map((data, index) => {
          return (
            <input
              className={`otp-input ${error ? 'otp-error' : ''}`}
              type="text"
              name="otp"
              maxLength="1"
              key={index}
              value={data}
              onChange={(e) => handleChange(e.target, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              ref={(ref) => inputRefs.current[index] = ref}
              onFocus={(e) => e.target.select()}
              required={required}
            />
          );
        })}
      </div>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default OTPInput;
