import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { MasterModal } from "../../../components/masters/MasterModal/MasterModal";
import { createMaritalStatus, updateMaritalStatus, getMaritalStatusById } from "../../../api/masters/maritalStatusApi";
import { getCurrentUserId } from "../../../utils/authHelper";
import { getErrorMessage } from "../../../utils/errorHelper";
import { MasterStatusCheckbox } from "../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox";
import "./MaritalStatus.css";

export function MaritalStatusForm({ isOpen, onClose, onSuccess, initialData }) {
  const [maritalStatusCode, setMaritalStatusCode] = useState("");
  const [maritalStatusName, setMaritalStatusName] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadData = async () => {
      if (initialData) {
        setIsLoading(true);
        try {
          if (!initialData.maritalStatusId) {
            throw new Error("Missing maritalStatusId on selected record");
          }
          const response = await getMaritalStatusById(initialData.maritalStatusId);
          const record = response?.value || response?.data || response;
          if (isMounted) {
            setMaritalStatusCode(record.maritalStatusCode || "");
            setMaritalStatusName(record.maritalStatusName || "");
            const activeVal = record.isActive;
            setIsActive(activeVal === true || activeVal === 1 || activeVal === "1");
          }
        } catch (err) {
          if (isMounted) {
            const errorMessage = getErrorMessage(err, "Failed to load latest record data.");
            toast.error(errorMessage);
            onClose();
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        setMaritalStatusCode("");
        setMaritalStatusName("");
        setIsActive(true);
      }
      setError(null);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedCode = maritalStatusCode.trim();
    const trimmedName = maritalStatusName.trim();

    if (!trimmedCode) {
      setError("Marital Status Code is required");
      return;
    }
    
    if (!trimmedName) {
      setError("Marital Status Name is required");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          maritalStatusId: initialData.maritalStatusId,
          maritalStatusCode: trimmedCode,
          maritalStatusName: trimmedName,
          modifiedBy: getCurrentUserId() || 1,
          isActive
        };
        await updateMaritalStatus(initialData.maritalStatusId, payload);
        toast.success("Updated successfully");
      } else {
        const payload = {
          maritalStatusCode: trimmedCode,
          maritalStatusName: trimmedName,
          isActive,
          createdBy: getCurrentUserId() || 1
        };
        await createMaritalStatus(payload);
        toast.success("Created successfully");
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Form submission failed:", err);
      
      if (err.response?.status === 409) {
        const backendMsg = err.response?.data?.message || (typeof err.response?.data === "string" ? err.response.data : null);
        const errorText = backendMsg || "Marital Status Code or Name already exists.";
        setError(errorText);
        toast.error(errorText);
      } else if (err.response?.status === 400 && err.response?.data?.ModelState) {
        setError("Validation failed. Please check your input.");
      } else {
        const errorMessage = getErrorMessage(err, "Request failed");
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MasterModal isOpen={isOpen} onClose={onClose} title="Loading...">
        <div style={{ padding: "var(--spacing-xl)", textAlign: "center" }}>Loading record...</div>
      </MasterModal>
    );
  }

  return (
    <MasterModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? "Edit Marital Status" : "Add Marital Status"}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="maritalStatusCode" className="form-label">
            Marital Status Code <span className="text-danger">*</span>
          </label>
          <input
            id="maritalStatusCode"
            type="text"
            className={`form-input ${error && error.includes("Code") ? "form-input-error" : ""}`}
            value={maritalStatusCode}
            onChange={(e) => {
              setMaritalStatusCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. S"
            disabled={isSubmitting}
          />
          {error && error.includes("Code") && <span className="form-error-msg">{error}</span>}
        </div>
      
        <div className="form-group">
          <label htmlFor="maritalStatusName" className="form-label">
            Marital Status Name <span className="text-danger">*</span>
          </label>
          <input
            id="maritalStatusName"
            type="text"
            className={`form-input ${error && error.includes("Name") ? "form-input-error" : ""}`}
            value={maritalStatusName}
            onChange={(e) => {
              setMaritalStatusName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Single"
            disabled={isSubmitting}
          />
          {error && error.includes("Name") && <span className="form-error-msg">{error}</span>}
        </div>

        <MasterStatusCheckbox 
          isActive={isActive} 
          onChange={setIsActive} 
          disabled={isSubmitting} 
        />

        <div className="form-actions">
          <button 
            type="button" 
            className="masters-btn-secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="masters-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (isEdit ? "Updating..." : "Saving...") : (isEdit ? "Update" : "Save")}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
