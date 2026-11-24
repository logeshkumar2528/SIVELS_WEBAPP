import { useMemo, useState } from 'react';
import { BriefcaseBusiness, Building2, Landmark, ShieldCheck, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AgentCreate from '../Agent/AgentCreate';
import RelationshipManagerCreate from '../RelationshipManager/RelationshipManagerCreate';
import AMSCreate from '../AMS/AMSCreate';
import BackOfficeCreate from '../BackOffice/BackOfficeCreate';
import CreditManagerCreate from '../CreditManager/CreditManagerCreate';
import CreditHeadCreate from '../CreditHead/CreditHeadCreate';
import InvestorCreate from '../Investor/InvestorCreate';
import OperationsUserCreate from '../Operations/OperationsUserCreate';
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
  creditManager: {
    title: 'Create credit manager',
    description: 'Add a credit manager to evaluate loans and approvals.',
    icon: Landmark,
  },
  creditHead: {
    title: 'Create credit head',
    description: 'Add a senior credit head to oversee credit policies and sanctions.',
    icon: Landmark,
  },
  investor: {
    title: 'Create investor',
    description: 'Add an investor account for loan investments.',
    icon: Landmark,
  },
  operationsMaker: {
    title: 'Create Operations Maker',
    description: 'Add an Operations Maker account using backend role configuration.',
    icon: ShieldCheck,
  },
  operationsChecker: {
    title: 'Create Operations Checker',
    description: 'Add an Operations Checker account using backend role configuration.',
    icon: ShieldCheck,
  },
};

const TYPE_GROUPS = {
  operationsMaker: ['operationsMaker', 'operationsChecker'],
  operationsChecker: ['operationsMaker', 'operationsChecker'],
};

const getAllowedTypes = (requestedType) => {
  if (!requestedType || !USER_TYPES[requestedType]) return Object.keys(USER_TYPES);
  return TYPE_GROUPS[requestedType] || [requestedType];
};

export default function CreateUser() {
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get('type') || '';
  const requestedInvestorId = searchParams.get('investorId') || '';
  const allowedTypes = useMemo(() => getAllowedTypes(requestedType), [requestedType]);
  const isScopedFromDirectory = Boolean(requestedType && USER_TYPES[requestedType]);
  const [userType, setUserType] = useState(
    requestedType && USER_TYPES[requestedType] ? requestedType : ''
  );

  const selectableTypes = useMemo(
    () => allowedTypes.filter((key) => USER_TYPES[key]),
    [allowedTypes]
  );

  const renderContent = () => {
    if (!userType) {
      return (
        <div className="create-user-empty">
          <p className="create-user-empty-title">Choose a profile type to get started</p>
          <p className="create-user-empty-copy">
            Select one of the options below. The appropriate creation form will appear here.
          </p>
          <div className="create-user-options">
            {selectableTypes.map((key) => {
              const option = USER_TYPES[key];
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

    if (userType === 'agent') return <AgentCreate onSuccessRedirect="/agents" />;
    if (userType === 'rm') return <RelationshipManagerCreate />;
    if (userType === 'ams') return <AMSCreate />;
    if (userType === 'backOffice') return <BackOfficeCreate />;
    if (userType === 'creditManager') return <CreditManagerCreate />;
    if (userType === 'creditHead') return <CreditHeadCreate onSuccessRedirect="/credit-heads" />;
    if (userType === 'investor') {
      return (
        <InvestorCreate
          investorId={requestedInvestorId || null}
          onSuccessRedirect="/investors"
        />
      );
    }
    if (userType === 'operationsMaker') return <OperationsUserCreate initialRoleCode="MAKER" />;
    if (userType === 'operationsChecker') return <OperationsUserCreate initialRoleCode="CHECKER" />;
    return null;
  };

  return (
    <main className="create-user-page">
      <section className="create-user-selector">
        <label htmlFor="user-type">What would you like to create?</label>
        <select
          id="user-type"
          value={userType}
          onChange={(event) => setUserType(event.target.value)}
          disabled={isScopedFromDirectory && selectableTypes.length === 1}
        >
          {!isScopedFromDirectory && <option value="">Select user type</option>}
          {selectableTypes.map((key) => (
            <option key={key} value={key}>
              {USER_TYPES[key].title}
            </option>
          ))}
        </select>
      </section>

      {!userType && renderContent()}
      {userType && <div className="create-user-form">{renderContent()}</div>}
    </main>
  );
}
