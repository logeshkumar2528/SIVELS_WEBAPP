import './Sidebar.css';
import { 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  Building,
  ShieldCheck,
  Landmark,
  Check
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Personal Information', icon: User, active: true },
  { id: 2, label: 'Contact Information', icon: Phone },
  { id: 3, label: 'Address Information', icon: MapPin },
  { id: 4, label: 'Employment Information', icon: Briefcase },
  { id: 5, label: 'Business Information', icon: Building },
  { id: 6, label: 'Bank', icon: Landmark },
  { id: 7, label: 'KYC Verification', icon: ShieldCheck },
];

const Sidebar = ({ activeStep = 1, onStepClick, completedSteps = [] }) => {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.includes(step.id);
          const priorStepsDone = STEPS.slice(0, idx).every((s) => completedSteps.includes(s.id));
          const isLocked = !isCompleted && !priorStepsDone;

          return (
            <div 
              key={step.id} 
              className={[
                'sidebar-nav-item',
                step.id === activeStep ? 'active' : '',
                isCompleted ? 'completed' : '',
                isLocked ? 'locked' : ''
              ].join(' ').trim()}
              onClick={() => onStepClick && onStepClick(step.id)}
              style={{ cursor: 'pointer' }}
              title={step.label}
            >
              <div className="sidebar-nav-icon-wrapper">
                {isCompleted ? (
                  <Check size={18} className="sidebar-nav-icon" />
                ) : (
                  <Icon size={18} className="sidebar-nav-icon" />
                )}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;