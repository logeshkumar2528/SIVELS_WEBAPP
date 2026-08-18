import { memo } from 'react';
import iconMap from '../../config/iconMap';
import StatusBadge from '../StatusBadge/StatusBadge';
import './InfoBar.css';

const InfoBar = memo(function InfoBar({
  appId = 'APP25060500024',
  agentName = 'Thiru (AGT0001)',
  branch = 'KK Nagar',
  submittedTime = '05 Jun 2025, 10:25 AM',
  status = 'New',
}) {
  const FileTextIcon = iconMap['FileText'];
  const UserIcon = iconMap['User'];
  const MapPinIcon = iconMap['MapPin'];
  const CalendarIcon = iconMap['Calendar'];

  return (
    <div className="infobar-container">
      <div className="infobar-col">
        <span className="infobar-label">Application ID</span>
        <div className="infobar-value-group">
          {FileTextIcon && <FileTextIcon size={14} />}
          <span className="infobar-value">{appId}</span>
        </div>
      </div>

      <div className="infobar-divider" />

      <div className="infobar-col">
        <span className="infobar-label">Submitted By (Agent)</span>
        <div className="infobar-value-group highlight">
          {UserIcon && <UserIcon size={14} />}
          <span className="infobar-value">{agentName}</span>
        </div>
      </div>

      <div className="infobar-divider" />

      <div className="infobar-col">
        <span className="infobar-label">Area / Branch</span>
        <div className="infobar-value-group">
          {MapPinIcon && <MapPinIcon size={14} />}
          <span className="infobar-value">{branch}</span>
        </div>
      </div>

      <div className="infobar-divider" />

      <div className="infobar-col">
        <span className="infobar-label">Submitted Time</span>
        <div className="infobar-value-group">
          {CalendarIcon && <CalendarIcon size={14} />}
          <span className="infobar-value">{submittedTime}</span>
        </div>
      </div>

      <div className="infobar-divider" />

      <div className="infobar-status-wrap">
        <span className="infobar-label">Status</span>
        <StatusBadge status={status} />
      </div>
    </div>
  );
});

export default InfoBar;
