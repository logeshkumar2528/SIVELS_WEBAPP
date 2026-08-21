import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const MOCK_ACTIVITIES = [];

const RecentActivity = () => {
  const getIconColor = (type) => {
    switch(type) {
      case 'success': return '#059669';
      case 'pending': return '#d97706';
      case 'warning': return '#dc2626';
      default: return '#64748b';
    }
  };

  const getIconBg = (type) => {
    switch(type) {
      case 'success': return '#ecfdf5';
      case 'pending': return '#fffbeb';
      case 'warning': return '#fef2f2';
      default: return '#f1f5f9';
    }
  };

  return (
    <div className="std-container" style={{ padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.25rem' }}>Recent Activity</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {MOCK_ACTIVITIES.length === 0 ? (
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>No recent activity.</p>
        ) : (
          MOCK_ACTIVITIES.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: getIconBg(activity.type), color: getIconColor(activity.type) }}>
                  <Icon size={14} />
                </div>
                <div>
                  <p style={{ margin: '0 0 0.125rem 0', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>{activity.title}</p>
                  <p style={{ margin: '0', fontSize: '0.75rem', color: '#64748b' }}>{activity.date}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecentActivity;

