/**
 * StepProgress
 * --------------------
 * Purpose:
 *   Numbered step progress indicator for all multi-step application workflows.
 *   Used across Document Verification, PAN Verification, CIBIL, Bank Verification,
 *   Loan Documents, Final Approval, and Disbursement pages.
 *
 * Responsibilities:
 *   - Render step circles connected by lines.
 *   - Visually distinguish completed, active, and upcoming steps.
 *   - Never contain workflow logic — only render what is passed.
 *
 * Props:
 *   steps      {Array<{ id: string, label: string }>} — All workflow steps
 *   activeStep {number} — 1-indexed active step number
 */

import { memo } from 'react';
import iconMap from '../../config/iconMap';
import './StepProgress.css';

const StepProgress = memo(function StepProgress({ steps = [], activeStep = 1 }) {
  const CheckIcon = iconMap['Check'];

  return (
    <div className="step-progress" role="list" aria-label="Application workflow">
      {steps.map((step, index) => {
        const stepNumber  = index + 1;
        const isFirst     = index === 0;
        const isLast      = index === steps.length - 1;
        const isCompleted = stepNumber < activeStep;
        const isActive    = stepNumber === activeStep;

        const itemClass = [
          'step-progress-item',
          isActive    ? 'step-progress-item--active'    : '',
          isCompleted ? 'step-progress-item--completed' : '',
        ].filter(Boolean).join(' ');

        return (
          <div
            key={step.id}
            className={itemClass}
            role="listitem"
            aria-current={isActive ? 'step' : undefined}
          >
            {/* ---- Connector row (circle + lines) ---- */}
            <div className="step-progress-top">
              {/* Left connector line */}
              {!isFirst && (
                <div
                  className={[
                    'step-connector',
                    isCompleted ? 'step-connector--done' : '',
                  ].join(' ').trim()}
                  aria-hidden="true"
                />
              )}

              {/* Step circle */}
              <div
                className="step-progress-circle"
                aria-label={`Step ${stepNumber}: ${step.label}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}`}
              >
                {isCompleted
                  ? CheckIcon && <CheckIcon size={12} strokeWidth={3} />
                  : stepNumber
                }
              </div>

              {/* Right connector line */}
              {!isLast && (
                <div
                  className={[
                    'step-connector',
                    isCompleted ? 'step-connector--done' : '',
                  ].join(' ').trim()}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* ---- Label ---- */}
            <span className="step-progress-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
});

export default StepProgress;
