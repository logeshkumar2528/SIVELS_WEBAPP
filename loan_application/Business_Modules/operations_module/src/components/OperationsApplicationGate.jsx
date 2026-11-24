import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OperationsLayout from '../layouts/OperationsLayout';
import { ROUTES } from '../config/routeConfig';
import { useOperationsApplication } from '../context/OperationsApplicationContext';

const stateStyle = {
  maxWidth: '720px',
  margin: '40px auto',
  padding: '28px',
  background: '#fff',
  border: '1px solid #d8e7dc',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(22, 71, 43, 0.08)',
  textAlign: 'center',
  color: '#234b34',
};

export default function OperationsApplicationGate({ children, title = 'Maker workflow' }) {
  const navigate = useNavigate();
  const { status, error, retry } = useOperationsApplication();

  if (status === 'ready') return children;

  const isLoading = status === 'loading' || status === 'idle';
  return (
    <OperationsLayout title={title} subtitle="Operations Maker workflow">
      <div style={stateStyle} role={isLoading ? 'status' : 'alert'}>
        <h2>{isLoading ? 'Loading application' : 'Application unavailable'}</h2>
        <p>{isLoading ? 'Validating the selected application…' : error}</p>
        {!isLoading && (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={retry} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={15} aria-hidden="true" />
              Retry
            </button>
            <button type="button" onClick={() => navigate(ROUTES.MAKER_PENDING_APPLICATIONS)}>
              Back to Pending Applications
            </button>
          </div>
        )}
      </div>
    </OperationsLayout>
  );
}
