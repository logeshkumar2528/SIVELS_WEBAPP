import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteRateOfInterest } from '../../../api/masters/rateOfInterestApi';
import { getErrorMessage } from '../../../utils/errorHelper';

const getRateOfInterestId = (record) => record?.rateOfInterestId ?? record?.RateOfInterestId;
const getInterestCode = (record) => record?.interestCode ?? record?.InterestCode ?? '';

export function RateOfInterestDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    const rateOfInterestId = getRateOfInterestId(record);
    if (rateOfInterestId == null) {
      console.error('Missing rateOfInterestId for deletion');
      return;
    }
    
    setIsDeleting(true);
    setError('');
    
    try {
      await deleteRateOfInterest(rateOfInterestId);
      toast.success('Deleted successfully');
      onSuccess();
    } catch (err) {
      console.error('Delete failed:', err);
      const errorMessage = getErrorMessage(err, 'An error occurred while deleting.');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Rate Of Interest"
    >
      <div className="master-delete-confirm">
        <div className="master-delete-icon-wrapper">
          <AlertTriangle size={32} className="master-delete-icon" />
        </div>
        
        <h3 className="master-delete-title">Are you absolutely sure?</h3>
        
        <p className="master-delete-text">
          This action cannot be undone. This will permanently delete the rate of interest code 
          <strong className="master-delete-highlight"> {getInterestCode(record)} </strong>
          and remove its data from our servers.
        </p>

        {error && <div className="master-form-error">{error}</div>}

        <div className="master-delete-actions">
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="masters-btn-danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Yes, delete rate of interest'}
          </button>
        </div>
      </div>
    </MasterModal>
  );
}
