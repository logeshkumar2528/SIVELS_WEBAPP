import { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../../../../Core/src/api/apiFetch';
import { API_BASE_URL } from '../../../../../Core/src/api/apiConfig';
import { getCurrentRMContext } from '../../utils/rmContext';
import {
  fetchCachedWorkflowRecord,
  getRmWizardEligibility,
  isApplicationOwnedByRm,
} from '../../utils/rmWorkflowEligibility';
import { ROUTES } from '../../config/routeConfig';
import './RmWorkflowGuard.css';

export default function RmWorkflowGuard({ children }) {
  const { applicationId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isViewMode = searchParams.get('mode') === 'view';
  const requestKey = `${applicationId || ''}:${isViewMode ? 'view' : 'edit'}`;
  const [state, setState] = useState({ key: '', loading: true, allowed: false, reason: '' });

  useEffect(() => {
    let active = true;
    const rmId = getCurrentRMContext()?.rmId;

    fetchCachedWorkflowRecord({
      applicationId,
      fetcher: apiFetch,
      apiBase: API_BASE_URL,
    })
      .then((record) => {
        if (!active) return;
        const eligibility = getRmWizardEligibility(record, rmId);
        const ownedByRm = isApplicationOwnedByRm(record, rmId);
        setState({
          key: requestKey,
          loading: false,
          allowed: ownedByRm && (isViewMode || eligibility.allowed),
          reason: ownedByRm ? eligibility.reason : 'This application is not assigned to the authenticated RM.',
        });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          key: requestKey,
          loading: false,
          allowed: false,
          reason: error.message || 'Unable to verify application workflow. Please return to the application queue.',
        });
      });

    return () => {
      active = false;
    };
  }, [applicationId, isViewMode, requestKey]);

  if (state.loading || state.key !== requestKey) {
    return (
      <div className="rm-workflow-guard" role="status">
        Checking application workflow access…
      </div>
    );
  }

  if (!state.allowed) {
    const fallbackRoute = location.state?.returnTo || ROUTES.PENDING_APPLICATIONS;
    return (
      <div className="rm-workflow-guard rm-workflow-guard--blocked" role="alert">
        <h2>Application is not ready for RM verification</h2>
        <p>{state.reason}</p>
        <Navigate to={fallbackRoute} replace state={{ workflowGuardMessage: state.reason }} />
      </div>
    );
  }

  return children;
}
