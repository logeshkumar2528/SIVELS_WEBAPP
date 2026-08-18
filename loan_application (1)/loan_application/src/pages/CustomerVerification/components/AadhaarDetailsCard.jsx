import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Button from '../../../components/common/Button/Button';

const AadhaarDetailsCard = ({ data }) => {
  const [expanded, setExpanded] = useState(false);

  const fields = [
    { label: 'Aadhaar Number', value: data.maskedNumber },
    { label: 'Customer Name', value: data.name },
    { label: "Father's Name", value: data.fatherName },
    { label: 'Date of Birth', value: data.dob },
    { label: 'Gender', value: data.gender },
    { label: 'Address', value: data.address },
  ];

  return (
    <div className="kyc-details">
      <div className="kyc-details-head">
        <span className="kyc-details-check"><CheckCircle2 size={20} /></span>
        <span className="kyc-details-title">Aadhaar Verified</span>
      </div>

      {expanded && (
        <dl className="kyc-details-grid">
          {fields.map((field) => (
            <div className={`kyc-details-item ${field.isWide ? 'kyc-details-item--wide' : ''}`} key={field.label}>
              <dt className="kyc-details-label">{field.label}</dt>
              <dd className="kyc-details-value">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <Button variant="outline" onClick={() => setExpanded(!expanded)} style={{ marginTop: '1rem' }}>
        {expanded ? 'Hide Details' : 'View Details'}
      </Button>
    </div>
  );
};

export default AadhaarDetailsCard;
