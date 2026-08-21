import './FormCard.css';

const FormCard = ({ title, icon: Icon, children, className = '', ...props }) => {
  return (
    <div className={`form-card ${className}`} {...props}>
      <div className="form-card-header">
        <div className="form-card-icon-wrapper">
          {Icon && <Icon size={20} className="form-card-icon" />}
        </div>
        <h3 className="form-card-title">{title}</h3>
      </div>
      <div className="form-card-body">
        {children}
      </div>
    </div>
  );
};

export default FormCard;
