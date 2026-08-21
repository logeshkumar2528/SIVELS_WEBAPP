import './ProgressStepper.css';

const ProgressStepper = ({ steps, currentStep }) => {
  return (
    <div className="stepper-container">
      {steps.map((step, index) => {
        const isCompleted = index + 1 < currentStep;
        const isActive = index + 1 === currentStep;
        
        return (
          <div key={index} className="step-wrapper">
            <div className="step-content">
              <div 
                className={`step-circle ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                {isCompleted ? (
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className={`step-label ${isActive || isCompleted ? 'label-active' : ''}`}>
                {step.label}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div className={`step-line ${isCompleted ? 'line-completed' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressStepper;
