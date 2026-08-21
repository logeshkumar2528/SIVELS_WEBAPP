import './Card.css';

const Card = ({ children, className = '', padding = 'normal' }) => {
  return (
    <div className={`card padding-${padding} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
