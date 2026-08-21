import { useNavigate } from 'react-router-dom';
import { User, FileText, Send, Clock } from 'lucide-react';

const QuickActions = ({ customerState }) => {
  const navigate = useNavigate();
  const { profileCompleted, kycCompleted } = customerState;

  const isLoanEnabled = profileCompleted && kycCompleted;

  // Determine highlight logic based on business rules
  const highlightProfile = !profileCompleted;
  const highlightKyc = profileCompleted && !kycCompleted;

  const actionCardStyle = (isHighlighted, disabled) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: isHighlighted ? '#eff6ff' : '#fff',
    border: `1px solid ${isHighlighted ? '#bfdbfe' : '#e5e7eb'}`,
    borderRadius: '0.5rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s ease',
    width: '100%',
    textAlign: 'left'
  });

  const iconStyle = (isHighlighted) => ({
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isHighlighted ? '#bfdbfe' : '#f1f5f9',
    color: isHighlighted ? '#2563eb' : '#64748b'
  });

  const badgeStyle = (type) => ({
    marginLeft: 'auto',
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '9999px',
    fontWeight: '500',
    backgroundColor: type === 'success' ? '#dcfce7' : '#fef3c7',
    color: type === 'success' ? '#166534' : '#92400e'
  });

  return (
    <div className="std-container" style={{ padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.25rem' }}>Quick Actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
        
        {/* Complete Profile Action */}
        <button 
          style={actionCardStyle(highlightProfile, false)}
          onClick={() => navigate('/customer/profile')}
        >
          <div style={iconStyle(highlightProfile)}>
            <User size={20} />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Complete Profile</span>
          {profileCompleted && <span style={badgeStyle('success')}>Done</span>}
        </button>

        {/* Complete KYC Action */}
        <button 
          style={actionCardStyle(highlightKyc, false)}
          onClick={() => navigate('/customer/verification')}
        >
          <div style={iconStyle(highlightKyc)}>
            <FileText size={20} />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Complete KYC</span>
          {kycCompleted && <span style={badgeStyle('success')}>Done</span>}
        </button>

        {/* Apply Loan Action */}
        <button 
          style={actionCardStyle(false, !isLoanEnabled)}
          onClick={() => isLoanEnabled && navigate('/customer/apply-loan')}
          disabled={!isLoanEnabled}
        >
          <div style={iconStyle(false)}>
            <Send size={20} />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Apply Loan</span>
          {!isLoanEnabled && <span style={badgeStyle('pending')}>Requires KYC</span>}
        </button>

        {/* My Applications Action */}
        <button 
          style={actionCardStyle(false, false)}
          onClick={() => navigate('/customer/applications')}
        >
          <div style={iconStyle(false)}>
            <Clock size={20} />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>My Applications</span>
        </button>

      </div>
    </div>
  );
};

export default QuickActions;

