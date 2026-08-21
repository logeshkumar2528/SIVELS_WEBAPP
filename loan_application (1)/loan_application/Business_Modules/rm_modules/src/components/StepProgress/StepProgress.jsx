import { memo } from 'react';
import iconMap from '../../config/iconMap';
import './StepProgress.css';

const StepProgress = memo(function StepProgress({ steps = [], activeStep = 1, onStepClick }) {
  const CheckIcon = iconMap['Check'];

  return (
    <div className="step-progress-card" role="list" aria-label="Application workflow">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isLast = index === steps.length - 1;
        const isCompleted = stepNumber < activeStep;
        const isActive = stepNumber === activeStep;

        return (
          <div key={step.id} className="step-unit">
            <div
              className={`step-node ${isActive ? 'step-node--active' : ''} ${isCompleted ? 'step-node--completed' : ''} ${onStepClick ? 'step-node--clickable' : ''}`}
              onClick={() => onStepClick && onStepClick(stepNumber)}
            >
              <div className="step-circle">
                {isCompleted ? (
                  CheckIcon && <CheckIcon size={12} strokeWidth={3} />
                ) : (
                  stepNumber
                )}
              </div>
              <span className="step-label">{step.label}</span>
            </div>

            {!isLast && (
              <div className={`step-dot-line ${isCompleted ? 'step-dot-line--done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
});

export default StepProgress;
