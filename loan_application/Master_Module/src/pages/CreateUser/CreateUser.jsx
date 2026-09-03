import { useState } from 'react';
import { ArrowLeft, UserPlus, BriefcaseBusiness, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddAgent from '../../../../Business_Modules/rm_modules/src/pages/AddAgent/AddAgent';
import RelationshipManagerCreate from '../RelationshipManager/RelationshipManagerCreate';
import './CreateUser.css';

export default function CreateUser() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState('');
  return <main className="create-user-page">
    <button className="create-user-back" onClick={() => navigate('/dashboard')}><ArrowLeft size={16} /> Back to dashboard</button>
    <header className="create-user-header"><div className="create-user-icon"><UserPlus size={24} /></div><div><span>USER MANAGEMENT</span><h1>Create user</h1><p>Choose a user type to begin creating a profile.</p></div></header>
    <section className="create-user-selector"><label htmlFor="user-type">What would you like to create?</label><select id="user-type" value={userType} onChange={(event) => setUserType(event.target.value)}><option value="">Select user type</option><option value="agent">Create agent</option><option value="rm">Create relationship manager</option></select></section>
    {!userType && <div className="create-user-empty"><p className="create-user-empty-title">Choose a profile type to get started</p><p className="create-user-empty-copy">Select one of the options below. The appropriate creation form will appear here.</p><div className="create-user-options"><button onClick={() => setUserType('agent')}><BriefcaseBusiness size={20} /><span><strong>Create agent</strong><small>Add and assign a lending partner.</small></span><b>→</b></button><button onClick={() => setUserType('rm')}><Users size={20} /><span><strong>Create relationship manager</strong><small>Add a member to your RM network.</small></span><b>→</b></button></div></div>}
    {userType && <div className="create-user-form">{userType === 'agent' ? <AddAgent onSuccessRedirect="/dashboard" /> : <RelationshipManagerCreate />}</div>}
  </main>;
}
