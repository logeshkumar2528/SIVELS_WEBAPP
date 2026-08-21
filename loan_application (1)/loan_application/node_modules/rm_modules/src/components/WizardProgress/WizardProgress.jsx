import { memo } from 'react';
import iconMap from '../../config/iconMap';
import './WizardProgress.css';

const WizardProgress = memo(function WizardProgress({ steps = [], activeStep = 1, onStepClick }) {
  const CheckIcon = iconMap['Check'];

  return (
    <nav className="wizard-progress" aria-label="RM application sections">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < activeStep;
        const isActive = stepNumber === activeStep;
        const isClickable = typeof onStepClick === 'function' && step.route;

        return (
          <button
            key={step.id}
            type="button"
            className={[
              'wizard-progress__step',
              isActive ? 'wizard-progress__step--active' : '',
              isCompleted ? 'wizard-progress__step--completed' : '',
              isClickable ? 'wizard-progress__step--clickable' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => isClickable && onStepClick(step)}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className="wizard-progress__index">
              {isCompleted ? (CheckIcon ? <CheckIcon size={11} strokeWidth={3} /> : 'OK') : stepNumber}
            </span>
            <span className="wizard-progress__label">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
});

export default WizardProgress;
