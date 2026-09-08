import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteFOIR } from '../../../api/masters/foirApi';
import { getErrorMessage } from '../../../utils/errorHelper';

const getId = (row) => row?.foirId ?? row?.FoirId ?? row?.id;

export function FOIRDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const handleDelete = async () => {
    try {
      await deleteFOIR(getId(record));
      toast.success('FOIR deleted successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to delete FOIR record.'));
    }
  };

  return (
    <MasterModal isOpen={isOpen} onClose={onClose} title="Delete FOIR?">
      <p>Are you sure you want to delete this FOIR record?</p>
      <div className="form-actions">
        <button type="button" className="masters-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="masters-btn-danger" onClick={handleDelete}>Delete</button>
      </div>
    </MasterModal>
  );
}
