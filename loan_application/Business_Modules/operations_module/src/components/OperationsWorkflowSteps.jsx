import { useNavigate } from 'react-router-dom';
import { buildApplicationRoute, ROUTES } from '../config/routeConfig';
import './OperationsWorkflowSteps.css';

export const OPERATIONS_WORKFLOW_STEPS = [
  { id: 'loan-basic-details', label: 'Loan Basic Details', route: ROUTES.MAKER_LOAN_BASIC_DETAILS },
  { id: 'fees', label: 'Fees', route: ROUTES.MAKER_FEES },
  { id: 'repayment-schedule', label: 'Repayment Schedule', route: ROUTES.MAKER_REPAYMENT_SCHEDULE },
  { id: 'covenants', label: 'Covenants', route: ROUTES.MAKER_COVENANTS },
  { id: 'mandate-details', label: 'Mandate Details', route: ROUTES.MAKER_MANDATE_DETAILS },
  { id: 'cheque-details', label: 'Cheque Details', route: ROUTES.MAKER_CHEQUE_DETAILS },
];

export default function OperationsWorkflowSteps({
  activeStepId,
  applicationId,
  onNavigate,
}) {
  const navigate = useNavigate();

  return (
    <nav className="operations-workflow-steps" aria-label="Application workflow steps">
      {OPERATIONS_WORKFLOW_STEPS.map((step, index) => {
        const isActive = step.id === activeStepId;
        return (
          <button
            key={step.id}
            type="button"
            className={['operations-workflow-step', isActive ? 'is-active' : ''].join(' ').trim()}
            aria-current={isActive ? 'step' : undefined}
            disabled={!step.route}
            onClick={() => {
              if (!step.route || isActive) return;
              if (onNavigate) {
                onNavigate(step.route);
                return;
              }
              navigate(buildApplicationRoute(step.route, applicationId));
            }}
          >
            <span className="operations-workflow-step-number">{index + 1}</span>
            <span className="operations-workflow-step-label">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
