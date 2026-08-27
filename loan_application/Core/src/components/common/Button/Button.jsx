import './Button.css';
import { Loader2 } from 'lucide-react';

const Button = ({ 
  children, 
  variant = 'primary', 
  type = 'button', 
  disabled = false, 
  loading = false, 
  onClick, 
  className = '',
  icon: Icon
}) => {
  const baseClass = `btn btn-${variant} ${className}`;
  
  return (
    <button 
      type={type} 
      className={baseClass} 
      disabled={disabled || loading} 
      onClick={onClick}
    >
      {loading ? (
        <Loader2 className="btn-icon spin" size={20} />
      ) : Icon ? (
        <Icon className="btn-icon" size={20} />
      ) : null}
      
      <span className="btn-text">{children}</span>
    </button>
  );
};

export default Button;
