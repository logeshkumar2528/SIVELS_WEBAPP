import { UserCircle, FileCheck, Landmark, Bell } from 'lucide-react';

const SummaryCards = ({ customerState }) => {
  const { profileCompleted, kycCompleted, notifications } = customerState;

  const cardStyle = {
    backgroundColor: '#fff',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  };

  const iconWrapperStyle = (bgColor, color) => ({
    width: '3rem',
    height: '3rem',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bgColor,
    color: color
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={iconWrapperStyle('#eff6ff', '#2563eb')}>
          <UserCircle size={24} />
        </div>
        <div>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Profile Status</p>
          <h3 style={{ margin: '0', fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>{profileCompleted ? 'Completed' : 'Pending'}</h3>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={iconWrapperStyle('#ecfdf5', '#059669')}>
          <FileCheck size={24} />
        </div>
        <div>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>KYC Status</p>
          <h3 style={{ margin: '0', fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>{kycCompleted ? 'Completed' : 'Pending'}</h3>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={iconWrapperStyle('#fef3c7', '#d97706')}>
          <Landmark size={24} />
        </div>
        <div>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Loan Status</p>
          <h3 style={{ margin: '0', fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>No Loan</h3>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={iconWrapperStyle('#fef2f2', '#dc2626')}>
          <Bell size={24} />
        </div>
        <div>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Notifications</p>
          <h3 style={{ margin: '0', fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>{notifications} Unread</h3>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;

