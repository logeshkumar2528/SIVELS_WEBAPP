import { useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, Building2, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AgentCreate from '../Agent/AgentCreate';
import RelationshipManagerCreate from '../RelationshipManager/RelationshipManagerCreate';
import AMSCreate from '../AMS/AMSCreate';
import BackOfficeCreate from '../BackOffice/BackOfficeCreate';
import './CreateUser.css';

const USER_TYPES = {
  agent: {
    title: 'Create agent',
    description: 'Add and assign a lending partner.',
    icon: BriefcaseBusiness,
  },
  rm: {
    title: 'Create relationship manager',
    description: 'Add a member to your RM network.',
    icon: Users,
  },
  ams: {
    title: 'Create AMS',
    description: 'Build an AMS account with multiple district access.',
    icon: ShieldCheck,
  },
  backOffice: {
    title: 'Create back office',
    description: 'Set up a back office officer with the RM-style workflow.',
    icon: Building2,
  },
};

export default function CreateUser() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState('');

  const renderContent = () => {
    if (!userType) {
      return (
        <div className="create-user-empty">
          <p className="create-user-empty-title">Choose a profile type to get started</p>
          <p className="create-user-empty-copy">
            Select one of the options below. The appropriate creation form will appear here.
          </p>
          <div className="create-user-options">
            {Object.entries(USER_TYPES).map(([key, option]) => {
              const Icon = option.icon;
              return (
                <button key={key} type="button" onClick={() => setUserType(key)}>
                  <Icon size={20} />
                  <span>
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
                  </span>
                  <b>→</b>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (userType === 'agent') return <AgentCreate onSuccessRedirect="/dashboard" />;
    if (userType === 'rm') return <RelationshipManagerCreate />;
    if (userType === 'ams') return <AMSCreate />;
    if (userType === 'backOffice') return <BackOfficeCreate />;
    return <AMSCreate />;
  };

  return (
    <main className="create-user-page">
      <button className="create-user-back" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <header className="create-user-header">
        <div className="create-user-icon">
          <UserPlus size={24} />
        </div>
        <div>
          <span>USER MANAGEMENT</span>
          <h1>Create user</h1>
          <p>Choose a user type to begin creating a profile.</p>
        </div>
      </header>

      <section className="create-user-selector">
        <label htmlFor="user-type">What would you like to create?</label>
        <select id="user-type" value={userType} onChange={(event) => setUserType(event.target.value)}>
          <option value="">Select user type</option>
          <option value="agent">Create agent</option>
          <option value="rm">Create relationship manager</option>
          <option value="ams">Create AMS</option>
          <option value="backOffice">Create back office</option>
        </select>
      </section>

      {!userType && renderContent()}
      {userType && <div className="create-user-form">{renderContent()}</div>}
    </main>
  );
}
